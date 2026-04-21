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

const router = express.Router();

// Simple middleware to check admin (inline)
const isAdmin = (req, res, next) => {
    if (!req.session.userId || !req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/admin/login');
    }
    next();
};

// Admin login page (GET)
router.get('/login', (req, res) => {
    res.render('admin/login', { error: null, success: null });
});

// Admin login POST route
router.post('/login', adminLogin)

// Admin forgot password page
router.get('/forgot-password', (req, res) => {
    res.render('admin/forgot-password', { error: null, success: null })
});

// Admin forgot password POST
router.post('/forgot-password', adminForgotPassword)

// Admin verify OTP page
router.get('/verify-otp-forgot', (req, res) => {
    res.render('admin/verify-otp-forgot', { 
        error: null, 
        success: null,
        email: req.session.resetEmail || ''
    })
})

// Admin verify OTP POST route
router.post('/verify-otp-forgot', adminVerifyOTPForgot);
router.get('/reset-password', (req, res) => {
    res.render('admin/reset-password', { 
        error: null, 
        success: null,
        email: req.session.resetEmail || ''
    })
})

// Admin reset password 
router.post('/reset-password', adminResetPassword);
router.post('/resend-otp-forgot', adminResendOTPForgot);

// Admin dashboard
router.get('/dashboard', isAdmin, (req, res) => {
    res.render('admin/dashboard', { 
        admin: req.session.user,
        currentPage: 'dashboard'
    })
})

// Admin users page (protected)
router.get('/users', isAdmin, getUsers);

// Admin logout
router.get('/logout', adminLogout);

router.post('/users/toggle-status/:userId', isAdmin, toggleUserStatus);


export default router;
