import request from 'supertest';
import express from 'express';
import attendanceRoutes from '../routes/attendanceRoutes.js';
import Attendance from '../models/Attendance.js';
import moment from 'moment-timezone';
import { TIMEZONE } from '../config/constants.js';

jest.mock('../models/Attendance.js');

const mockUser = { id: 'user123', role: 'user' };
const mockAdmin = { id: 'admin456', role: 'admin' };

jest.mock('../middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => {
    req.user = req.headers.authorization === 'Bearer admin-token' ? mockAdmin : mockUser;
    next();
  },
  isAdmin: (req, res, next) => {
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  },
  isOwnerOrAdmin: (req, res, next) => {
      if (req.user.role === 'admin' || req.user.id === req.params.userId) {
          next();
      } else {
          res.status(403).json({ message: 'Forbidden' });
      }
  }
}));

const app = express();
app.use(express.json());
app.use('/api', attendanceRoutes);

describe('Attendance', () => {
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markAttendanceById', () => {
    
    test('should return 400 if attendance is for the wrong day', async () => {
      const mockRecord = {
        _id: 'att1', user_id: 'user123', date: '2025-01-01', status: 'Tidak Hadir',
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
        _id: 'att1', user_id: 'user123', date: moment.tz(TIMEZONE).format('YYYY-MM-DD'), status: 'Hadir',
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
        _id: 'att1', user_id: 'user123', date: moment.tz(TIMEZONE).format('YYYY-MM-DD'), status: 'Tidak Hadir', save: saveMock
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
          _id: 'att1', user_id: 'user123', date: moment.tz(TIMEZONE).format('YYYY-MM-DD'), status: 'Tidak Hadir', save: saveMock
        };
        Attendance.findById.mockResolvedValue(mockRecord);
  
        await request(app)
          .post('/api/users/user123/attendance/att1')
          .set('Authorization', 'Bearer user-token')
          .send({ latitude: -3.3089332, longitude: 114.613662 });
  
        expect(saveMock).toHaveBeenCalled();
        expect(mockRecord.status).toBe('Hadir');
      });
  });
  
  describe('getAttendanceToday', () => {
    test('should return 404 if no record is found for today', async () => {
      Attendance.findOne.mockResolvedValue(null);
      const response = await request(app).get('/api/users/user123/attendance/today').set('Authorization', 'Bearer user-token');
      expect(response.statusCode).toBe(404);
    });

    test('should return the record if found for today', async () => {
      const mockRecord = { date: moment.tz(TIMEZONE).format('YYYY-MM-DD') };
      Attendance.findOne.mockResolvedValue(mockRecord);
      const response = await request(app).get('/api/users/user123/attendance/today').set('Authorization', 'Bearer user-token');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('approveLeaveRequest', () => {
    test('should update status and notes correctly', async () => {
      const mockRecord = { _id: 'att1', notes: 'Sakit' };
      Attendance.findById.mockResolvedValue(mockRecord);
      Attendance.findByIdAndUpdate.mockResolvedValue({});

      await request(app)
        .put('/api/attendance/att1/approve-leave')
        .set('Authorization', 'Bearer admin-token');

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
  
      await request(app)
        .delete('/api/attendance/att1/reject-leave')
        .set('Authorization', 'Bearer admin-token');
  
      const updateCall = Attendance.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.status).toBe('Tidak Hadir');
      expect(updateCall.notes).toContain('Ditolak oleh admin');
    });
  });

});