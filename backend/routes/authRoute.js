import express from 'express';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  logoutAllSessions,
  forgotPasswordController,
  resetPasswordController,
} from '../controllers/authControler.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshSession);
router.post('/logout', logoutUser);
router.post('/logout-all', authMiddleware, logoutAllSessions);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);

export default router;

