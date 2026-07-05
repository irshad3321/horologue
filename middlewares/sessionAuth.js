import { HTTP_STATUS } from '../helper/constants.js';
import User from '../models/User.js';

// Middleware to sync passport user with session
export const syncUserSession = (req, res, next) => {
    if (req.user && !req.session.userId) {
        
        
        if (req.session.user && req.session.user.id !== req.user._id.toString()) {
            delete req.session.userId;
            delete req.session.user;
        }
        
        // Set fresh session data from passport user
        req.session.userId = req.user._id;
        req.session.user = {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            phone: req.user.phone,
            profileImage: req.user.profileImage,
            isAdmin: req.user.isAdmin,
            createdAt: req.user.createdAt,
            isGoogleUser: !!req.user.googleId 
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

// Function to validate user status 
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
    preventCache(req, res, () => {});
    
    if (req.session.userId || req.user) {
        const userId = req.session.userId || req.user._id;
        
        const isValidUser = await validateUserStatus(userId);
        
        if (!isValidUser) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.user.sid');
                res.redirect('/login?error=account_blocked');
            });
            return;
        }
        
        return next();
    }
    
    // Save the URL user was trying to access
    req.session.redirectTo = req.originalUrl;
    
    // No user session, redirect to login
    res.redirect('/login');
};

export const redirectAuthenticatedUsers = async (req, res, next) => {
    preventCache(req, res, () => {})
    if (req.session.userId || req.user) {
        const userId = req.session.userId || req.user._id;
        const isValidUser = await validateUserStatus(userId);
        
        if (!isValidUser) {
            req.session.destroy((err) =>{
                if (err){
                 console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.user.sid');
                next()
            })
            return
        }
        
        // Valid authenticated user, redirect to user home
        return res.redirect('/home');
    }
    
    // No authentication, allow access to public page
    next();
};

export const userSessionCheck = async (req, res) => {
    if (req.session.userId || req.user) {
        const userId = req.session.userId || req.user._id;
        
        try {
            const user = await User.findById(userId);
            
            if (!user || user.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error:', err);
                    }
                    res.clearCookie('horologue.user.sid');
                    res.status(HTTP_STATUS.UNAUTHORIZED).json({ authenticated: false, reason: 'account_blocked' });
                });
                return;
            }
            
            res.json({ authenticated: true });
        } catch (error) {
            console.error('Session check error:', error);
            res.status(HTTP_STATUS.UNAUTHORIZED).json({ authenticated: false, reason: 'validation_error' });
        }
    } else {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ authenticated: false, reason: 'no_session' });
    }
};
