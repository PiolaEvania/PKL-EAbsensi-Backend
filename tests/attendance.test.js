import request from 'supertest';
import express from 'express';
import moment from 'moment-timezone';
import * as attendanceController from '../controllers/attendanceController.js';
import Attendance from '../models/Attendance.js';
import { TIMEZONE } from '../config/constants.js';

jest.mock('../models/Attendance.js');

const mockUser = { id: 'user123', role: 'user' };
const mockAdmin = { id: 'admin456', role: 'admin' };

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === 'Bearer admin-token') {
    req.user = mockAdmin;
  } else {
    req.user = mockUser;
  }
  next();
});

app.post('/api/users/:userId/attendance/:attendanceId', attendanceController.markAttendanceById);
app.get('/api/users/:userId/attendance/today', attendanceController.getAttendanceToday);
app.put('/api/users/:userId/attendance/:attendanceId', attendanceController.updateAttendance);
app.delete('/api/users/:userId/attendance/:attendanceId', attendanceController.deleteAttendance);
app.put('/api/attendance/:attendanceId/approve-leave', attendanceController.approveLeaveRequest);
app.put('/api/attendance/:attendanceId/reject-leave', attendanceController.rejectLeaveRequest);

describe('Attendance Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markAttendanceById', () => {
    test('should return 400 if attendance is for the wrong day', async () => {
      const mockRecord = {
        _id: 'att1',
        user_id: 'user123',
        date: '2020-01-01',
        status: 'Tidak Hadir',
      };
      Attendance.findById.mockResolvedValue(mockRecord);

      const response = await request(app)
        .post('/api/users/user123/attendance/att1')
        .set('Authorization', 'Bearer user-token')
        .send({ latitude: 0, longitude: 0 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Anda hanya bisa melakukan absensi untuk jadwal hari ini.');
    });

    test('should return 400 if attendance status is not "Tidak Hadir"', async () => {
      const mockRecord = {
        _id: 'att1',
        user_id: 'user123',
        date: moment.tz(TIMEZONE).format('YYYY-MM-DD'),
        status: 'Hadir',
      };
      Attendance.findById.mockResolvedValue(mockRecord);

      const response = await request(app)
        .post('/api/users/user123/attendance/att1')
        .set('Authorization', 'Bearer user-token')
        .send({ latitude: 0, longitude: 0 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Anda sudah melakukan absensi hari ini.');
    });

    test('should return 403 and set status to "Di Luar Area" if mocked_location is true', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      const mockRecord = {
        _id: 'att1',
        user_id: 'user123',
        date: moment.tz(TIMEZONE).format('YYYY-MM-DD'),
        status: 'Tidak Hadir',
        save: saveMock,
      };
      Attendance.findById.mockResolvedValue(mockRecord);

      const response = await request(app)
        .post('/api/users/user123/attendance/att1')
        .set('Authorization', 'Bearer user-token')
        .send({ latitude: 0, longitude: 0, mocked_location: true });

      expect(saveMock).toHaveBeenCalled();
      expect(mockRecord.status).toBe('Di Luar Area');
      expect(response.statusCode).toBe(403);
    });

    test('should set status to "Hadir" if within geofence radius', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      const mockRecord = {
        _id: 'att1',
        user_id: 'user123',
        date: moment.tz(TIMEZONE).format('YYYY-MM-DD'),
        status: 'Tidak Hadir',
        save: saveMock,
      };
      Attendance.findById.mockResolvedValue(mockRecord);

      const response = await request(app)
        .post('/api/users/user123/attendance/att1')
        .set('Authorization', 'Bearer user-token')
        .send({ latitude: -3.3089332, longitude: 114.613662 });

      expect(saveMock).toHaveBeenCalled();
      expect(mockRecord.status).toBe('Hadir');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('getAttendanceToday', () => {
    test('should return 404 if no record is found for today', async () => {
      Attendance.findOne.mockResolvedValue(null);
      const response = await request(app)
        .get('/api/users/user123/attendance/today')
        .set('Authorization', 'Bearer user-token');
      expect(response.statusCode).toBe(404);
    });

    test('should return the record if found for today', async () => {
      const mockRecord = { date: moment.tz(TIMEZONE).format('YYYY-MM-DD') };
      Attendance.findOne.mockResolvedValue(mockRecord);
      const response = await request(app)
        .get('/api/users/user123/attendance/today')
        .set('Authorization', 'Bearer user-token');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('updateAttendance', () => {
    test('should update an attendance record successfully', async () => {
      const mockUpdatedRecord = {
        _id: 'att1',
        status: 'Hadir',
        notes: 'Updated note',
      };
      Attendance.findByIdAndUpdate.mockResolvedValue(mockUpdatedRecord);

      const response = await request(app)
        .put('/api/users/user123/attendance/att1')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'Hadir', notes: 'Updated note' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Attendance updated successfully');
      expect(response.body.data.status).toBe('Hadir');
    });

    test('should return 404 if attendance record to update is not found', async () => {
      Attendance.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/user123/attendance/nonexistent-id')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'Hadir' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Attendance record not found');
    });
  });

  describe('approveLeaveRequest', () => {
    test('should update status and notes correctly', async () => {
      const mockRecord = { _id: 'att1', notes: 'Sakit' };
      Attendance.findById.mockResolvedValue(mockRecord);
      Attendance.findByIdAndUpdate.mockResolvedValue({
        _id: 'att1',
        status: 'Izin Disetujui',
        notes: 'Disetujui: Sakit',
      });

      const response = await request(app)
        .put('/api/attendance/att1/approve-leave')
        .set('Authorization', 'Bearer admin-token');

      expect(response.statusCode).toBe(200);
      const updateCall = Attendance.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.status).toBe('Izin Disetujui');
      expect(updateCall.notes).toBe('Disetujui: Sakit');
    });
  });

  describe('rejectLeaveRequest', () => {
    test('should update status and notes correctly', async () => {
      const mockRecord = { _id: 'att1', notes: 'Keperluan keluarga' };
      Attendance.findById.mockResolvedValue(mockRecord);
      Attendance.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .put('/api/attendance/att1/reject-leave')
        .set('Authorization', 'Bearer admin-token');

      expect(response.statusCode).toBe(200);
      const updateCall = Attendance.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.status).toBe('Tidak Hadir');
      expect(updateCall.notes).toContain('Ditolak oleh admin');
    });
  });

  describe('deleteAttendance', () => {
    test('should return 404 if attendance record to delete is not found', async () => {
      Attendance.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/users/user123/attendance/nonexistent-att-id')
        .set('Authorization', 'Bearer admin-token');

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Attendance record not found');
    });

    test('should return 200 on successful deletion', async () => {
      Attendance.findByIdAndDelete.mockResolvedValue({ _id: 'att1' });

      const response = await request(app)
        .delete('/api/users/user123/attendance/att1')
        .set('Authorization', 'Bearer admin-token');

      expect(Attendance.findByIdAndDelete).toHaveBeenCalledWith('att1');
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Attendance record deleted');
    });
  });
});
