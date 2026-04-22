import express from 'express';
import { 
    showRegister, 
    showLogin, 
    showVerifyOTPRegistration,
    showVerifyOTPForgot,
    showForgotPassword,
    showResetPassword,
    registerUser,
    verifyOTPRegistrationController,
    verifyOTPForgotController,
    resendOTPRegistrationController,
    resendOTPForgotController,
    loginUser,
    logoutUser,
    forgotPasswordController,
    resetPasswordController,
    googleAuth,
    googleCallback
} from '../controllers/user/authController.js';

import {
    showHome,
    showProfile,
    showEditProfile,
    showLanding
} from '../controllers/pageController.js';

import { syncUserSession, isAuthenticated, isNotAuthenticated } from '../middlewares/sessionAuth.js';

const router = express.Router();

// Apply session sync middleware to all routes
router.use(syncUserSession);

// Page routes
router.get('/', showLanding);
router.get('/home', isAuthenticated, showHome);
router.get('/profile', isAuthenticated, showProfile);
router.get('/edit-profile', isAuthenticated, showEditProfile);

// Authentication routes
router.get('/register', isNotAuthenticated, showRegister);
router.post('/register', registerUser);
router.get('/login', isNotAuthenticated, showLogin);
router.post('/login', loginUser);
router.get('/logout', logoutUser);
router.get('/verify-otp-registration', showVerifyOTPRegistration);
router.post('/verify-otp-registration', verifyOTPRegistrationController);
router.post('/resend-otp-registration', resendOTPRegistrationController);
router.get('/verify-otp-forgot', showVerifyOTPForgot);
router.post('/verify-otp-forgot', verifyOTPForgotController);
router.post('/resend-otp-forgot', resendOTPForgotController);
router.get('/forgot-password', showForgotPassword);
router.post('/forgot-password', forgotPasswordController);
router.get('/reset-password', showResetPassword);
router.post('/reset-password', resetPasswordController);

// Google OAuth routes
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleCallback);

export default router;