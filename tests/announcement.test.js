import request from 'supertest';
import express from 'express';
import announcementRoutes from '../routes/announcementRoutes.js';
import Announcement from '../models/Announcement.js';

jest.mock('../models/Announcement.js');

jest.mock('../middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 'admin123', role: 'admin' };
    next();
  },
  isAdmin: (req, res, next) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api', announcementRoutes);

describe('Announcement Controller - White Box Test', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAnnouncement', () => {
    test('should create a new announcement and return 201', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      Announcement.mockImplementation(() => ({
        save: saveMock
      }));

      const newAnnouncement = {
        content: "Test Content",
        start_date: "2025-10-10T10:00:00",
        end_date: "2025-10-11T10:00:00"
      };

      const response = await request(app)
        .post('/api/announcements')
        .send(newAnnouncement);

      expect(saveMock).toHaveBeenCalled();
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('Pengumuman berhasil dibuat.');
    });
  });

  describe('getActiveAnnouncements', () => {
    test('should call Announcement.find with correct date range query', async () => {
      const mockChain = {
        sort: jest.fn().mockResolvedValue([])
      };
      Announcement.find.mockReturnValue(mockChain);

      await request(app).get('/api/announcements/active');

      const queryArgument = Announcement.find.mock.calls[0][0];
      expect(queryArgument).toHaveProperty('start_date');
      expect(queryArgument).toHaveProperty('end_date');
      expect(queryArgument.start_date).toHaveProperty('$lte');
      expect(queryArgument.end_date).toHaveProperty('$gte');
    });
  });

  describe('updateAnnouncement', () => {
    test('should return 404 if announcement to update is not found', async () => {
      Announcement.findByIdAndUpdate.mockResolvedValue(null);
      
      const response = await request(app)
        .put('/api/announcements/nonexistentid')
        .send({ content: 'Updated Content' });
        
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Pengumuman tidak ditemukan.');
    });

    test('should call findByIdAndUpdate with correctly parsed dates', async () => {
      Announcement.findByIdAndUpdate.mockResolvedValue({ _id: 'ann1' });

      const updatePayload = {
        content: "Updated Content",
        start_date: "2025-11-01T00:00:00",
        end_date: "2025-11-02T00:00:00"
      };

      await request(app)
        .put('/api/announcements/ann1')
        .send(updatePayload);

      const updateCall = Announcement.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.content).toBe("Updated Content");
      expect(updateCall.start_date).toBeInstanceOf(Date);
      expect(updateCall.end_date).toBeInstanceOf(Date);
    });
  });

  describe('deleteAnnouncement', () => {
    test('should return 404 if announcement to delete is not found', async () => {
      Announcement.findByIdAndDelete.mockResolvedValue(null);
      
      const response = await request(app).delete('/api/announcements/nonexistentid');

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Pengumuman tidak ditemukan.');
    });

    test('should return 200 on successful deletion', async () => {
      Announcement.findByIdAndDelete.mockResolvedValue({ _id: 'ann1' });

      const response = await request(app).delete('/api/announcements/ann1');

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Pengumuman berhasil dihapus.');
    });
  });

  describe('cleanupExpiredAnnouncements', () => {
    test('should call deleteMany with the correct query', async () => {
      Announcement.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const response = await request(app).post('/api/announcements/cleanup');

      const queryArgument = Announcement.deleteMany.mock.calls[0][0];
      expect(queryArgument).toHaveProperty('end_date');
      expect(queryArgument.end_date).toHaveProperty('$lt');
      expect(response.statusCode).toBe(200);
      expect(response.body.deletedCount).toBe(5);
    });
  });
});