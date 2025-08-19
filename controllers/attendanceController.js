// controllers/attendanceController.js
import Attendance from '../models/Attendance.js';
import moment from 'moment-timezone';
import { OFFICE_COORDINATES, GEOFENCE_RADIUS_METERS, TIMEZONE } from '../config/constants.js';

const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// POST /api/users/:userId/attendance
export const markAttendance = async (req, res) => {
  const { userId } = req.params;
  const { latitude, longitude, android_id, mocked_location } = req.body;

  try {
    const todayWITA = moment.tz(TIMEZONE);
    const todayStart = todayWITA.startOf('day').toDate();

    const attendanceRecord = await Attendance.findOne({
      user_id: userId,
      date: todayStart,
    });

    if (!attendanceRecord) {
      return res.status(404).json({ message: 'Jadwal absensi untuk hari ini tidak ditemukan. Hubungi admin.' });
    }

    if (attendanceRecord.status !== 'Tidak Hadir') {
      return res.status(400).json({ message: 'Anda sudah melakukan absensi hari ini.' });
    }
    
    if (mocked_location) {
        attendanceRecord.status = 'Di Luar Area';
        attendanceRecord.mocked_location = true;
        await attendanceRecord.save();
        return res.status(403).json({ message: 'Terdeteksi menggunakan lokasi palsu. Absensi ditolak.'});
    }

    const distance = getDistanceFromLatLonInMeters(
      latitude, longitude,
      OFFICE_COORDINATES.latitude, OFFICE_COORDINATES.longitude
    );

    const status = distance <= GEOFENCE_RADIUS_METERS ? 'Hadir' : 'Di Luar Area';

    attendanceRecord.status = status;
    attendanceRecord.check_in_time = new Date();
    attendanceRecord.check_in_latitude = latitude;
    attendanceRecord.check_in_longitude = longitude;
    attendanceRecord.ip_address = req.ip;
    attendanceRecord.android_id = android_id;
    attendanceRecord.mocked_location = mocked_location || false;

    await attendanceRecord.save();
    res.status(200).json({ message: `Absensi berhasil: ${status}`, data: attendanceRecord });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/:userId/attendance
export const getAttendanceList = async (req, res) => {
  const { userId } = req.params;
  const today = moment.tz(TIMEZONE).endOf('day').toDate();
  
  try {
    const records = await Attendance.find({ user_id: userId, date: { $lte: today } }).sort({ date: 'desc' });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/:userId/attendance/history
export const getAttendanceHistory = async (req, res) => {
  const { userId } = req.params;
  try {
    const records = await Attendance.find({ user_id: userId }).sort({ date: 'desc' });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/:userId/attendance/:attendanceId
export const getAttendanceDetail = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.attendanceId);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    
    if (record.user_id.toString() !== req.params.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden. This attendance record does not belong to the specified user.' });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/users/:userId/attendance/:attendanceId
export const updateAttendance = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updated_by: req.user.id,
    };
    
    const updatedRecord = await Attendance.findByIdAndUpdate(
      req.params.attendanceId,
      updateData,
      { new: true }
    );

    if (!updatedRecord) return res.status(404).json({ message: 'Attendance record not found' });
    res.json({ message: 'Attendance updated successfully', data: updatedRecord });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/:userId/attendance/:attendanceId
export const deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.attendanceId);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    res.json({ message: 'Attendance record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};