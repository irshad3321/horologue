// Import cache prevention middleware
import { preventCache } from './sessionAuth.js';
import User from '../models/User.js';

export const isAdmin = async (req, res, next) => {
    // Apply cache prevention for admin pages
    preventCache(req, res, () => {});
    
    if (!req.session.userId || !req.session.user || !req.session.user.isAdmin) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.clearCookie('horologue.admin.sid');
            res.redirect('/admin/login');
        });
        return;
    }
    
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user || user.isBlocked || !user.isAdmin) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.admin.sid');
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
            res.clearCookie('horologue.admin.sid');
            res.redirect('/admin/login?error=validation_error');
        });
    }
};

// Middleware specifically for admin login page
export const isNotAuthenticatedAdmin = async (req, res, next) => {
    preventCache(req, res, () => {});
    
    if (req.session.userId && req.session.user?.isAdmin) {
        try {
            const user = await User.findById(req.session.userId);
            
            if (user && !user.isBlocked && user.isAdmin) {
                return res.redirect('/admin/dashboard');
            } else {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error:', err);
                    }
                    res.clearCookie('horologue.admin.sid');
                    next();
                });
            }
        } catch (error) {
            console.error('Admin validation error:', error);
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }
                res.clearCookie('horologue.admin.sid');
                next();
            });
        }
        return;
    }   
    
    // Allow access to admin login page
    next();
};

export const adminSessionCheck = async (req, res) => {
    if (req.session.userId && req.session.user && req.session.user.isAdmin) {
        try {
            const { default: User } = await import('../models/User.js');
            const user = await User.findById(req.session.userId);
            
            if (!user || user.isBlocked || !user.isAdmin) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error:', err);
                    }
                    res.clearCookie('horologue.admin.sid');
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
};

// Admin login error handling middleware
export const handleAdminLoginErrors = (req, res, next) => {
    let error = null;
    
    if (req.query.error === 'access_revoked') {
        error = 'Your admin access has been revoked. Please contact the system administrator.';
    } else if (req.query.error === 'validation_error') {
        error = 'Session validation failed. Please try logging in again.';
    }
    
    req.adminLoginError = error;
    next();
};