import { validateRegistration, findUserByEmail, createUser, validateLogin, validatePassword } from "../../service/userService.js";
import { generateAndSaveOTP, verifyOTP, getLatestOTPCreationTime } from "../../service/otpService.js";
import { sendOTPEmail } from "../../service/emailService.js";
import { generateOTP } from "../../helper/utils.js";

import OTP from "../../models/OTP.js";

// Show pages
export const showRegister = (req, res) => {
    res.render('user/register', { error: null, success: null, formData: {} });
};

export const showLogin = (req, res) => {
    let error = null;
    
    // Handle various error types
    if (req.query.error === 'google_auth_failed') {
        error = 'Google authentication failed. Please try again.';
    } else if (req.query.error === 'auth_error') {
        error = 'Authentication error occurred. Please try again.';
    } else if (req.query.error === 'google_not_configured') {
        error = 'Google authentication is not available at the moment.';
    } else if (req.query.error === 'account_blocked') {
        error = 'Your account has been blocked. Please contact support.';
    }
    
    res.render('user/login', { error, success: null });
};

export const showVerifyOTPRegistration = async (req, res) => {
    const email = req.session.tempEmail || '';
    const otpCreatedAt = email ? await getLatestOTPCreationTime(email, 'signup') : null;
    
    res.render('user/verify-otp-registration', {
        error: null,
        success: null,
        email,
        otpCreatedAt,
        resendTimerStart: req.session.resendTimerStart
    });
};

export const showVerifyOTPForgot = async (req, res) => {
    const email = req.session.resetEmail || '';
    const otpCreatedAt = email ? await getLatestOTPCreationTime(email, 'forgot-password') : null;
    
    res.render('user/verify-otp-forgot', {
        error: null,
        success: null,
        email,
        otpCreatedAt,
        resendTimerStart: req.session.resetResendTimerStart
    });
};

// Register user
export const registerUser = async (req, res) => {
    try {
        // Trim all input fields
        const trimmedData = {
            firstName: req.body.firstName?.trim(),
            lastName: req.body.lastName?.trim(),
            email: req.body.email?.trim().toLowerCase(),
            phone: req.body.phone?.trim(),
            password: req.body.password?.trim(),
            confirmPassword: req.body.confirmPassword?.trim()
        };
        
        // Validate input
        const validation = validateRegistration(trimmedData);
        
        if (!validation.isValid) {
            return res.render('user/register', {
                error: validation.message,
                success: null,
                formData: req.body
            });
        }

        // Check if user exists
        const existingUser = await findUserByEmail(trimmedData.email);
        
        if (existingUser) {
            return res.render('user/register', {
                error: 'User with this email already exists',
                success: null,
                formData: req.body
            });
            
        }

        // Save temp data and generate OTP
        req.session.tempUserData = trimmedData;
        req.session.tempEmail = trimmedData.email;
        
        await generateAndSaveOTP(trimmedData.email, 'signup');
        
        const otpCreatedAt = await getLatestOTPCreationTime(trimmedData.email, 'signup');
        
        res.render('user/verify-otp-registration', {
            error: null,
            success: 'OTP sent to your email address',
            email: trimmedData.email,
            otpCreatedAt
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.render('user/register', {
            error: 'Something went wrong. Please try again.',
            success: null,
            formData: req.body
        });
    }
};

// Verify OTP for Registration
export const verifyOTPRegistrationController = async (req, res) => {
    try {
        const { otp } = req.body;
        const email = req.session.tempEmail;
        
        if (!email) {
            return res.render('user/verify-otp-registration', {
                error: 'Session expired. Please register again.',
                success: null,
                email: '',
                otpCreatedAt: null
            });
        }
        
        // Verify OTP
        const otpVerification = await verifyOTP(email, otp, 'signup');
        if (!otpVerification.isValid) {
            const otpCreatedAt = await getLatestOTPCreationTime(email, 'signup');
            
            // Store current timer states to preserve them
            const currentTime = Date.now();
            if (!req.session.resendTimerStart) {
                req.session.resendTimerStart = currentTime;
            }
            
            return res.render('user/verify-otp-registration', {
                error: otpVerification.message,
                success: null,
                email,
                otpCreatedAt,
                resendTimerStart: req.session.resendTimerStart
            });
        }
        
        // Create user
        const newUser = await createUser(req.session.tempUserData);
        
        // Set session for automatic login
        req.session.userId = newUser._id;
        req.session.user = {
            id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            isAdmin: newUser.isAdmin
        };
        
        //  toast
        req.session.loginSuccess = {
            firstName: newUser.firstName,
            message: `Welcome to Horologue, ${newUser.firstName}!`
        };
        
        // Clear temp session data
        delete req.session.tempUserData;
        delete req.session.tempEmail;
        delete req.session.resendTimerStart;
        
        res.redirect('/home');
        
    } catch (error) {
        console.error('OTP verification error:', error);
        const otpCreatedAt = await getLatestOTPCreationTime(req.session.tempEmail || '', 'signup');
        res.render('user/verify-otp-registration', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.tempEmail || '',
            otpCreatedAt,
            resendTimerStart: req.session.resendTimerStart
        });
    }
};

// Verify OTP for Forgot Password
export const verifyOTPForgotController = async (req, res) => {
    try {
        const { otp } = req.body;
        const email = req.session.resetEmail;
        
        if (!email) {
            return res.render('user/verify-otp-forgot', {
                error: 'Session expired. Please try forgot password again.',
                success: null,
                email: '',
                otpCreatedAt: null
            });
        }
        
        // Verify OTP
        const otpVerification = await verifyOTP(email, otp, 'forgot-password');
        if (!otpVerification.isValid) {
            const otpCreatedAt = await getLatestOTPCreationTime(email, 'forgot-password');
            
            // Store current timer states to preserve them
            const currentTime = Date.now();
            if (!req.session.resetResendTimerStart) {
                req.session.resetResendTimerStart = currentTime;
            }
            
            return res.render('user/verify-otp-forgot', {
                error: otpVerification.message,
                success: null,
                email,
                otpCreatedAt,
                resendTimerStart: req.session.resetResendTimerStart
            });
        }
        
        // OTP verified, redirect to reset password page
        res.render('user/reset-password', {
            error: null,
            success: 'OTP verified! Please enter your new password.',
            email
        });
        
    } catch (error) {
        console.error('OTP verification error:', error);
        const otpCreatedAt = await getLatestOTPCreationTime(req.session.resetEmail || '', 'forgot-password');
        res.render('user/verify-otp-forgot', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.resetEmail || '',
            otpCreatedAt,
            resendTimerStart: req.session.resetResendTimerStart
        });
    }
};

// Login user
export const loginUser = async (req, res) => {
    try {
        const { email, password, remember } = req.body;
        const loginResult = await validateLogin(email, password);
        if (!loginResult.isValid) {
            return res.render('user/login', {
                error: loginResult.message,
                success: null
            });
        }
        
        // Set session
        const user = loginResult.user;
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isAdmin: user.isAdmin
        };
        
        // Set login success flag for toast
        req.session.loginSuccess = {
            firstName: user.firstName,
            message: `Welcome back, ${user.firstName}!`
        }
        res.redirect('/home');
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('user/login', {
            error: 'Something went wrong. Please try again.',
            success: null
        });
    }
};

export const showForgotPassword = (req, res) => {
    res.render('user/forgot-password', { error: null, success: null });
};

export const showResetPassword = (req, res) => {
    res.render('user/reset-password', { 
        error: null, 
        success: null,
        email: req.session.resetEmail || ''
    });
};

export const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user exists
        const user = await findUserByEmail(email);
        if (!user) {
            return res.json({
                success: false,
                message: 'No account found with this email address'
            });
        }
        
        // Generate and send OTP
        req.session.resetEmail = email;
        await generateAndSaveOTP(email, 'forgot-password');
        
        res.json({
            success: true,
            message: 'Verification code sent to your email address'
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.json({
            success: false,
            message: 'Something went wrong. Please try again.'
        });
    }
};

export const resetPasswordController = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const email = req.session.resetEmail;
        
        if (!email) {
            return res.render('user/reset-password', {
                error: 'Session expired. Please try again.',
                success: null,
                email: ''
            });
        }
        
        // Validate passwords
        if (password !== confirmPassword) {
            return res.render('user/reset-password', {
                error: 'Passwords do not match',
                success: null,
                email
            });
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.render('user/reset-password', {
                error: passwordValidation.message,
                success: null,
                email
            });
        }
        
        // Update password
        const user = await findUserByEmail(email);
        user.password = password;
        await user.save();
        
        // Clear session
        delete req.session.resetEmail;
        
        res.render('user/login', {
            error: null,
            success: 'Password reset successful! Please login with your new password.'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.render('user/reset-password', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.resetEmail || ''
        });
    }
};

// Logout user
export const logoutUser = (req, res) => {
    // Handle passport logout first
    if (req.logout) {
        req.logout((err) => {
            if (err) {
                console.error('Passport logout error:', err);
            }
            // Clear session and cookies
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                    return res.redirect('/home');
                }
                // Clear session cookie
                res.clearCookie('horologue.sid');
                res.clearCookie('connect.sid');
                
                // Set cache control headers
                res.set({
                    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                
                res.redirect('/');
            });
        });
    } else {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.redirect('/home');
            }
            // Clear session cookie
            res.clearCookie('horologue.sid');
            res.clearCookie('connect.sid');
            
            // Set cache control headers
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, private',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            
            res.redirect('/');
        });
    }
};
// Resend OTP for Registration
export const resendOTPRegistrationController = async (req, res) => {
    try {
        const email = req.session.tempEmail;
        
        if (!email) {
            return res.json({
                success: false,
                message: 'Session expired. Please register again.'
            });
        }
        
        // Check if user can resend (1 minute cooldown)
        const lastOTP = await OTP.findOne({
            email,
            purpose: 'signup'
        }).sort({ createdAt: -1 });
        
        if (lastOTP) {
            const timeSinceLastOTP = Date.now() - lastOTP.createdAt.getTime();
            const oneMinute = 60 * 1000; // 1 minute in milliseconds
            
            if (timeSinceLastOTP < oneMinute) {
                const remainingTime = Math.ceil((oneMinute - timeSinceLastOTP) / 1000);
                return res.json({
                    success: false,
                    message: `Please wait ${remainingTime} seconds before requesting a new code.`
                });
            }
        }
        
        // Generate and send new OTP
        await generateAndSaveOTP(email, 'signup');
        
        res.json({
            success: true,
            message: 'New verification code sent to your email.'
        });
        
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.json({
            success: false,
            message: 'Failed to resend code. Please try again.'
        });
    }
};

// Resend OTP for Forgot Password
export const resendOTPForgotController = async (req, res) => {
    try {
        const email = req.session.resetEmail;
        
        if (!email) {
            return res.json({
                success: false,
                message: 'Session expired. Please try forgot password again.'
            });
        }
        
        // Check if user can resend (1 minute cooldown)
        const lastOTP = await OTP.findOne({
            email,
            purpose: 'forgot-password'
        }).sort({ createdAt: -1 });
        
        if (lastOTP) {
            const timeSinceLastOTP = Date.now() - lastOTP.createdAt.getTime();
            const oneMinute = 60 * 1000
            if (timeSinceLastOTP < oneMinute) {
                const remainingTime = Math.ceil((oneMinute - timeSinceLastOTP) / 1000);
                return res.json({
                    success: false,
                    message: `Please wait ${remainingTime} seconds before requesting a new code.`
                })
            }
        }
        
        // Generate and send new OTP
        await generateAndSaveOTP(email, 'forgot-password');
        
        res.json({
            success: true,
            message: 'New reset code sent to your email.'
        });
        
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.json({
            success: false,
            message: 'Failed to resend code. Please try again.'
        });
    }
};
// Google OAuth Controllers
import passport from '../../config/passport.js';
export const googleAuth = (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect('/login?error=google_not_configured');
    }
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })(req, res, next);
};

// Google OAuth callback handler
export const googleCallback = (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect('/login?error=google_not_configured');
    } 
    passport.authenticate('google', { 
        failureRedirect: '/login?error=google_auth_failed' 
    })(req, res, (err) => {
        if (err) {
            console.error('Google OAuth callback error:', err);
            return res.redirect('/login?error=auth_error');
        }
        if (!req.user) {
            return res.redirect('/login?error=account_blocked');
        }
        
        // Check if user is blocked
        if (req.user.isBlocked) {
            return res.redirect('/login?error=account_blocked');
        }
        
        try {
            req.session.userId = req.user._id;
            req.session.user = {
                id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                isAdmin: req.user.isAdmin
            }
            if (req.user.isAdmin) {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/home');
            }
        } catch (error) {
            console.error('Session sync error:', error);
            res.redirect('/login?error=auth_error');
        }
    });
};
















