import request from 'supertest';
import express from 'express';
import * as userController from '../controllers/userController.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

jest.mock('../models/User.js');
jest.mock('../models/Attendance.js');

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

app.get('/api/users', userController.getAllUsers);
app.get('/api/users/:id', userController.getUserById);
app.post('/api/users', userController.createUser);
app.put('/api/users/:id', userController.updateUser);
app.delete('/api/users/:id', userController.deleteUser);

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

  describe('getUserById', () => {
    test('should return a user if found', async () => {
      const mockUser = { _id: 'someid', name: 'Test User' };
      User.findById.mockResolvedValue(mockUser);
      const response = await request(app).get('/api/users/someid');
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Test User');
    });

    test('should return 404 if user is not found', async () => {
      User.findById.mockResolvedValue(null);
      const response = await request(app).get('/api/users/nonexistentid');
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('createUser', () => {
    test('should return 400 if internship start date is after end date', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test',
          username: 'testuser',
          password: 'password',
          email: 't@t.com',
          internship_start: '2026-02-03',
          internship_end: '2026-01-02',
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Tanggal mulai tidak boleh melebihi tanggal selesai.');
    });

    test('should return 400 if username or email already exists', async () => {
      User.findOne.mockResolvedValue({ username: 'existinguser' });

      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test',
          username: 'existinguser',
          password: 'password',
          email: 't@t.com',
          internship_start: '2026-01-05',
          internship_end: '2026-02-05',
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
          internship_start: '2026-02-03',
          internship_end: '2026-01-02',
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Tanggal mulai tidak boleh melebihi tanggal selesai.');
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
      User.findByIdAndDelete.mockResolvedValue({ _id: 'deletedid', name: 'Deleted User' });
      Attendance.deleteMany.mockResolvedValue({});

      const response = await request(app).delete('/api/users/deletedid');

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('User Deleted User deleted successfully');
    });
  });
});
