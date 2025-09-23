import express from 'express';
import { 
    createAnnouncement, 
    getActiveAnnouncements,
    updateAnnouncement,
    deleteAnnouncement
} from '../controllers/announcementController.js';
import { verifyToken, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/announcements/active', verifyToken, getActiveAnnouncements);

router.post('/announcements', verifyToken, isAdmin, createAnnouncement);
router.put('/announcements/:announcementId', verifyToken, isAdmin, updateAnnouncement); 
router.delete('/announcements/:announcementId', verifyToken, isAdmin, deleteAnnouncement);

export default router;