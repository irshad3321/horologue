import express from 'express';
import { getUsers, toggleUserStatus, showDashboard, getDashboardStats, getSalesChartData, getTopProducts, getTopCategories, getTopBrands, showSalesReport, getSalesReportData, downloadSalesReport, downloadDashboardPDF } from '../controllers/admin/adminController.js';
import { 
    adminLogin, 
    adminLogout, 
    adminForgotPassword, 
    adminVerifyOTPForgot, 
    adminResetPassword, 
    adminResendOTPForgot 
} from '../controllers/admin/adminController.js'
import { getLatestOTPCreationTime } from '../service/otpService.js';
import { isAdmin, isNotAuthenticatedAdmin, adminSessionCheck, handleAdminLoginErrors } from '../middlewares/adminAuth.js';
import * as categoryController from '../controllers/admin/categoryController.js';
import * as productController from '../controllers/admin/productController.js';
import * as orderController from '../controllers/admin/orderController.js';
import * as couponController from '../controllers/admin/couponController.js';
import upload from '../config/multer.js';
const router = express.Router();

router.get('/login', isNotAuthenticatedAdmin, handleAdminLoginErrors, (req, res) => {
    res.render('admin/login', { error: req.adminLoginError, success: null });
});

// Admin login POST route
router.post('/login', adminLogin)

// Admin forgot password page - prevent access if already logged in
router.get('/forgot-password', isNotAuthenticatedAdmin, (req, res) => {
    res.render('admin/forgot-password', { error: null, success: null })
});

// Admin forgot password POST
router.post('/forgot-password', adminForgotPassword)

// Admin verify OTP page - prevent access if already logged in
router.get('/verify-otp-forgot', isNotAuthenticatedAdmin, async (req, res) => {
    const email = req.session.resetEmail || '';
    const otpCreatedAt = email ? await getLatestOTPCreationTime(email, 'admin-forgot-password') : null;
    
    res.render('admin/verify-otp-forgot', { 
        error: null, 
        success: null,
        email,
        otpCreatedAt,
        resendTimerStart: req.session.adminResetResendTimerStart
    })
})

// Admin verify OTP POST route
router.post('/verify-otp-forgot', adminVerifyOTPForgot);

// Admin reset password page - prevent access if already logged in
router.get('/reset-password', isNotAuthenticatedAdmin, (req, res) => {
    res.render('admin/reset-password', { 
        error: null, 
        success: null,
        email: req.session.resetEmail || ''
    })
})

// Admin reset password 
router.post('/reset-password', adminResetPassword);
router.post('/resend-otp-forgot', adminResendOTPForgot);

// Admin dashboard - protected route
router.get('/dashboard', isAdmin, showDashboard);

// Dashboard API routes
router.get('/api/dashboard/stats', isAdmin, getDashboardStats);
router.get('/api/dashboard/sales-chart', isAdmin, getSalesChartData);
router.get('/api/dashboard/top-products', isAdmin, getTopProducts);
router.get('/api/dashboard/top-categories', isAdmin, getTopCategories);
router.get('/api/dashboard/top-brands', isAdmin, getTopBrands);
router.get('/api/dashboard/download-pdf', isAdmin, downloadDashboardPDF);

// Admin users page - protected route
router.get('/users', isAdmin, getUsers);

// Category Routes
router.get('/category', isAdmin, categoryController.getCategoriesPage);
router.post('/category', isAdmin, categoryController.createCategory);
router.get('/category/:categoryId', isAdmin, categoryController.getCategoryById);
router.put('/category/:categoryId', isAdmin, categoryController.updateCategory);
router.delete('/category/:categoryId', isAdmin, categoryController.deleteCategory);
router.patch('/category/:categoryId/toggle-status', isAdmin, categoryController.toggleCategoryStatus);

// Product Routes
router.get('/products', isAdmin, productController.getProductsPage);
router.get('/products/:productId', isAdmin, productController.getProductById);
router.get('/add-product', isAdmin, productController.getAddProductPage);
router.get('/edit-product/:productId', isAdmin, productController.getEditProductPage);
router.post('/products', isAdmin, productController.createProduct);
router.put('/products/:productId', isAdmin, productController.updateProduct);
router.delete('/products/:productId', isAdmin, productController.deleteProduct);
router.patch('/products/:productId/toggle-status', isAdmin, productController.toggleProductStatus);

// Image upload routes
router.post('/products/upload-image', isAdmin, upload.single('image'), productController.uploadVariantImage);
router.delete('/products/delete-image', isAdmin, productController.deleteVariantImage);

// Admin logout
router.get('/logout', adminLogout);

// Toggle user status - protected route
router.post('/users/toggle-status/:userId', isAdmin, toggleUserStatus);

// Orders routes
router.get('/orders', isAdmin, orderController.showOrders);
router.get('/orders/:id', isAdmin, orderController.showOrderDetail);
router.patch('/api/orders/:id/status', isAdmin, orderController.updateOrderStatus);

// Inventory routes
router.get('/inventory', isAdmin, productController.showInventory);
router.post('/inventory/update', isAdmin, productController.updateStock);

// Coupon routes
router.get('/coupons', isAdmin, couponController.showCoupons);
router.get('/api/coupons', isAdmin, couponController.getAllCoupons);
router.get('/api/coupons/:id', isAdmin, couponController.getCouponById);
router.post('/api/coupons', isAdmin, couponController.createCoupon);
router.put('/api/coupons/:id', isAdmin, couponController.updateCoupon);
router.patch('/api/coupons/:id/toggle', isAdmin, couponController.toggleCouponStatus);
router.delete('/api/coupons/:id', isAdmin, couponController.deleteCoupon);

// Sales Report routes
router.get('/sales-report', isAdmin, showSalesReport);
router.get('/api/sales-report', isAdmin, getSalesReportData);
router.get('/api/sales-report/download', isAdmin, downloadSalesReport);

router.get('/api/session-check', adminSessionCheck);


export default router;
