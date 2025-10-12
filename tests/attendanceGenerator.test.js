import request from 'supertest';
import express from 'express';
import { generateAttendanceRecords } from '../controllers/attendanceGeneratorController.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

jest.mock('../models/User.js');
jest.mock('../models/Attendance.js');

const app = express();
app.use(express.json());
app.post('/api/users/:userId/attendance/generate', generateAttendanceRecords);

describe('POST /api/users/:userId/attendance/generate', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 404 if user is not found', async () => {
    User.findById.mockResolvedValue(null);

    const response = await request(app).post('/api/users/nonexistentuser/attendance/generate');

    expect(User.findById).toHaveBeenCalledWith('nonexistentuser');
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('User not found');
  });

  test('should return 400 if user is missing internship dates', async () => {
    const mockUser = { _id: 'user123', name: 'Test User' };
    User.findById.mockResolvedValue(mockUser);

    const response = await request(app).post('/api/users/user123/attendance/generate');

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Internship start and end dates must be set for the user.');
  });

  test('should return 200 if all attendance records already exist', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'Complete User',
      internship_start: '2025-10-06',
      internship_end: '2025-10-07',
    };
    User.findById.mockResolvedValue(mockUser);

    const existingRecords = [
      { date: '2025-10-06' },
      { date: '2025-10-07' },
    ];
    Attendance.find.mockResolvedValue(existingRecords);

    const response = await request(app).post('/api/users/user123/attendance/generate');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Jadwal absensi sudah lengkap. Tidak ada yang perlu ditambahkan.');
    expect(Attendance.insertMany).not.toHaveBeenCalled();
  });

  test('should insert only the missing weekdays and return 201', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'Incomplete User',
      internship_start: '2025-10-08', // Wednesday
      internship_end: '2025-10-12', // Sunday
    };
    User.findById.mockResolvedValue(mockUser);

    const existingRecords = [
      { date: '2025-10-08' }, // Wednesday exists
    ];
    Attendance.find.mockResolvedValue(existingRecords);
    Attendance.insertMany.mockResolvedValue({});

    const response = await request(app).post('/api/users/user123/attendance/generate');

    expect(Attendance.insertMany).toHaveBeenCalledTimes(1);

    const recordsToInsert = Attendance.insertMany.mock.calls[0][0];
    expect(recordsToInsert).toHaveLength(2);
    expect(recordsToInsert.map((r) => r.date)).toEqual(['2025-10-09', '2025-10-10']);
    expect(recordsToInsert[0]).toHaveProperty('status', 'Tidak Hadir');
    expect(recordsToInsert[0]).toHaveProperty('check_in_time', null);

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe('Berhasil memulihkan 2 jadwal absensi yang hilang.');
  });
});
