import express from 'express';
import { createAnnouncement, getActiveAnnouncements } from '../controllers/announcementController.js';
import { verifyToken, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.post('/announcements', verifyToken, isAdmin, createAnnouncement);
router.get('/announcements/active', verifyToken, getActiveAnnouncements);

export default router;