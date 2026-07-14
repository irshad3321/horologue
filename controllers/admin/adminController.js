import { HTTP_STATUS, ORDER_STATUS, PAYMENT_STATUS } from '../../helper/constants.js';
import User from "../../models/User.js";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import { findUserByEmail, validatePassword } from "../../service/userService.js";
import { generateAndSaveOTP, verifyOTP, getLatestOTPCreationTime } from "../../service/otpService.js";
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
        
        // Admin login - use simple session keys since we have separate session stores
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
                email: '',
                otpCreatedAt: null
            });
        }
        
        // Verify OTP
        const otpVerification = await verifyOTP(email, otp, 'admin-forgot-password');
        if (!otpVerification.isValid) {
            const otpCreatedAt = await getLatestOTPCreationTime(email, 'admin-forgot-password');
            
            // Store current timer states to preserve them
            const currentTime = Date.now();
            if (!req.session.adminResetResendTimerStart) {
                req.session.adminResetResendTimerStart = currentTime;
            }
            
            return res.render('admin/verify-otp-forgot', {
                error: otpVerification.message,
                success: null,
                email,
                otpCreatedAt,
                resendTimerStart: req.session.adminResetResendTimerStart
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
        const otpCreatedAt = await getLatestOTPCreationTime(req.session.resetEmail || '', 'admin-forgot-password');
        res.render('admin/verify-otp-forgot', {
            error: 'Something went wrong. Please try again.',
            success: null,
            email: req.session.resetEmail || '',
            otpCreatedAt,
            resendTimerStart: req.session.adminResetResendTimerStart
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
    // Destroy the entire admin session since it's separate
    req.session.destroy((err) => {
        if (err) {
            // Session destroy error - ignore
        }
        res.clearCookie('horologue.admin.sid');
        
        // Set cache control headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        res.redirect('/admin/login');
    });
};
//getting users with search, filter, and pagination
export const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        let searchQuery = {};
        if (search) {
            searchQuery.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                
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
        
        const wasBlocked = user.isBlocked;
        user.isBlocked = !user.isBlocked;
        await user.save();
        
        // If user is being blocked, force logout by clearing their sessions
        if (!wasBlocked && user.isBlocked) {
            // Note: In a production environment with multiple servers, 
            // you'd want to use Redis or a session store to invalidate sessions
            // For now, the session-check endpoint will handle this on next request
        }
        
        res.json({
            success: true,
            message: user.isBlocked ? 'User blocked successfully. They will be logged out on next activity.' : 'User unblocked successfully',
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


// Show Dashboard
export const showDashboard = async (req, res) => {
    try {
        res.render('admin/dashboard', {
            admin: req.session.user,
            currentPage: 'dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
};

// Get Dashboard Stats
export const getDashboardStats = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const now = new Date();
        let dateFilter = {};

        if (filter === 'daily') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
        } else if (filter === 'weekly') {
            // Current week Mon-Sun
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day; // Monday as start
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
        } else if (filter === 'monthly') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
        } else if (filter === 'yearly') {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
        } else if (filter === 'custom' && startDate && endDate) {
            dateFilter = {
                orderDate: {
                    $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                }
            };
        }

        const totalUsers = await User.countDocuments({ isAdmin: false });

        const totalOrders = await Order.countDocuments({
            ...dateFilter,
            orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] }
        });

        const revenueResult = await Order.aggregate([
            { $match: { ...dateFilter, orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        const totalProducts = await Product.countDocuments({ isDeleted: false });

        res.json({
            success: true,
            stats: { totalUsers, totalOrders, totalRevenue, totalProducts }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.json({ success: false, message: 'Failed to fetch stats' });
    }
};

// Get Sales Chart Data
export const getSalesChartData = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const now = new Date();

        const toLocalDateStr = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        let labels = [];
        let groupBy;
        let dateFilterStart, dateFilterEnd;

        if (filter === 'daily') {
            // Today only - show each hour (0-23) or just today as 1 point
            dateFilterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            dateFilterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            labels = ['12AM','1AM','2AM','3AM','4AM','5AM','6AM','7AM','8AM','9AM','10AM','11AM',
                      '12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM'];
            groupBy = { $hour: '$orderDate' };

        } else if (filter === 'weekly') {
            // Current week Mon-Sun
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            dateFilterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
            dateFilterEnd = new Date(dateFilterStart);
            dateFilterEnd.setDate(dateFilterStart.getDate() + 6);
            dateFilterEnd.setHours(23, 59, 59, 999);

            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } };

        } else if (filter === 'yearly') {
            dateFilterStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            dateFilterEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            groupBy = { $month: '$orderDate' };

        } else if (filter === 'custom' && startDate && endDate) {
            dateFilterStart = new Date(new Date(startDate).setHours(0, 0, 0, 0));
            dateFilterEnd = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            const daysDiff = Math.ceil((dateFilterEnd - dateFilterStart) / (1000 * 60 * 60 * 24));
            for (let i = 0; i <= daysDiff; i++) {
                const date = new Date(dateFilterStart);
                date.setDate(date.getDate() + i);
                labels.push(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
            }
            groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } };

        } else {
            // Monthly - current month, each day
            dateFilterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            dateFilterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const daysInMonth = dateFilterEnd.getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                labels.push(String(i));
            }
            groupBy = { $dayOfMonth: '$orderDate' };
        }

        const salesData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: dateFilterStart, $lte: dateFilterEnd },
                    orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] }
                }
            },
            { $group: { _id: groupBy, total: { $sum: '$totalAmount' } } },
            { $sort: { '_id': 1 } }
        ]);

        let data;
        if (filter === 'daily') {
            // Map by hour (0-23)
            data = labels.map((label, index) => {
                const found = salesData.find(item => item._id === index);
                return found ? found.total : 0;
            });

        } else if (filter === 'weekly') {
            // Map Mon=0 to Sun=6
            data = labels.map((label, index) => {
                const day = new Date(dateFilterStart);
                day.setDate(day.getDate() + index);
                const dateStr = toLocalDateStr(day);
                const found = salesData.find(item => item._id === dateStr);
                return found ? found.total : 0;
            });

        } else if (filter === 'monthly') {
            // Map by day of month (1-based)
            data = labels.map((label, index) => {
                const found = salesData.find(item => item._id === (index + 1));
                return found ? found.total : 0;
            });

        } else if (filter === 'yearly') {
            // Map by month (1-based)
            data = labels.map((label, index) => {
                const found = salesData.find(item => item._id === (index + 1));
                return found ? found.total : 0;
            });

        } else if (filter === 'custom') {
            data = labels.map((label, index) => {
                const day = new Date(dateFilterStart);
                day.setDate(day.getDate() + index);
                const dateStr = toLocalDateStr(day);
                const found = salesData.find(item => item._id === dateStr);
                return found ? found.total : 0;
            });

        } else {
            data = labels.map(() => 0);
        }

        res.json({ success: true, chartData: { labels, data } });
    } catch (error) {
        console.error('Get sales chart data error:', error);
        res.json({ success: false, message: 'Failed to fetch chart data' });
    }
};

// Get Top 10 Products
export const getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            { $match: { orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.itemTotal' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $project: {
                    name: '$productDetails.name',
                    brand: '$productDetails.brand',
                    category: '$productDetails.category',
                    totalSold: 1,
                    totalRevenue: 1
                }
            }
        ]);
        
        res.json({ success: true, products: topProducts });
    } catch (error) {
        console.error('Get top products error:', error);
        res.json({ success: false, message: 'Failed to fetch top products' });
    }
};

// Get Top 10 Categories
export const getTopCategories = async (req, res) => {
    try {
        const topCategories = await Order.aggregate([
            { $match: { orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.category',
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.itemTotal' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $project: {
                    name: '$_id',
                    totalSold: 1,
                    totalRevenue: 1
                }
            }
        ]);
        
        res.json({ success: true, categories: topCategories });
    } catch (error) {
        console.error('Get top categories error:', error);
        res.json({ success: false, message: 'Failed to fetch top categories' });
    }
};

// Get Top 10 Brands
export const getTopBrands = async (req, res) => {
    try {
        const topBrands = await Order.aggregate([
            { $match: { orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.brand',
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.itemTotal' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $project: {
                    name: '$_id',
                    totalSold: 1,
                    totalRevenue: 1
                }
            }
        ]);
        
        res.json({ success: true, brands: topBrands });
    } catch (error) {
        console.error('Get top brands error:', error);
        res.json({ success: false, message: 'Failed to fetch top brands' });
    }
};


// Show Sales Report Page
export const showSalesReport = async (req, res) => {
    try {
        res.render('admin/sales-report', {
            admin: req.session.user,
            currentPage: 'sales-report'
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
};

// Get Sales Report Data
export const getSalesReportData = async (req, res) => {
    try {
        const { filter, startDate, endDate, page = 1, limit = 10 } = req.query;
        
        let dateFilter = {};
        const now = new Date();
        
        // Determine date range based on filter
        if (filter === 'custom' && startDate && endDate) {
            dateFilter = {
                orderDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                }
            };
        } else if (filter === 'daily') {
            // Today
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            dateFilter = { orderDate: { $gte: startOfDay, $lte: endOfDay } };
        } else if (filter === 'weekly') {
            // Last 7 days
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { orderDate: { $gte: weekAgo } };
        } else if (filter === 'monthly') {
            // Current month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { orderDate: { $gte: startOfMonth } };
        } else if (filter === 'yearly') {
            // Current year
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            dateFilter = { orderDate: { $gte: startOfYear } };
        }
        
        // Get total count for pagination (include all orders)
        const totalOrders = await Order.countDocuments(dateFilter);
        
        // Calculate pagination
        const currentPage = parseInt(page);
        const itemsPerPage = parseInt(limit);
        const skip = (currentPage - 1) * itemsPerPage;
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
        
        // Get orders with pagination (include all statuses)
        const orders = await Order.find(dateFilter)
        .populate('items.product')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(itemsPerPage);
        
        // Calculate summary statistics (for all orders, not just current page)
        const allOrders = await Order.find({
            ...dateFilter,
            orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] }
        }).populate('items.product');
        
        let totalSalesCount = allOrders.length;
        let totalOrderAmount = 0;
        let totalDiscount = 0;
        let totalCouponDeduction = 0;
        
        allOrders.forEach(order => {
            totalOrderAmount += order.totalAmount;
            totalDiscount += order.discount || 0;
            totalCouponDeduction += order.couponDiscount || 0;
        });
        
        // Calculate product offer discounts from order items
        let totalProductOfferDiscount = 0;
        allOrders.forEach(order => {
            order.items.forEach(item => {
                if (item.product && item.product.offer > 0) {
                    const originalPrice = item.price / (1 - item.product.offer / 100);
                    const offerDiscount = (originalPrice - item.price) * item.quantity;
                    totalProductOfferDiscount += offerDiscount;
                }
            });
        });
        
        totalDiscount += totalProductOfferDiscount;
        
        // Format orders for response
        const formattedOrders = orders.map(order => ({
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            customerName: order.shippingAddress.fullName,
            itemsCount: order.items.length,
            subtotal: order.subtotal,
            discount: order.discount || 0,
            couponDiscount: order.couponDiscount || 0,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            orderStatus: order.orderStatus
        }));
        
        res.json({
            success: true,
            summary: {
                totalSalesCount,
                totalOrderAmount,
                totalDiscount,
                totalCouponDeduction
            },
            orders: formattedOrders,
            pagination: {
                currentPage,
                totalPages,
                totalOrders,
                itemsPerPage,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1
            }
        });
    } catch (error) {
        console.error('Get sales report data error:', error);
        res.json({ success: false, message: 'Failed to fetch sales report' });
    }
};

// Download Sales Report (PDF/Excel)
export const downloadSalesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate, format } = req.query;
        
        let dateFilter = {};
        const now = new Date();
        
        // Determine date range based on filter
        if (filter === 'custom' && startDate && endDate) {
            dateFilter = {
                orderDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                }
            };
        } else if (filter === 'daily') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            dateFilter = { orderDate: { $gte: startOfDay, $lte: endOfDay } };
        } else if (filter === 'weekly') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { orderDate: { $gte: weekAgo } };
        } else if (filter === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { orderDate: { $gte: startOfMonth } };
        } else if (filter === 'yearly') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            dateFilter = { orderDate: { $gte: startOfYear } };
        }
        
        // Get orders
        const orders = await Order.find({
            ...dateFilter,
            orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] }
        }).populate('items.product').sort({ orderDate: -1 });
        
        // Calculate summary
        let totalSalesCount = orders.length;
        let totalOrderAmount = 0;
        let totalDiscount = 0;
        let totalCouponDeduction = 0;
        
        orders.forEach(order => {
            totalOrderAmount += order.totalAmount;
            totalDiscount += order.discount || 0;
            totalCouponDeduction += order.couponDiscount || 0;
        });
        
        if (format === 'pdf') {
            // Generate PDF using PDFKit
            const PDFDocument = (await import('pdfkit')).default;
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            
            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);
            
            // Pipe PDF to response
            doc.pipe(res);
            
            // Add header
            doc.fontSize(20).font('Helvetica-Bold').text('Horologue - Sales Report', { align: 'center' });
            doc.moveDown();
            
            // Add filter info
            doc.fontSize(12).font('Helvetica');
            const filterText = filter === 'custom' 
                ? `Custom Range: ${new Date(startDate).toLocaleDateString('en-IN')} - ${new Date(endDate).toLocaleDateString('en-IN')}`
                : `Period: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`;
            doc.text(filterText, { align: 'center' });
            doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
            doc.moveDown(2);
            
            // Add summary section
            doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            doc.text(`Total Sales Count: ${totalSalesCount}`);
            doc.text(`Total Order Amount: ₹${totalOrderAmount.toLocaleString('en-IN')}`);
            doc.text(`Total Discount: ₹${totalDiscount.toLocaleString('en-IN')}`);
            doc.text(`Coupon Deductions: ₹${totalCouponDeduction.toLocaleString('en-IN')}`);
            doc.moveDown(2);
            
            // Add orders table header
            doc.fontSize(14).font('Helvetica-Bold').text('Order Details', { underline: true });
            doc.moveDown(0.5);
            
            // Table setup
            const tableTop = doc.y;
            const itemHeight = 20;
            let currentY = tableTop;
            
            // Draw table header
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Order #', 50, currentY, { width: 80 });
            doc.text('Date', 130, currentY, { width: 70 });
            doc.text('Customer', 200, currentY, { width: 100 });
            doc.text('Items', 300, currentY, { width: 40 });
            doc.text('Subtotal', 340, currentY, { width: 60 });
            doc.text('Discount', 400, currentY, { width: 60 });
            doc.text('Total', 460, currentY, { width: 80 });
            
            currentY += itemHeight;
            doc.moveTo(50, currentY).lineTo(540, currentY).stroke();
            currentY += 5;
            
            // Add orders
            doc.font('Helvetica').fontSize(8);
            orders.forEach((order, index) => {
                // Check if we need a new page
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                }
                
                const date = new Date(order.orderDate).toLocaleDateString('en-IN');
                
                doc.text(order.orderNumber, 50, currentY, { width: 80 });
                doc.text(date, 130, currentY, { width: 70 });
                doc.text(order.shippingAddress.fullName, 200, currentY, { width: 100 });
                doc.text(order.items.length.toString(), 300, currentY, { width: 40 });
                doc.text(`₹${order.subtotal.toLocaleString('en-IN')}`, 340, currentY, { width: 60 });
                doc.text(`₹${(order.discount + order.couponDiscount).toLocaleString('en-IN')}`, 400, currentY, { width: 60 });
                doc.text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 460, currentY, { width: 80 });
                
                currentY += itemHeight;
            });
            
            // Add footer
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).text(
                    `Page ${i + 1} of ${pageCount}`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );
            }
            
            // Finalize PDF
            doc.end();
        } else if (format === 'excel') {
            // Generate Excel using ExcelJS
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');
            
            // Set column widths
            worksheet.columns = [
                { header: 'Order Number', key: 'orderNumber', width: 20 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Customer', key: 'customer', width: 25 },
                { header: 'Items', key: 'items', width: 10 },
                { header: 'Subtotal', key: 'subtotal', width: 15 },
                { header: 'Discount', key: 'discount', width: 15 },
                { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
                { header: 'Total Amount', key: 'totalAmount', width: 15 },
                { header: 'Payment Method', key: 'paymentMethod', width: 15 },
                { header: 'Status', key: 'status', width: 15 }
            ];
            
            // Add title row
            worksheet.mergeCells('A1:J1');
            const titleRow = worksheet.getCell('A1');
            titleRow.value = 'Horologue - Sales Report';
            titleRow.font = { size: 16, bold: true };
            titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF667eea' }
            };
            titleRow.font = { ...titleRow.font, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).height = 30;
            
            // Add filter info
            worksheet.mergeCells('A2:J2');
            const filterRow = worksheet.getCell('A2');
            const filterText = filter === 'custom' 
                ? `Custom Range: ${new Date(startDate).toLocaleDateString('en-IN')} - ${new Date(endDate).toLocaleDateString('en-IN')}`
                : `Period: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`;
            filterRow.value = filterText;
            filterRow.alignment = { horizontal: 'center' };
            
            // Add generation date
            worksheet.mergeCells('A3:J3');
            const dateRow = worksheet.getCell('A3');
            dateRow.value = `Generated: ${new Date().toLocaleString('en-IN')}`;
            dateRow.alignment = { horizontal: 'center' };
            
            // Add empty row
            worksheet.addRow([]);
            
            // Add summary section
            worksheet.mergeCells('A5:B5');
            const summaryTitle = worksheet.getCell('A5');
            summaryTitle.value = 'Summary';
            summaryTitle.font = { bold: true, size: 14 };
            summaryTitle.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE9ECEF' }
            };
            
            worksheet.getCell('A6').value = 'Total Sales Count:';
            worksheet.getCell('B6').value = totalSalesCount;
            worksheet.getCell('A7').value = 'Total Order Amount:';
            worksheet.getCell('B7').value = `₹${totalOrderAmount.toLocaleString('en-IN')}`;
            worksheet.getCell('A8').value = 'Total Discount:';
            worksheet.getCell('B8').value = `₹${totalDiscount.toLocaleString('en-IN')}`;
            worksheet.getCell('A9').value = 'Coupon Deductions:';
            worksheet.getCell('B9').value = `₹${totalCouponDeduction.toLocaleString('en-IN')}`;
            
            // Style summary rows
            for (let i = 6; i <= 9; i++) {
                worksheet.getCell(`A${i}`).font = { bold: true };
                worksheet.getCell(`B${i}`).alignment = { horizontal: 'right' };
            }
            
            // Add empty row
            worksheet.addRow([]);
            
            // Add header row for orders table
            const headerRow = worksheet.addRow([
                'Order Number', 'Date', 'Customer', 'Items', 'Subtotal', 
                'Discount', 'Coupon Discount', 'Total Amount', 'Payment Method', 'Status'
            ]);
            
            // Style header row
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF667eea' }
            };
            headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
            headerRow.height = 25;
            
            // Add order data
            orders.forEach(order => {
                const row = worksheet.addRow([
                    order.orderNumber,
                    new Date(order.orderDate).toLocaleDateString('en-IN'),
                    order.shippingAddress.fullName,
                    order.items.length,
                    `₹${order.subtotal.toLocaleString('en-IN')}`,
                    `₹${order.discount.toLocaleString('en-IN')}`,
                    `₹${order.couponDiscount.toLocaleString('en-IN')}`,
                    `₹${order.totalAmount.toLocaleString('en-IN')}`,
                    order.paymentMethod,
                    order.orderStatus
                ]);
                
                // Alternate row colors
                row.eachCell((cell, colNumber) => {
                    if (worksheet.getRow(row.number).number % 2 === 0) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF8F9FA' }
                        };
                    }
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE9ECEF' } },
                        bottom: { style: 'thin', color: { argb: 'FFE9ECEF' } }
                    };
                });
            });
            
            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);
            
            // Write to response
            await workbook.xlsx.write(res);
            res.end();
        } else {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Invalid format' });
        }
    } catch (error) {
        console.error('Download sales report error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to download report' });
    }
};


// Download Dashboard PDF
export const downloadDashboardPDF = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const now = new Date();

        // Build same date filter as getDashboardStats
        let dateFilter = {};
        let periodText = 'All Time';

        if (filter === 'daily') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
            periodText = `Today (${start.toLocaleDateString('en-IN')})`;
        } else if (filter === 'weekly') {
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
            periodText = `This Week (${start.toLocaleDateString('en-IN')} - ${end.toLocaleDateString('en-IN')})`;
        } else if (filter === 'monthly') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
            periodText = `This Month (${start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`;
        } else if (filter === 'yearly') {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            dateFilter = { orderDate: { $gte: start, $lte: end } };
            periodText = `This Year (${now.getFullYear()})`;
        } else if (filter === 'custom' && startDate && endDate) {
            const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
            const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            dateFilter = { orderDate: { $gte: start, $lte: end } };
            periodText = `${new Date(startDate).toLocaleDateString('en-IN')} - ${new Date(endDate).toLocaleDateString('en-IN')}`;
        }

        const orderMatch = { ...dateFilter, orderStatus: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] } };

        // Get stats with date filter
        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalOrders = await Order.countDocuments(orderMatch);
        const revenueResult = await Order.aggregate([
            { $match: orderMatch },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        const totalProducts = await Product.countDocuments({ isDeleted: false });

        // Get top products with date filter
        const topProducts = await Order.aggregate([
            { $match: orderMatch },
            { $unwind: '$items' },
            { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.itemTotal' } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
            { $unwind: '$productDetails' }
        ]);

        // Get top categories with date filter
        const topCategories = await Order.aggregate([
            { $match: orderMatch },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productDetails' } },
            { $unwind: '$productDetails' },
            { $group: { _id: '$productDetails.category', totalSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.itemTotal' } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        // Get top brands with date filter
        const topBrands = await Order.aggregate([
            { $match: orderMatch },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productDetails' } },
            { $unwind: '$productDetails' },
            { $group: { _id: '$productDetails.brand', totalSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.itemTotal' } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        // Generate PDF
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=dashboard-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('Horologue Dashboard', { align: 'center' });
        doc.moveDown();

        // Filter info
        doc.fontSize(12).font('Helvetica');
        doc.text(`Period: ${periodText}`, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
        doc.moveDown(2);
        
        // Statistics Section
        doc.fontSize(16).font('Helvetica-Bold').text('Overview Statistics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Total Users: ${totalUsers.toLocaleString('en-IN')}`);
        doc.text(`Total Orders: ${totalOrders.toLocaleString('en-IN')}`);
        doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
        doc.text(`Total Products: ${totalProducts.toLocaleString('en-IN')}`);
        doc.moveDown(2);
        
        // Top 10 Products
        doc.fontSize(16).font('Helvetica-Bold').text('Top 10 Products', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        topProducts.forEach((product, index) => {
            doc.text(`${index + 1}. ${product.productDetails.name} - ₹${product.totalRevenue.toLocaleString('en-IN')} (${product.totalSold} sold)`);
        });
        doc.moveDown(2);
        
        // Top 10 Categories
        doc.fontSize(16).font('Helvetica-Bold').text('Top 10 Categories', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        topCategories.forEach((category, index) => {
            doc.text(`${index + 1}. ${category._id} - ₹${category.totalRevenue.toLocaleString('en-IN')} (${category.totalSold} sold)`);
        });
        doc.moveDown(2);
        
        // Top 10 Brands
        doc.fontSize(16).font('Helvetica-Bold').text('Top 10 Brands', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        topBrands.forEach((brand, index) => {
            doc.text(`${index + 1}. ${brand._id} - ₹${brand.totalRevenue.toLocaleString('en-IN')} (${brand.totalSold} sold)`);
        });
        
        // Footer
        doc.fontSize(8).text(
            'Horologue Admin Dashboard Report',
            50,
            doc.page.height - 50,
            { align: 'center' }
        );
        
        doc.end();
    } catch (error) {
        console.error('Download dashboard PDF error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to download PDF' });
    }
};
