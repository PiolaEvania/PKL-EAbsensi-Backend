import bcrypt from 'bcryptjs';
import moment from 'moment-timezone';
import User from '../models/User.js';
import { TIMEZONE } from '../config/constants.js';

// GET /api/users?status=[active|finished]
export const getAllUsers = async (req, res) => {
  try {
    const { status } = req.query;
    const today = moment.tz(TIMEZONE).startOf('day').toDate();

    const query = {};

    if (status === 'finished') {
      query.internship_end = { $lt: today };
    } else {
      query.$or = [
        { internship_end: { $gte: today } },
        { internship_end: null },
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
  const {
    name, username, password, email, phone, role, internship_start, internship_end,
  } = req.body;

  try {
    if (!password || password.length < 6 || password.length > 10) {
      return res.status(400).json({ message: 'Password harus memiliki 6 hingga 10 karakter.' });
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return res.status(400).json({ message: 'Nama hanya boleh berisi huruf dan spasi.' });
    }

    if (!/^[a-z]+$/.test(username)) {
      return res.status(400).json({ message: 'Username hanya boleh berisi huruf kecil tanpa spasi atau angka.' });
    }

    if (phone) {
      if (!/^[0-9]+$/.test(phone)) {
        return res.status(400).json({ message: 'Nomor telepon hanya boleh berisi angka.' });
      }
      if (phone.length > 13) {
        return res.status(400).json({ message: 'Nomor telepon maksimal 13 digit.' });
      }
    }

    if (internship_start && internship_end && moment(internship_start).isAfter(internship_end)) {
      return res.status(400).json({ message: 'Tanggal mulai magang tidak boleh melebihi tanggal selesai.' });
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });
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
  const {
    password, name, username, phone, ...otherData
  } = req.body;
  const updateData = { ...otherData };

  try {
    if (name && !/^[a-zA-Z\s]+$/.test(name)) {
      return res.status(400).json({ message: 'Nama hanya boleh berisi huruf dan spasi.' });
    }

    if (username && !/^[a-z]+$/.test(username)) {
      return res.status(400).json({ message: 'Username hanya boleh berisi huruf kecil tanpa spasi atau angka.' });
    }

    if (phone) {
      if (!/^[0-9]+$/.test(phone)) {
        return res.status(400).json({ message: 'Nomor telepon hanya boleh berisi angka.' });
      }
      if (phone.length > 13) {
        return res.status(400).json({ message: 'Nomor telepon maksimal 13 digit.' });
      }
    }

    if (password && (password.length < 6 || password.length > 10)) {
      return res.status(400).json({ message: 'Password harus memiliki 6 hingga 10 karakter.' });
    }

    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (phone) updateData.phone = phone;

    const { internship_start, internship_end } = updateData;
    if (internship_start && internship_end && moment(internship_start).isAfter(internship_end)) {
      return res.status(400).json({ message: 'Tanggal mulai magang tidak boleh melebihi tanggal selesai.' });
    }

    if (password && password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    } else {
      delete updateData.password;
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
