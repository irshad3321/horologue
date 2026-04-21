import { validateRegistration, findUserByEmail, createUser, validateLogin, validatePassword } from "../../service/userService.js";
import { generateAndSaveOTP, verifyOTP } from "../../service/otpService.js";
import OTP from "../../models/OTP.js";

// Show pages
export const showRegister = (req, res) => {
    res.render('user/register', { error: null, success: null, formData: {} });
};

export const showLogin = (req, res) => {
    res.render('user/login', { error: null, success: null });
};

export const showVerifyOTPRegistration = (req, res) => {
    res.render('user/verify-otp-registration', {
        error: null,
        success: null,
        email: req.session.tempEmail || ''
    });
};

export const showVerifyOTPForgot = (req, res) => {
    res.render('user/verify-otp-forgot', {
        error: null,
        success: null,
        email: req.session.resetEmail || ''
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
        
        res.render('user/verify-otp-registration', {
            error: null,
            success: 'OTP sent to your email address',
            email: trimmedData.email
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
                email: ''
            });
        }
        
        // Verify OTP
        const otpVerification = await verifyOTP(email, otp, 'signup');
        if (!otpVerification.isValid) {
            return res.render('user/verify-otp-registration', {
                error: otpVerification.message,
                success: null,
                email
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
        
        res.redirect('/home');
        
    } catch (error) {
        console.error('OTP verification error:', error);
        res.render('user/verify-otp-registration', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.tempEmail || ''
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
                email: ''
            });
        }
        
        // Verify OTP
        const otpVerification = await verifyOTP(email, otp, 'forgot-password');
        if (!otpVerification.isValid) {
            return res.render('user/verify-otp-forgot', {
                error: otpVerification.message,
                success: null,
                email
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
        res.render('user/verify-otp-forgot', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.resetEmail || ''
        });
    }
};

// Login user
export const loginUser = async (req, res) => {
    try {
        const { email, password, remember } = req.body;
        
        // Validate login
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
        };
        
        // Always redirect to home page when logging in from user side
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
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/home');
        }
        res.redirect('/');
    });
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