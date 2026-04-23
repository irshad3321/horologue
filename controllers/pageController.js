// Add import at the top
import { getUserById } from '../service/userService.js';

// Show home page
export const showHome = (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Check for login success message
    const loginSuccess = req.session.loginSuccess;
    delete req.session.loginSuccess; // Clear it after reading
    
    res.render('user/home', { 
        user: req.session.user,
        loginSuccess: loginSuccess || null
    });
};

// Show landing page
export const showLanding = (req, res) => {
    res.render('user/landing');
};

// Update showProfile function
export const showProfile = async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Get fresh user data
    const user = await getUserById(req.session.userId);
    if (user) {
        req.session.user = user;
    }
    
    res.render('user/profile', {
        user: req.session.user,
        currentPage: 'profile'
    });
};

// Update showEditProfile function
export const showEditProfile = async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Get fresh user data
    const user = await getUserById(req.session.userId);
    if (user) {
        req.session.user = user;
    }
    
    res.render('user/edit-profile', {
        user: req.session.user,
        currentPage: 'edit-profile'
    });
};

// Update showAddresses function
export const showAddresses = async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Get fresh user data
    const user = await getUserById(req.session.userId);
    if (user) {
        req.session.user = user;
    }
    
    res.render('user/addresses', {
        user: req.session.user,
        currentPage: 'addresses'
    });
};

// Update showChangePassword function
export const showChangePassword = async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Get fresh user data
    const user = await getUserById(req.session.userId);
    if (user) {
        req.session.user = user;
    }
    
    res.render('user/change-password', {
        user: req.session.user,
        currentPage: 'password'
    });
};

// Handle 404 errors
export const show404 = (req, res) => {
    res.status(404).render('error/404');
};
