import User from "../../models/User.js";
import { findUserByEmail, validatePassword } from "../../service/userService.js";
import { generateAndSaveOTP, verifyOTP } from "../../service/otpService.js";
import OTP from "../../models/OTP.js";

export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.render('admin/login', {
                error: 'Email and password are required',
                success: null
            });
        }
        
        if (!email.includes('@')) {
            return res.render('admin/login', {
                error: 'Please enter a valid email',
                success: null
            });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.render('admin/login', {
                error: 'Invalid email or password',
                success: null
            });
        }
        
        if (!user.isAdmin) {
            return res.render('admin/login', {
                error: 'Access denied. Admin privileges required.',
                success: null
            });
        }
        
        if (user.isBlocked) {
            return res.render('admin/login', {
                error: 'Your account has been blocked',
                success: null
            });
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.render('admin/login', {
                error: 'Invalid email or password',
                success: null
            });
        }
        
        // Creating admin session
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isAdmin: user.isAdmin
        };
        
        res.redirect('/admin/dashboard');
        
    } catch (error) {
        console.error('Admin login error:', error);
        res.render('admin/login', {
            error: 'An error occurred. Please try again.',
            success: null
        });
    }
};

// Admin Forgot Password
export const adminForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user exists and is admin
        const user = await findUserByEmail(email);
        if (!user || !user.isAdmin) {
            return res.json({
                success: false,
                message: 'No admin account found with this email address'
            });
        }
        
        // Check if admin is blocked
        if (user.isBlocked) {
            return res.json({
                success: false,
                message: 'Your admin account has been blocked'
            });
        }
        
        // Generate and send OTP
        req.session.resetEmail = email;
        await generateAndSaveOTP(email, 'admin-forgot-password');
        
        res.json({
            success: true,
            message: 'Verification code sent to your email address'
        });
        
    } catch (error) {
        console.error('Admin forgot password error:', error);
        res.json({
            success: false,
            message: 'Something went wrong. Please try again.'
        });
    }
};

// Admin Verify OTP for Forgot Password
export const adminVerifyOTPForgot = async(req, res) => {
    try {
        const { otp } = req.body;
        const email = req.session.resetEmail;
        
        if (!email) {
            return res.render('admin/verify-otp-forgot', {
                error: 'Session expired. Please try forgot password again.',
                success: null,
                email: ''
            });
        }
        
        // Verify OTP
        const otpVerification = await verifyOTP(email, otp, 'admin-forgot-password');
        if (!otpVerification.isValid) {
            return res.render('admin/verify-otp-forgot', {
                error: otpVerification.message,
                success: null,
                email
            });
        }
        
        // OTP verified, redirect 
        res.render('admin/reset-password', {
            error: null,
            success: 'OTP verified! Please enter your new password.',
            email
        });
        
    } catch (error) {
        console.error('Admin OTP verification error:', error)
        res.render('admin/verify-otp-forgot', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.resetEmail || ''
        });
    }
};

// Admin Reset Password
export const adminResetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body
        const email = req.session.resetEmail;
        
        if (!email) {
            return res.render('admin/reset-password', {
                error: 'Session expired. Please try again.',
                success: null,
                email: ''
            });
        }
        
        // Validate passwor
        if (password !== confirmPassword) {
            return res.render('admin/reset-password', {
                error: 'Passwords do not match',
                success: null,
                email
            });
        }
        
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.isValid) {
            return res.render('admin/reset-password', {
                error: passwordValidation.message,
                success: null,
                email
            });
        }
        
        // Update password
        const user = await findUserByEmail(email);
        user.password = password;
        await user.save();
        delete req.session.resetEmail
        res.render('admin/login', {
            error: null,
            success: 'Password reset successful! Please login with your new password.'
        });
        
    } catch (error) {
        console.error('Admin reset password error:', error)
        res.render('admin/reset-password', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.resetEmail || ''
        });
    }
}

// Admin Resend OTP for Forgot Password
export const adminResendOTPForgot = async (req, res) => {
    try {
        const email = req.session.resetEmail;
        
        if (!email) {
            return res.json({
                success: false,
                message: 'Session expired. Please try forgot password again.'
            })
        }
    
        // resend
        const lastOTP = await OTP.findOne({
            email,
            purpose: 'admin-forgot-password'
        }).sort({ createdAt: -1 })
        
        if (lastOTP) {
            const timeSinceLastOTP = Date.now() - lastOTP.createdAt.getTime()
            const oneMinute = 60 * 1000; 
            
            if (timeSinceLastOTP < oneMinute) {
                const remainingTime = Math.ceil((oneMinute - timeSinceLastOTP) / 1000)
                return res.json({
                    success: false,
                    message: `Please wait ${remainingTime} seconds before requesting a new code.`
                })
            }
        }
        
        // Generate and send new OTP
        await generateAndSaveOTP(email, 'admin-forgot-password');
        
        res.json({
            success: true,
            message: 'New reset code sent to your email.'
        })
        
    } catch (error) {
        console.error('Admin resend OTP error:', error)
        res.json({
            success: false,
            message: 'Failed to resend code. Please try again.'
        })
    }
}

// Admin logout
export const adminLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log('Session destroy error:',err)
        }
        res.redirect('/admin/login')
    })
}
//getting users with search, filter, and pagination
export const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Users per page
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        
        // Build search query
        let searchQuery = {};
        
        // Search by name or email
        if (search) {
            searchQuery.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Filter by status
        if (status === 'active') {
            searchQuery.isBlocked = false;
            searchQuery.isAdmin = false;
        } else if (status === 'blocked') {
            searchQuery.isBlocked = true;
        } else if (status === 'admin') {
            searchQuery.isAdmin = true;
        }
        
        // Get total count for pagination
        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / limit);
        
        // Get users with pagination
        const users = await User.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        // Calculate pagination info
        const startUser = skip + 1;
        const endUser = Math.min(skip + limit, totalUsers);
        
        res.render('admin/users', {
            admin: req.session.user,
            currentPage: 'users',
            users: users,
            search: search,
            status: status,
            currentPageNum: page,
            totalPages: totalPages,
            totalUsers: totalUsers,
            startUser: startUser,
            endUser: endUser,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.render('admin/users', {
            admin: req.session.user,
            currentPage: 'users',
            users: [],
            search: '',
            status: 'all',
            currentPageNum: 1,
            totalPages: 1,
            totalUsers: 0,
            startUser: 0,
            endUser: 0,
            hasNextPage: false,
            hasPrevPage: false,
            nextPage: 1,
            prevPage: 1
        });
    }
};
// blocking and unblocking the user
export const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }
        
        user.isBlocked = !user.isBlocked;
        await user.save();
        
        res.json({
            success: true,
            message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
            isBlocked: user.isBlocked
        });

    } catch (error) {
        console.error('Toggle user status error:', error);
        res.json({
            success: false,
            message: 'Something went wrong'
        });
    }
};