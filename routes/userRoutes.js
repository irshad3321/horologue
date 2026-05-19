import express from 'express';
import { 
    showRegister, 
    showLogin, 
    showVerifyOTPRegistration,
    showVerifyOTPForgot,
    showForgotPassword,
    showResetPassword,
    registerUser,
    verifyOTPRegistrationController,
    verifyOTPForgotController,
    resendOTPRegistrationController,
    resendOTPForgotController,
    loginUser,
    logoutUser,
    forgotPasswordController,
    resetPasswordController,
    googleAuth,
    googleCallback
} from '../controllers/user/authController.js';

import {
    updateProfile,
    sendEmailChangeOTP,
    verifyEmailChangeOTP,
    resendEmailChangeOTP,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    sendChangePasswordOTP,
    verifyChangePasswordOTP,
    resendChangePasswordOTP
} from '../controllers/user/profileController.js';

import {
    getAddresses,
    addAddress,
    editAddress,
    removeAddress,
    setDefault
} from '../controllers/user/addressController.js';

import {
    showHome,
    showProfile,
    showEditProfile,
    showLanding,
    showAddresses,
    showChangePassword
} from '../controllers/pageController.js';

import {
    showProducts,
    showProductDetail,
    showWishlist,
    showCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    addToWishlist,
    removeFromWishlist
} from '../controllers/user/productController.js';

import { syncUserSession, isAuthenticated, isNotAuthenticated, preventCache, redirectAuthenticatedUsers, userSessionCheck } from '../middlewares/sessionAuth.js';
import upload, { handleMulterError } from '../config/multer.js';

const router = express.Router();

// Apply session sync middleware to all routes
router.use(syncUserSession);

// Page routes
router.get('/', redirectAuthenticatedUsers, showLanding);
router.get('/home', isAuthenticated, showHome);
router.get('/products', showProducts);
router.get('/collection', showProducts);
router.get('/product/:id', showProductDetail);
router.get('/wishlist', showWishlist);
router.get('/cart', showCart);
router.get('/profile', isAuthenticated, showProfile);
router.get('/edit-profile', isAuthenticated, showEditProfile);
router.get('/addresses', isAuthenticated, showAddresses);
router.get('/password', isAuthenticated, showChangePassword);

// Checkout routes (dummy)
router.get('/checkout', isAuthenticated, async (req, res) => {
    const cart = await import('../service/cartService.js').then(m => m.getUserCart(req.session.userId));
    const addresses = await import('../service/addressService.js').then(m => m.getUserAddresses(req.session.userId));
    
    let subtotal = 0;
    cart.items.forEach(item => {
        const variant = item.product.variants.id(item.variantId);
        let price = variant.price;
        if (item.product.offer > 0) {
            price = price - (price * item.product.offer / 100);
        }
        subtotal += price * item.quantity;
    });
    
    const discount = 0;
    const total = subtotal - discount;
    
    res.render('user/checkout', {
        user: req.session.user,
        cart: cart,
        addresses: addresses,
        subtotal: subtotal,
        discount: discount,
        total: total
    });
});

router.get('/order-success', isAuthenticated, (req, res) => {
    const dummyOrder = {
        _id: '123456',
        orderNumber: 'ORD' + Date.now(),
        orderDate: new Date(),
        totalAmount: 25000,
        paymentMethod: 'COD',
        orderStatus: 'Pending'
    };
    res.render('user/order-success', { order: dummyOrder });
});

// Orders routes (dummy)
router.get('/orders', isAuthenticated, async (req, res) => {
    const cart = await import('../service/cartService.js').then(m => m.getUserCart(req.session.userId));
    
    // Add itemTotal to cart items
    const itemsWithTotal = cart.items.map(item => {
        const variant = item.product.variants.id(item.variantId);
        let price = variant.price;
        if (item.product.offer > 0) {
            price = price - (price * item.product.offer / 100);
        }
        return {
            ...item.toObject(),
            color: variant.color,
            itemTotal: price * item.quantity
        };
    });
    
    const dummyOrders = [
        {
            _id: '1',
            orderNumber: 'ORD1234567890',
            orderDate: new Date(),
            orderStatus: 'Pending',
            items: itemsWithTotal.slice(0, 2),
            totalAmount: itemsWithTotal.slice(0, 2).reduce((sum, item) => sum + item.itemTotal, 0)
        },
        {
            _id: '2',
            orderNumber: 'ORD0987654321',
            orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            orderStatus: 'Delivered',
            items: itemsWithTotal.slice(0, 1),
            totalAmount: itemsWithTotal.slice(0, 1).reduce((sum, item) => sum + item.itemTotal, 0)
        }
    ];
    
    res.render('user/orders', { user: req.session.user, orders: dummyOrders });
});

router.get('/orders/:id', isAuthenticated, async (req, res) => {
    const cart = await import('../service/cartService.js').then(m => m.getUserCart(req.session.userId));
    const addresses = await import('../service/addressService.js').then(m => m.getUserAddresses(req.session.userId));
    
    // Add itemTotal and color to cart items
    const itemsWithTotal = cart.items.map(item => {
        const variant = item.product.variants.id(item.variantId);
        let price = variant.price;
        if (item.product.offer > 0) {
            price = price - (price * item.product.offer / 100);
        }
        return {
            ...item.toObject(),
            color: variant.color,
            price: price,
            itemTotal: price * item.quantity
        };
    });
    
    const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.itemTotal, 0);
    
    const dummyOrder = {
        _id: req.params.id,
        orderNumber: 'ORD1234567890',
        orderDate: new Date(),
        orderStatus: 'Pending',
        items: itemsWithTotal,
        shippingAddress: addresses[0] || {
            fullName: 'John Doe',
            phone: '1234567890',
            addressLine1: '123 Main St',
            addressLine2: 'Apt 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            addressType: 'Home'
        },
        subtotal: subtotal,
        discount: 0,
        shippingCharge: 0,
        totalAmount: subtotal,
        paymentMethod: 'COD',
        deliveryDate: null
    };
    
    res.render('user/order-detail', { user: req.session.user, order: dummyOrder });
});

// Cart API routes
router.post('/api/cart/add', isAuthenticated, addToCart);
router.put('/api/cart/update', isAuthenticated, updateCartQuantity);
router.delete('/api/cart/remove', isAuthenticated, removeFromCart);

// Wishlist API routes
router.post('/api/wishlist/add', isAuthenticated, addToWishlist);
router.delete('/api/wishlist/remove', isAuthenticated, removeFromWishlist);

// Authentication routes
router.get('/register', isNotAuthenticated,showRegister);
router.post('/register', registerUser);
router.get('/login', isNotAuthenticated,showLogin);
router.post('/login', loginUser)
router.get('/logout', logoutUser)
router.get('/verify-otp-registration',showVerifyOTPRegistration)
router.post('/verify-otp-registration',verifyOTPRegistrationController)
router.post('/resend-otp-registration',resendOTPRegistrationController)
router.get('/verify-otp-forgot',showVerifyOTPForgot)
router.post('/verify-otp-forgot',verifyOTPForgotController)
router.post('/resend-otp-forgot',resendOTPForgotController)
router.get('/forgot-password', showForgotPassword)
router.post('/forgot-password',forgotPasswordController)
router.get('/reset-password',showResetPassword)
router.post('/reset-password',resetPasswordController)
router.post('/update-profile',isAuthenticated, updateProfile)
router.post('/send-email-change-otp',isAuthenticated, sendEmailChangeOTP)
router.post('/verify-email-change-otp',isAuthenticated, verifyEmailChangeOTP)
router.post('/resend-email-change-otp',isAuthenticated, resendEmailChangeOTP)

// Avatar routes
router.post('/upload-avatar', isAuthenticated, upload.single('avatar'), uploadAvatar);
router.delete('/delete-avatar', isAuthenticated, deleteAvatar);

// Change password routes
router.post('/change-password', isAuthenticated, changePassword);
router.post('/send-change-password-otp', isAuthenticated, sendChangePasswordOTP);
router.post('/verify-change-password-otp', isAuthenticated, verifyChangePasswordOTP);
router.post('/resend-change-password-otp', isAuthenticated, resendChangePasswordOTP);

// Address routes
router.get('/api/addresses', isAuthenticated, getAddresses);
router.post('/api/addresses', isAuthenticated, addAddress);
router.put('/api/addresses/:id', isAuthenticated, editAddress);
router.delete('/api/addresses/:id', isAuthenticated, removeAddress);
router.patch('/api/addresses/:id/default', isAuthenticated, setDefault);

// Google OAuth routes
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleCallback);


router.get('/api/session-check', userSessionCheck);


export default router;