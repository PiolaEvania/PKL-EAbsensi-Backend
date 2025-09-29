import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import moment from 'moment-timezone';
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
    
    let recordsToInsert = [];

    for (let m = start; m.isSameOrBefore(end); m.add(1, 'days')) {
      if (m.day() !== 0 && m.day() !== 6) {
        recordsToInsert.push({
          user_id: userId,
          date: new Date(m.format()), 
          status: 'Tidak Hadir',
        });
      }
    }

    if (recordsToInsert.length === 0) {
      return res.status(200).json({ message: 'No new attendance records needed for this date range.' });
    }

    await Attendance.deleteMany({ user_id: userId });
    await Attendance.insertMany(recordsToInsert, { ordered: false });

    res.status(201).json({
      message: `Successfully generated/updated attendance records for user ${user.username}.`,
      total_days: recordsToInsert.length,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Attendance records already exist for some or all dates.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};