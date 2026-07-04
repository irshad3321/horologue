import { validateRegistration, findUserByEmail, createUser, validateLogin, validatePassword } from "../../service/userService.js";
import { generateAndSaveOTP, verifyOTP, getLatestOTPCreationTime } from "../../service/otpService.js";
import { sendOTPEmail } from "../../service/emailService.js";
import { generateOTP } from "../../helper/utils.js";
import Cart from "../../models/Cart.js";

import OTP from "../../models/OTP.js";
import User from "../../models/User.js";
// Helper function to merge guest cart into user cart after login
async function mergeGuestCart(guestSessionId, userId) {
    try {
        
        const guestCart = await Cart.findOne({ guestId: guestSessionId });
        
        if (!guestCart || guestCart.items.length === 0) {
            return; 
        }
        
        let userCart = await Cart.findOne({ user: userId });
        
        if (!userCart) {
            guestCart.user = userId;
            guestCart.guestId = undefined;
            await guestCart.save();
            return;
        }
        
        for (const guestItem of guestCart.items) {
            const existingItem = userCart.items.find(
                item => item.product.toString() === guestItem.product.toString() &&
                        item.variantId.toString() === guestItem.variantId.toString()
            );
            
            if (existingItem) {
                existingItem.quantity = Math.min(existingItem.quantity + guestItem.quantity, 5);
            } else {
                userCart.items.push(guestItem);
            }
        }
        
        await userCart.save();
        
        await Cart.deleteOne({ _id: guestCart._id });
    } catch (error) {
        console.error('Error merging guest cart:', error);
        throw error;
    }
}

// Show pages
export const showRegister = (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.render('user/register', { error: null, success: null, formData: {} });
};


export const registerUser = async (req, res) => {
    try {
        const trimmedData = {
            firstName: req.body.firstName?.trim(),
            lastName: req.body.lastName?.trim(),
            email: req.body.email?.trim().toLowerCase(),
            phone: req.body.phone?.trim(),
            password: req.body.password?.trim(),
            confirmPassword: req.body.confirmPassword?.trim(),
            referralCode: req.body.referralCode?.trim() || ''
        };
        
        const validation = validateRegistration(trimmedData);
        
        if (!validation.isValid) {
            return res.render('user/register', {
                error: validation.message,
                success: null,
                formData: req.body
            });
        }
        
        const existingUser = await findUserByEmail(trimmedData.email);
       
        if (existingUser) {
            return res.render('user/register', {
                error: 'User with this email already exists',
                success: null,
                formData: req.body
            });
            
        }
      
        req.session.tempUserData = trimmedData;
        req.session.tempEmail = trimmedData.email;
        req.session.resendTimerStart = Date.now()
        
        await generateAndSaveOTP(trimmedData.email, 'signup');
        
        const otpCreatedAt = await getLatestOTPCreationTime(trimmedData.email, 'signup');
        
        // Prevent caching
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        res.render('user/verify-otp-registration', {
            error: null,
            success: 'OTP sent to your email address',
            email: trimmedData.email,
            otpCreatedAt,
            resendTimerStart: req.session.resendTimerStart
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
        
        req.session.userId = newUser._id;
        req.session.user = {
            id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
            referralCode: newUser.referralCode,
            referralEarnings: newUser.referralEarnings || 0
        };
        
        req.session.loginSuccess = {
            firstName: newUser.firstName,
            message: `Welcome to Horologue, ${newUser.firstName}!`
        };
        
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
export const showLogin = (req, res) => {
    let error = null;
    
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
    if (!req.session.tempEmail) {
        return res.redirect('/register');
    }
    
    const email = req.session.tempEmail || '';
    const otpCreatedAt = email ? await getLatestOTPCreationTime(email, 'signup') : null;
    
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
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
        
        
        const user = loginResult.user;
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt
        };
        
        req.session.loginSuccess = {
            firstName: user.firstName,
            message: `Welcome back, ${user.firstName}!`
        }
        
        try {
            const guestSessionId = req.sessionID;
            await mergeGuestCart(guestSessionId, user._id);
        } catch (mergeError) {
            console.error('Guest cart merge error:', mergeError);
        }
        
        const redirectTo = req.session.redirectTo || '/home';
        delete req.session.redirectTo
        res.redirect(redirectTo);
        
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
        
        const user = await findUserByEmail(email);
        if (!user) {
            return res.json({
                success: false,
                message: 'No account found with this email address'
            });
        }
        
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
    if (req.logout) {
        req.logout((err) => {
            if (err) {
                console.error('Passport logout error:', err);
            }
            
            req.session.destroy((err) => {
                if (err) {
                    console.error('User session destroy error:', err);
                }
                
                res.clearCookie('horologue.user.sid');
                
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
                console.error('User session destroy error:', err);
            }
            
            res.clearCookie('horologue.user.sid');
            
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
        
        // Check if user can resen
        const lastOTP = await OTP.findOne({
            email,
            purpose: 'signup'
        }).sort({ createdAt: -1 });
        
        if (lastOTP) {
            const timeSinceLastOTP = Date.now() - lastOTP.createdAt.getTime();
            const oneMinute = 60 * 1000;
            
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
        
        req.session.resendTimerStart = Date.now();
        
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
// import User from "../../models/User.js";
export const googleAuth = (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect('/login?error=google_not_configured');
    }
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })(req, res, next);
};

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
                phone: req.user.phone,
                profileImage: req.user.profileImage,
                isAdmin: req.user.isAdmin,
                createdAt: req.user.createdAt
            };
            
            res.redirect('/home');
        } catch (error) {
            console.error('Session sync error:', error);
            res.redirect('/login?error=auth_error');
        }
    });
};
















