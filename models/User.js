import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    match: [/^[a-zA-Z\s]+$/, 'Nama hanya boleh berisi huruf dan spasi'],
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator(value) {
        const containsValidChars = /^[a-z0-9]+$/.test(value);
        const containsLetter = /[a-z]/.test(value);

        return containsValidChars && containsLetter;
      },
      message: 'Username harus berisi kombinasi huruf atau huruf dengan angka, dan tidak boleh hanya angka.',
    },
  },
  password_hash: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    match: [/^[0-9]+$/, 'Nomor telepon hanya boleh berisi angka'],
    maxlength: [13, 'Nomor telepon maksimal 13 digit'],
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  internship_start: {
    type: Date,
  },
  internship_end: {
    type: Date,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

export default mongoose.model('User', userSchema);
