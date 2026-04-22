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

// Check if user is authenticated (either session or passport)
export const isAuthenticated = (req, res, next) => {
    if (req.session.userId || req.user) {
        return next();
    }
    res.redirect('/login');
};

// Check if user is not authenticated
export const isNotAuthenticated = (req, res, next) => {
    if (!req.session.userId && !req.user) {
        return next();
    }
    
    // Redirect based on user type
    if (req.session.user?.isAdmin || req.user?.isAdmin) {
        return res.redirect('/admin/dashboard');
    }
    res.redirect('/home');
};