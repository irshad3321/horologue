// Authentication middleware
export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.redirect('/login');
};

// Redirect if already logged in
export const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/home');
    }
    next();
};