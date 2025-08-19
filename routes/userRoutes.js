import express from 'express';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { verifyToken, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get('/users', getAllUsers);
router.post('/users', createUser);

router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;