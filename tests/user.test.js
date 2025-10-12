import request from 'supertest';
import express from 'express';
import userRoutes from '../routes/userRoutes.js';
import User from '../models/User.js';
import * as userController from '../controllers/userController.js';

jest.mock('../models/User.js');
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue(10),
    hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('../middlewares/auth.js', () => ({
  verifyToken: (req, res, next) => next(),
  isAdmin: (req, res, next) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api', userRoutes);

describe('User', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    test('should construct the correct query for finished users', async () => {
      const mockChain = {
        sort: jest.fn().mockResolvedValue([]),
      };
      User.find.mockReturnValue(mockChain);

      await request(app).get('/api/users?status=finished');

      const queryArgument = User.find.mock.calls[0][0];
      expect(queryArgument).toHaveProperty('internship_end');
      expect(queryArgument).not.toHaveProperty('$or');
      expect(queryArgument.role).toBe('user');
    });

    test('should construct the correct query for active users by default', async () => {
      const mockChain = {
        sort: jest.fn().mockResolvedValue([]),
      };
      User.find.mockReturnValue(mockChain);
      
      await request(app).get('/api/users');

      const queryArgument = User.find.mock.calls[0][0];
      expect(queryArgument).toHaveProperty('$or');
      expect(queryArgument.role).toBe('user');
    });
  });

  describe('createUser', () => {
    test('should return 400 if internship start date is after end date', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test', username: 'test', password: '123', email: 't@t.com',
          internship_start: '2025-12-01',
          internship_end: '2025-11-01',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Tanggal mulai magang tidak boleh melebihi tanggal selesai.');
    });

    test('should return 400 if username or email already exists', async () => {
      User.findOne.mockResolvedValue({ username: 'existinguser' });

      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test', username: 'existinguser', password: '123', email: 't@t.com',
          internship_start: '2025-11-01',
          internship_end: '2025-12-01',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Username or email already exists');
    });
  });

  describe('updateUser', () => {
    test('should return 400 on update if internship dates are invalid', async () => {
      const response = await request(app)
        .put('/api/users/someid')
        .send({
          internship_start: '2025-12-01',
          internship_end: '2025-11-01',
        });
        
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Tanggal mulai magang tidak boleh melebihi tanggal selesai.');
    });

    test('should return 404 if user to update is not found', async () => {
      User.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/nonexistentid')
        .send({ name: 'New Name' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('deleteUser', () => {
    test('should return 404 if user to delete is not found', async () => {
        User.findByIdAndDelete.mockResolvedValue(null);

        const response = await request(app).delete('/api/users/nonexistentid');

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    test('should return 200 on successful deletion', async () => {
        User.findByIdAndDelete.mockResolvedValue({ _id: 'deletedid' });

        const response = await request(app).delete('/api/users/deletedid');

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('User deleted successfully');
    });
  });
});