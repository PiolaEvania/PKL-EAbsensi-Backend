import moment from 'moment-timezone';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { TIMEZONE } from '../config/constants.js';

export const generateAttendanceRecords = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.internship_start || !user.internship_end) {
      return res.status(400).json({ message: 'Internship start and end dates must be set for the user.' });
    }

    const start = moment.tz(user.internship_start, TIMEZONE).startOf('day');
    const end = moment.tz(user.internship_end, TIMEZONE).startOf('day');
    const expectedDates = [];
    for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'days')) {
      if (m.day() !== 0 && m.day() !== 6) {
        expectedDates.push(m.format('YYYY-MM-DD'));
      }
    }

    const existingRecords = await Attendance.find({ user_id: userId }, 'date -_id');
    const existingDates = new Set(existingRecords.map((record) => record.date));

    const missingDates = expectedDates.filter((date) => !existingDates.has(date));

    if (missingDates.length === 0) {
      return res.status(200).json({ message: 'Jadwal absensi sudah lengkap. Tidak ada yang perlu ditambahkan.' });
    }

    const recordsToInsert = missingDates.map((date) => ({
      user_id: userId,
      date,
      status: 'Tidak Hadir',
      notes: null,
      check_in_time: null,
      check_in_latitude: null,
      check_in_longitude: null,
      ip_address: null,
      android_id: null,
      mocked_location: false,
      updated_by: null,
    }));

    await Attendance.insertMany(recordsToInsert);

    res.status(201).json({
      message: `Berhasil memulihkan ${recordsToInsert.length} jadwal absensi yang hilang.`,
      total_added: recordsToInsert.length,
    });
  } catch (error) {
    console.error('Generate attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
