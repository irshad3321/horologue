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
    updateProfile,
    sendEmailChangeOTP,
    verifyEmailChangeOTP,
    resendEmailChangeOTP,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    sendChangePasswordOTP,
    verifyChangePasswordOTP,
    resendChangePasswordOTP
} from '../controllers/user/profileController.js';

import {
    getAddresses,
    addAddress,
    editAddress,
    removeAddress,
    setDefault
} from '../controllers/user/addressController.js';

import {
    showHome,
    showProfile,
    showEditProfile,
    showLanding,
    showAddresses,
    showChangePassword
} from '../controllers/pageController.js';

import {
    showProducts,
    showProductDetail,
    showWishlist,
    showCart
} from '../controllers/user/productController.js';

import { syncUserSession, isAuthenticated, isNotAuthenticated, preventCache, redirectAuthenticatedUsers, userSessionCheck } from '../middlewares/sessionAuth.js';
import upload, { handleMulterError } from '../config/multer.js';

const router = express.Router();

// Apply session sync middleware to all routes
router.use(syncUserSession);

// Page routes
router.get('/', redirectAuthenticatedUsers, showLanding);
router.get('/home', isAuthenticated, showHome);
router.get('/products', showProducts);
router.get('/collection', showProducts);
router.get('/product/:id', showProductDetail);
router.get('/wishlist', showWishlist);
router.get('/cart', showCart);
router.get('/profile', isAuthenticated, showProfile);
router.get('/edit-profile', isAuthenticated, showEditProfile);
router.get('/addresses', isAuthenticated, showAddresses);
router.get('/password', isAuthenticated, showChangePassword);

// Authentication routes
router.get('/register', isNotAuthenticated,showRegister);
router.post('/register', registerUser);
router.get('/login', isNotAuthenticated,showLogin);
router.post('/login', loginUser)
router.get('/logout', logoutUser)
router.get('/verify-otp-registration',showVerifyOTPRegistration)
router.post('/verify-otp-registration',verifyOTPRegistrationController)
router.post('/resend-otp-registration',resendOTPRegistrationController)
router.get('/verify-otp-forgot',showVerifyOTPForgot)
router.post('/verify-otp-forgot',verifyOTPForgotController)
router.post('/resend-otp-forgot',resendOTPForgotController)
router.get('/forgot-password', showForgotPassword)
router.post('/forgot-password',forgotPasswordController)
router.get('/reset-password',showResetPassword)
router.post('/reset-password',resetPasswordController)
router.post('/update-profile',isAuthenticated, updateProfile)
router.post('/send-email-change-otp',isAuthenticated, sendEmailChangeOTP)
router.post('/verify-email-change-otp',isAuthenticated, verifyEmailChangeOTP)
router.post('/resend-email-change-otp',isAuthenticated, resendEmailChangeOTP)

// Avatar routes
router.post('/upload-avatar', isAuthenticated, upload.single('avatar'), uploadAvatar);
router.delete('/delete-avatar', isAuthenticated, deleteAvatar);

// Change password routes
router.post('/change-password', isAuthenticated, changePassword);
router.post('/send-change-password-otp', isAuthenticated, sendChangePasswordOTP);
router.post('/verify-change-password-otp', isAuthenticated, verifyChangePasswordOTP);
router.post('/resend-change-password-otp', isAuthenticated, resendChangePasswordOTP);

// Address routes
router.get('/api/addresses', isAuthenticated, getAddresses);
router.post('/api/addresses', isAuthenticated, addAddress);
router.put('/api/addresses/:id', isAuthenticated, editAddress);
router.delete('/api/addresses/:id', isAuthenticated, removeAddress);
router.patch('/api/addresses/:id/default', isAuthenticated, setDefault);

// Google OAuth routes
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleCallback);


router.get('/api/session-check', userSessionCheck);


export default router;