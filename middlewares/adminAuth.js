// Import cache prevention middleware
import { preventCache } from './sessionAuth.js';
import User from '../models/User.js';

export const isAdmin = async (req, res, next) => {
    // Apply cache prevention for admin pages
    preventCache(req, res, () => {});
    
    if (!req.session.userId || !req.session.user || !req.session.user.isAdmin) {
        // Clear invalid session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.clearCookie('horologue.sid');
            res.clearCookie('connect.sid');
            res.redirect('/admin/login');
        });
        return;
    }
    
    try {
        // Validate admin status and check if blocked
        const user = await User.findById(req.session.userId);
        
        if (!user || user.isBlocked || !user.isAdmin) {
            // Admin is blocked, no longer admin, or doesn't exist
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.sid');
                res.clearCookie('connect.sid');
                res.redirect('/admin/login?error=access_revoked');
            });
            return;
        }
        
        next();
    } catch (error) {
        console.error('Admin validation error:', error);
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.clearCookie('horologue.sid');
            res.clearCookie('connect.sid');
            res.redirect('/admin/login?error=validation_error');
        });
    }
};

// Middleware specifically for admin login page
export const isNotAuthenticatedAdmin = async (req, res, next) => {
    // Apply cache prevention
    preventCache(req, res, () => {});
    
    // Check if user is already authenticated as admin
    if ((req.session.userId && req.session.user?.isAdmin) || (req.user?.isAdmin)) {
        const userId = req.session.userId || req.user._id;
        
        try {
            // Validate admin status
            const user = await User.findById(userId);
            
            if (user && !user.isBlocked && user.isAdmin) {
                return res.redirect('/admin/dashboard');
            } else {
                // Admin is blocked or no longer admin, clear session
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
        } catch (error) {
            console.error('Admin validation error:', error);
            // Clear session on error
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
    }
    
    // Check if user is authenticated but not admin
    if (req.session.userId || req.user) {
        const userId = req.session.userId || req.user._id;
        
        try {
            const user = await User.findById(userId);
            
            if (user && !user.isBlocked && !user.isAdmin) {
                return res.redirect('/home');
            } else {
                // User is blocked or doesn't exist, clear session
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
        } catch (error) {
            console.error('User validation error:', error);
            next();
        }
    }
    
    next();
};