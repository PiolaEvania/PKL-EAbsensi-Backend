import express from 'express';
import { generateAttendanceRecords } from '../controllers/attendanceGeneratorController.js';
import { verifyToken, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.post('/users/:userId/attendance/generate', verifyToken, isAdmin, generateAttendanceRecords);

export default router;
