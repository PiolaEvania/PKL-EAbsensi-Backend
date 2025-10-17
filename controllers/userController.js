import bcrypt from 'bcryptjs';
import moment from 'moment-timezone';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
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

    if (!/^[a-z0-9]+$/.test(username)) {
      return res.status(400).json({ message: 'Username hanya boleh berisi perpaduan huruf kecil dan angka, tanpa spasi.' });
    }

    if (phone) {
      if (!/^[0-9]+$/.test(phone)) {
        return res.status(400).json({ message: 'Nomor telepon hanya boleh berisi angka.' });
      }
      if (phone.length > 13) {
        return res.status(400).json({ message: 'Nomor telepon maksimal 13 digit.' });
      }
    }

    if (internship_start && internship_end) {
      const start = moment(internship_start);
      const end = moment(internship_end);

      if (start.isAfter(end)) {
        return res.status(400).json({ message: 'Tanggal mulai tidak boleh melebihi tanggal selesai.' });
      }

      const maxEndDate = start.clone().add(6, 'months');
      if (end.isAfter(maxEndDate)) {
        return res.status(400).json({ message: 'Durasi magang tidak boleh lebih dari 6 bulan.' });
      }
    }

    const today = moment.tz(TIMEZONE).startOf('day');
    if (internship_start && moment(internship_start).isBefore(today)) {
      return res.status(400).json({ message: 'Tanggal mulai magang tidak boleh tanggal yang sudah lewat.' });
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
  const { id } = req.params;
  const {
    password, name, username, email, phone, ...otherData
  } = req.body;
  const updateData = { ...otherData };

  try {
    if (name && !/^[a-zA-Z\s]+$/.test(name)) {
      return res.status(400).json({ message: 'Nama hanya boleh berisi huruf dan spasi.' });
    }

    if (username && !/^[a-z0-9]+$/.test(username)) {
      return res.status(400).json({ message: 'Username hanya boleh berisi perpaduan huruf kecil dan angka, tanpa spasi.' });
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

    if (updateData.internship_start && updateData.internship_end) {
      const start = moment(updateData.internship_start);
      const end = moment(updateData.internship_end);

      if (start.isAfter(end)) {
        return res.status(400).json({ message: 'Tanggal mulai tidak boleh melebihi tanggal selesai.' });
      }

      const maxEndDate = start.clone().add(6, 'months');
      if (end.isAfter(maxEndDate)) {
        return res.status(400).json({ message: 'Durasi magang tidak boleh lebih dari 6 bulan.' });
      }
    }

    if (username || email) {
      const query = { $or: [] };
      if (username) query.$or.push({ username });
      if (email) query.$or.push({ email });

      const existingUser = await User.findOne({ ...query, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username atau email sudah digunakan oleh peserta lain.' });
      }
    }

    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    if (password && password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    } else {
      delete updateData.password;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (updateData.internship_end) {
      const newEndDate = moment.tz(updateData.internship_end, TIMEZONE).format('YYYY-MM-DD');
      await Attendance.deleteMany({ user_id: id, date: { $gt: newEndDate } });
    }
    if (updateData.internship_start) {
      const newStartDate = moment.tz(updateData.internship_start, TIMEZONE).format('YYYY-MM-DD');
      await Attendance.deleteMany({ user_id: id, date: { $lt: newStartDate } });
    }

    res.json({ message: 'Data peserta berhasil diperbarui.' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    await Attendance.deleteMany({ user_id: req.params.id });

    res.json({ message: `User ${user.name} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
