import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import moment from 'moment-timezone';
import { TIMEZONE } from '../config/constants.js';

// GET /api/users?status=[active|finished]
export const getAllUsers = async (req, res) => {
  try {
    const { status } = req.query;
    const today = moment.tz(TIMEZONE).startOf('day').toDate();

    const query = {};

    if (status === 'finished') {
      // Riwayat: Ambil user yang tanggal selesai magangnya sudah lewat
      query.internship_end = { $lt: today };
    } else {
      // Aktif (Default): Ambil user yang tanggal selesainya hari ini atau di masa depan
      query.$or = [
        { internship_end: { $gte: today } },
        { internship_end: null }
      ];
    }
    
    query.role = 'user';

    const users = await User.find(query, '-password_hash').sort({ name: 1 });
    res.json(users);

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password_hash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/users
export const createUser = async (req, res) => {
  const { name, username, password, email, phone, role, internship_start, internship_end } = req.body;

  try {
    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) return res.status(400).json({ message: 'Username or email already exists' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      username,
      password_hash,
      email,
      phone,
      role,
      internship_start,
      internship_end,
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully', userId: newUser._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/users/:id
export const updateUser = async (req, res) => {
  const { password, ...otherData } = req.body;
  let updateData = { ...otherData };

  try {
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};