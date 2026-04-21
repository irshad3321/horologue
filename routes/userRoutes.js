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
    resetPasswordController
} from '../controllers/user/authController.js';

import {
    showHome,
    showProfile,
    showEditProfile,
    showLanding
} from '../controllers/pageController.js';

const router = express.Router();

// Page routes
router.get('/', showLanding);
router.get('/home', showHome);
router.get('/profile', showProfile);
router.get('/edit-profile', showEditProfile);

// Authentication routes
router.get('/register', showRegister);
router.post('/register', registerUser);
router.get('/login', showLogin);
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

export default router;