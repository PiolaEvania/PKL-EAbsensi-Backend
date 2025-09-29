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

// POST /api/users/:userId/attendance/:attendanceId
export const markAttendanceById = async (req, res) => {
  const { attendanceId } = req.params;
  const { latitude, longitude, android_id} = req.body;

  try {
    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
      return res.status(404).json({ message: 'Data absensi tidak ditemukan.' });
    }

    if (attendanceRecord.user_id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Anda tidak memiliki izin untuk mengubah absensi ini.' });
    }

    const today = moment.tz(TIMEZONE).startOf('day');
    const recordDate = moment(attendanceRecord.date).tz(TIMEZONE).startOf('day');
    if (!today.isSame(recordDate)) {
        return res.status(400).json({ message: 'Anda hanya bisa melakukan absensi untuk jadwal hari ini.' });
    }
    
    if (attendanceRecord.status !== 'Tidak Hadir') {
      return res.status(400).json({ message: 'Anda sudah melakukan absensi hari ini.' });
    }

    if (req.body.mocked_location === true) {
      attendanceRecord.status = 'Di Luar Area';
      attendanceRecord.mocked_location = true;
      await attendanceRecord.save();
      return res.status(403).json({ message: 'Terdeteksi menggunakan lokasi palsu. Absensi ditolak.' });
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
    attendanceRecord.mocked_location = false;

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

// GET /api/users/:userId/attendance/today
export const getAttendanceToday = async (req, res) => {
  const { userId } = req.params;

  try {
    const todayStart = moment.tz(TIMEZONE).startOf('day');
    const todayEnd = moment.tz(TIMEZONE).endOf('day');

    const record = await Attendance.findOne({
      user_id: userId,
      date: { $gte: todayStart.toDate(), $lte: todayEnd.toDate() },
    });

    if (!record) {
      return res.status(404).json({ message: 'Jadwal absensi untuk hari ini tidak ditemukan.' });
    }

    res.status(200).json(record);

  } catch (error) {
    console.error(error);
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

export const requestLeave = async (req, res) => {
  const { attendanceId } = req.params;
  const { notes } = req.body;

  if (!notes) {
    return res.status(400).json({ message: 'Keterangan izin wajib diisi.' });
  }

  try {
    const attendanceRecord = await Attendance.findById(attendanceId);
    if (!attendanceRecord) {
      return res.status(404).json({ message: 'Data absensi tidak ditemukan.' });
    }
    if (attendanceRecord.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Anda tidak berhak mengubah absensi ini.' });
    }
    if (attendanceRecord.status !== 'Tidak Hadir') {
        return res.status(400).json({ message: `Tidak bisa mengajukan izin karena status absensi saat ini adalah '${attendanceRecord.status}'.` });
    }

    attendanceRecord.status = 'Izin';
    attendanceRecord.notes = notes;
    await attendanceRecord.save();
    res.status(200).json({ message: 'Pengajuan izin berhasil terkirim.', data: attendanceRecord });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await Attendance.find({ status: 'Izin' })
    .populate('user_id', 'name username')
    .sort({ date: 1 }); 
    res.status(200).json(leaveRequests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const approveLeaveRequest = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const updatedRecord = await Attendance.findByIdAndUpdate( attendanceId,
      { 
        status: 'Izin Disetujui',updated_by: req.user.id
      },
      { new: true }
    );
    if (!updatedRecord) return res.status(404).json({ message: 'Catatan izin tidak ditemukan.' });
      res.status(200).json({ message: 'Izin berhasil disetujui.', data: updatedRecord });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const rejectLeaveRequest = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const updatedRecord = await Attendance.findByIdAndUpdate( attendanceId,
      { 
        status: 'Tidak Hadir',
        notes: `Ditolak oleh admin pada ${new Date().toLocaleString('id-ID')}`,
        updated_by: req.user.id
      },
      { new: true }
    );
    if (!updatedRecord) return res.status(404).json({ message: 'Catatan izin tidak ditemukan.' });
      res.status(200).json({ message: 'Pengajuan izin telah ditolak.', data: updatedRecord });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};