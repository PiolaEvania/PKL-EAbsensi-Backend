// routes/attendanceRoutes.js
import express from 'express';
import {
  markAttendance,
  getAttendanceList,
  getAttendanceHistory,
  getAttendanceDetail,
  updateAttendance,
  deleteAttendance
} from '../controllers/attendanceController.js';
import { verifyToken, isAdmin, isOwnerOrAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/users/:userId/attendance', isOwnerOrAdmin, markAttendance);
router.get('/users/:userId/attendance', isOwnerOrAdmin, getAttendanceList);
router.get('/users/:userId/attendance/history', isOwnerOrAdmin, getAttendanceHistory);

router.get('/users/:userId/attendance/:attendanceId', isOwnerOrAdmin, getAttendanceDetail);

router.put('/users/:userId/attendance/:attendanceId', isAdmin, updateAttendance);
router.delete('/users/:userId/attendance/:attendanceId', isAdmin, deleteAttendance);

export default router;