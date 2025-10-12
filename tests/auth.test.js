import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { login } from '../controllers/authController.js';
import User from '../models/User.js';

jest.mock('../models/User.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.post('/api/login', login);

describe('POST /api/login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 if username is missing', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ password: 'password123' });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Username and password are required');
  });

  test('should return 404 if user is not found in the database', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/login')
      .send({ username: 'unknownuser', password: 'password123' });

    expect(User.findOne).toHaveBeenCalledWith({ username: 'unknownuser' });
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('User not found');
  });

  test('should return 400 if password does not match', async () => {
    const mockUser = {
      _id: '1',
      name: 'Test User',
      username: 'testuser',
      password_hash: 'hashed_password',
      role: 'user',
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed_password');
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Invalid credentials');
  });

  test('should return a token and user payload on successful login', async () => {
    const mockUser = {
      _id: '1',
      name: 'Test User',
      username: 'testuser',
      password_hash: 'hashed_password',
      role: 'user',
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('fake-jwt-token');

    const response = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'correctpassword' });

    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: '1', name: 'Test User', username: 'testuser', role: 'user',
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
    );
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.token).toBe('fake-jwt-token');
    expect(response.body.user.name).toBe('Test User');
  });
});
