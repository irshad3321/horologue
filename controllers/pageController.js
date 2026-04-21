// Page Controller - Handles page rendering logic

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

// Show profile page
export const showProfile = (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    res.render('user/profile', {
        user: req.session.user
    });
};

// Show edit profile page
export const showEditProfile = (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    res.render('user/edit-profile', {
        user: req.session.user
    });
};

// Show landing page
export const showLanding = (req, res) => {
    res.render('user/landing');
};

// Handle 404 errors
export const show404 = (req, res) => {
    res.status(404).render('error/404');
};