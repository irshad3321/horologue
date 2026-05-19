import express from 'express';
import { getUsers, toggleUserStatus } from '../controllers/admin/adminController.js';
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
router.get('/dashboard', isAdmin, (req, res) => {
    res.render('admin/dashboard', { 
        admin: req.session.user,
        currentPage: 'dashboard'
    })
})

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

// Orders routes (dummy)
router.get('/orders', isAdmin, async (req, res) => {
    const User = (await import('../models/User.js')).default;
    const Product = (await import('../models/Product.js')).default;
    
    const users = await User.find().limit(2);
    const products = await Product.find().populate('variants').limit(2);
    
    const dummyOrders = users.map((user, idx) => ({
        _id: `order${idx + 1}`,
        orderNumber: `ORD${Date.now() + idx}`,
        orderDate: new Date(Date.now() - idx * 24 * 60 * 60 * 1000),
        orderStatus: idx === 0 ? 'Pending' : 'Delivered',
        userId: user,
        items: products.slice(0, 1).map(p => ({
            product: p,
            variantId: p.variants[0]._id,
            color: p.variants[0].color,
            price: p.variants[0].price,
            quantity: 1,
            itemTotal: p.variants[0].price
        })),
        totalAmount: products[0]?.variants[0]?.price || 25000
    }));
    
    res.render('admin/orders', {
        admin: req.session.user,
        orders: dummyOrders,
        search: req.query.search || '',
        status: req.query.status || '',
        sort: req.query.sort || 'newest',
        currentPage: 1,
        totalPages: 1
    });
});

router.get('/orders/:id', isAdmin, async (req, res) => {
    const User = (await import('../models/User.js')).default;
    const Product = (await import('../models/Product.js')).default;
    
    const user = await User.findOne();
    const products = await Product.find().populate('variants').limit(2);
    
    const dummyOrder = {
        _id: req.params.id,
        orderNumber: 'ORD1234567890',
        orderDate: new Date(),
        orderStatus: 'Pending',
        userId: user,
        items: products.map(p => ({
            product: p,
            variantId: p.variants[0]._id,
            color: p.variants[0].color,
            price: p.variants[0].price,
            quantity: 1,
            itemTotal: p.variants[0].price
        })),
        shippingAddress: {
            fullName: user.firstName + ' ' + user.lastName,
            phone: user.phone || '1234567890',
            addressLine1: '123 Main St',
            addressLine2: 'Apt 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
        },
        subtotal: products.reduce((sum, p) => sum + p.variants[0].price, 0),
        discount: 0,
        shippingCharge: 0,
        totalAmount: products.reduce((sum, p) => sum + p.variants[0].price, 0),
        paymentMethod: 'COD',
        paymentStatus: 'Pending'
    };
    
    res.render('admin/order-detail', {
        admin: req.session.user,
        order: dummyOrder
    });
});

// Inventory routes (dummy)
router.get('/inventory', isAdmin, async (req, res) => {
    const Product = (await import('../models/Product.js')).default;
    const Category = (await import('../models/Category.js')).default;
    
    const products = await Product.find().populate('variants');
    const categories = await Category.find({ isDeleted: false });
    
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    products.forEach(p => {
        p.variants.forEach(v => {
            if (v.stock === 0) outOfStockCount++;
            else if (v.stock < 10) lowStockCount++;
        });
    });
    
    res.render('admin/inventory', {
        admin: req.session.user,
        products: products,
        categories: categories,
        totalProducts: products.length,
        lowStockCount: lowStockCount,
        outOfStockCount: outOfStockCount,
        search: req.query.search || '',
        stockStatus: req.query.stockStatus || '',
        category: req.query.category || ''
    });
});

router.get('/api/session-check', adminSessionCheck);


export default router;
