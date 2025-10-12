import request from 'supertest';
import express from 'express';
import exportRoutes from '../routes/exportRoutes.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

jest.mock('../models/User.js');
jest.mock('../models/Attendance.js');

jest.mock('../middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 'admin123', role: 'admin' };
    next();
  },
  isAdmin: (req, res, next) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api', exportRoutes);

const mockUser = {
  _id: 'user123',
  name: 'Budi Santoso',
  phone: '08123456789',
  internship_start: '2025-10-01',
  internship_end: '2025-10-31',
};

const mockAttendance = [
  {
    date: '2025-10-01',
    check_in_time: '2025-10-01T01:30:00.000Z',
    status: 'Hadir',
    notes: '',
  },
  {
    date: '2025-10-02',
    check_in_time: null,
    status: 'Izin',
    notes: 'Sakit',
  },
];

describe('GET /api/users/:userId/export', () => {
  beforeEach(() => {
    User.findById.mockResolvedValue(mockUser);
    Attendance.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockAttendance),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 404 if user is not found', async () => {
    User.findById.mockResolvedValue(null);
    const response = await request(app).get('/api/users/nonexistentuser/export?format=pdf');
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe('User not found');
  });

  test('should return 400 if format is not specified or invalid', async () => {
    const response = await request(app).get('/api/users/user123/export?format=csv');
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe('Invalid format specified');
  });

  test('should generate a PDF file when format=pdf', async () => {
    const response = await request(app).get('/api/users/user123/export?format=pdf');

    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(Attendance.find).toHaveBeenCalledWith({ user_id: 'user123' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('Laporan Absensi - Budi Santoso.pdf');
  });

  test('should generate an XLSX file when format=xlsx', async () => {
    const response = await request(app).get('/api/users/user123/export?format=xlsx');

    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(Attendance.find).toHaveBeenCalledWith({ user_id: 'user123' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toContain('Laporan Absensi - Budi Santoso.xlsx');
  });
});
