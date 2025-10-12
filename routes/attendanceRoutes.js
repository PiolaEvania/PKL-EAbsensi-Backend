import express from 'express';
import {
  markAttendanceById,
  getAttendanceList,
  getAttendanceToday,
  getAttendanceHistory,
  getAttendanceDetail,
  updateAttendance,
  deleteAttendance,
  requestLeave,
  getLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from '../controllers/attendanceController.js';
import { verifyToken, isAdmin, isOwnerOrAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/users/:userId/attendance/:attendanceId', isOwnerOrAdmin, markAttendanceById);
router.get('/users/:userId/attendance', isOwnerOrAdmin, getAttendanceList);
router.get('/users/:userId/attendance/today', isOwnerOrAdmin, getAttendanceToday);
router.get('/users/:userId/attendance/history', isOwnerOrAdmin, getAttendanceHistory);
router.get('/users/:userId/attendance/:attendanceId', isOwnerOrAdmin, getAttendanceDetail);
router.put('/users/:userId/attendance/:attendanceId/request-leave', isOwnerOrAdmin, requestLeave);

router.put('/users/:userId/attendance/:attendanceId', isAdmin, updateAttendance);
router.delete('/users/:userId/attendance/:attendanceId', isAdmin, deleteAttendance);
router.get('/attendance/leave-requests', verifyToken, isAdmin, getLeaveRequests);
router.put('/attendance/:attendanceId/approve-leave', verifyToken, isAdmin, approveLeaveRequest);
router.delete('/attendance/:attendanceId/reject-leave', verifyToken, isAdmin, rejectLeaveRequest);

export default router;
