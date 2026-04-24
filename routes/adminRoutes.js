import express from 'express';
import { getUsers, toggleUserStatus } from '../controllers/admin/adminController.js';
import { 
    adminLogin, 
    adminLogout, 
    adminForgotPassword, 
    adminVerifyOTPForgot, 
    adminResetPassword, 
    adminResendOTPForgot 
} from '../controllers/admin/adminController.js'
import { getLatestOTPCreationTime } from '../service/otpService.js';
import { isAdmin, isNotAuthenticatedAdmin } from '../middlewares/adminAuth.js';
import { preventCache } from '../middlewares/sessionAuth.js';
import User from '../models/User.js';

const router = express.Router();

// Admin session check endpoint
router.get('/api/session-check', async (req, res) => {
    if (req.session.userId && req.session.user && req.session.user.isAdmin) {
        try {
            // Import User model
            const { default: User } = await import('../models/User.js');
            const user = await User.findById(req.session.userId);
            
            if (!user || user.isBlocked || !user.isAdmin) {
                // Admin is blocked, no longer admin, or doesn't exist
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error:', err);
                    }
                    res.clearCookie('horologue.sid');
                    res.clearCookie('connect.sid');
                    res.status(401).json({ authenticated: false, reason: 'admin_access_revoked' });
                });
                return;
            }
            
            res.json({ authenticated: true });
        } catch (error) {
            console.error('Admin session check error:', error);
            res.status(401).json({ authenticated: false, reason: 'validation_error' });
        }
    } else {
        res.status(401).json({ authenticated: false, reason: 'no_admin_session' });
    }
});

// Admin login page (GET) - prevent access if already logged in
router.get('/login', isNotAuthenticatedAdmin, (req, res) => {
    let error = null;
    
    // Handle admin-specific errors
    if (req.query.error === 'access_revoked') {
        error = 'Your admin access has been revoked. Please contact the system administrator.';
    } else if (req.query.error === 'validation_error') {
        error = 'Session validation failed. Please try logging in again.';
    }
    
    res.render('admin/login', { error, success: null });
});

// Admin login POST route
router.post('/login', adminLogin)

// Admin forgot password page - prevent access if already logged in
router.get('/forgot-password', isNotAuthenticatedAdmin, (req, res) => {
    res.render('admin/forgot-password', { error: null, success: null })
});

// Admin forgot password POST
router.post('/forgot-password', adminForgotPassword)

// Admin verify OTP page - prevent access if already logged in
router.get('/verify-otp-forgot', isNotAuthenticatedAdmin, async (req, res) => {
    const email = req.session.resetEmail || '';
    const otpCreatedAt = email ? await getLatestOTPCreationTime(email, 'admin-forgot-password') : null;
    
    res.render('admin/verify-otp-forgot', { 
        error: null, 
        success: null,
        email,
        otpCreatedAt,
        resendTimerStart: req.session.adminResetResendTimerStart
    })
})

// Admin verify OTP POST route
router.post('/verify-otp-forgot', adminVerifyOTPForgot);

// Admin reset password page - prevent access if already logged in
router.get('/reset-password', isNotAuthenticatedAdmin, (req, res) => {
    res.render('admin/reset-password', { 
        error: null, 
        success: null,
        email: req.session.resetEmail || ''
    })
})

// Admin reset password 
router.post('/reset-password', adminResetPassword);
router.post('/resend-otp-forgot', adminResendOTPForgot);

// Admin dashboard - protected route
router.get('/dashboard', isAdmin, (req, res) => {
    res.render('admin/dashboard', { 
        admin: req.session.user,
        currentPage: 'dashboard'
    })
})

// Admin users page - protected route
router.get('/users', isAdmin, getUsers);

// Admin logout
router.get('/logout', adminLogout);

// Toggle user status - protected route
router.post('/users/toggle-status/:userId', isAdmin, toggleUserStatus);

export default router;
