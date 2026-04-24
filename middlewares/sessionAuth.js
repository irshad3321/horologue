import User from '../models/User.js';

// Middleware to sync passport user with session
export const syncUserSession = (req, res, next) => {
    if (req.user && !req.session.userId) {
        // User authenticated via passport but no session data
        req.session.userId = req.user._id;
        req.session.user = {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            isAdmin: req.user.isAdmin
        };
    }
    next();
};

// Middleware to prevent caching of sensitive pages
export const preventCache = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
    });
    next();
};

// Function to validate user status (not blocked)
const validateUserStatus = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user || user.isBlocked) {
            return false;
        }
        return true;
    } catch (error) {
        console.error('User validation error:', error);
        return false;
    }
};

// Check if user is authenticated (either session or passport) and not blocked
export const isAuthenticated = async (req, res, next) => {
    // Apply cache prevention for authenticated pages
    preventCache(req, res, () => {});
    
    if (req.session.userId || req.user) {
        const userId = req.session.userId || req.user._id;
        
        // Validate user status (check if blocked)
        const isValidUser = await validateUserStatus(userId);
        
        if (!isValidUser) {
            // User is blocked or doesn't exist, destroy session and redirect
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.sid');
                res.clearCookie('connect.sid');
                res.redirect('/login?error=account_blocked');
            });
            return;
        }
        
        return next();
    }
    
    // Clear any existing session data
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.clearCookie('horologue.sid');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};

// Check if user is not authenticated - with strict session validation
export const isNotAuthenticated = async (req, res, next) => {
    // Apply cache prevention for login pages
    preventCache(req, res, () => {});
    
    // Check for any existing valid session
    if (req.session.userId || req.user) {
        const userId = req.session.userId || req.user._id;
        
        // Validate user status first
        const isValidUser = await validateUserStatus(userId);
        
        if (!isValidUser) {
            // User is blocked, clear session and allow access to login page
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.sid');
                res.clearCookie('connect.sid');
                next();
            });
            return;
        }
        
        // Valid session exists, redirect based on user type
        if (req.session.user) {
            if (req.session.user.isAdmin || req.user?.isAdmin) {
                return res.redirect('/admin/dashboard');
            }
            return res.redirect('/home');
        } else if (req.user) {
            if (req.user.isAdmin) {
                return res.redirect('/admin/dashboard');
            }
            return res.redirect('/home');
        }
    }
    
    // No valid session, allow access to login page
    next();
};

// Middleware for public pages (like landing) - redirect authenticated users
export const redirectAuthenticatedUsers = async (req, res, next) => {
    // Apply cache prevention
    preventCache(req, res, () => {});
    
    // Check if user is authenticated
    if (req.session.userId || req.user) {
        const userId = req.session.userId || req.user._id;
        
        // Validate user status
        const isValidUser = await validateUserStatus(userId);
        
        if (!isValidUser) {
            // User is blocked, clear session and allow access to public page
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.sid');
                res.clearCookie('connect.sid');
                next();
            });
            return;
        }
        
        // Valid authenticated user, redirect to appropriate dashboard
        if (req.session.user?.isAdmin || req.user?.isAdmin) {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/home');
    }
    
    // No authentication, allow access to public page
    next();
};