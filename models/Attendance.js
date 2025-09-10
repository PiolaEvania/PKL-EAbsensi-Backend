import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Hadir', 'Tidak Hadir', 'Di Luar Area', 'Izin', 'Izin Disetujui'],
    default: 'Tidak Hadir',
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  check_in_time: {
    type: Date,
  },
  check_in_latitude: {
    type: Number,
  },
  check_in_longitude: {
    type: Number,
  },
  ip_address: {
    type: String,
  },
  android_id: {
    type: String,
  },
  mocked_location: {
    type: Boolean,
    default: false,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true
});

attendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);