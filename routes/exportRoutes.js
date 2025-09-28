import express from 'express';
import { exportAttendance } from '../controllers/exportController.js';
import { verifyToken, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/users/:userId/export', verifyToken, isAdmin, exportAttendance);

export default router;