export const isAdmin = (req, res, next) => {
    if (!req.session.userId || !req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/admin/login');
    }
    next();
};