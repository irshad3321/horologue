import { getUserById } from '../service/userService.js';
import { getUserAddresses } from '../service/addressService.js';
import { getProducts } from '../service/productService.js';
import { getCartCount } from '../service/cartService.js';
import { getWishlistCount } from '../service/wishlistService.js';

// Show home page
export const showHome = async (req, res) => {
    // Check if user is logged in (prioritize USER session for user pages)
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Check for login success message
    const loginSuccess = req.session.loginSuccess;
    delete req.session.loginSuccess; 
    
    // Get featured products (active products, limit 8)
    const result = await getProducts({
        status: 'active',
        limit: 8,
        sort: 'newest',
        hideInactiveCategories: true
    });
    
    const products = result.products;
    
    // Get cart and wishlist counts
    const cartCount = await getCartCount(req.session.userId);
    const wishlistCount = await getWishlistCount(req.session.userId);
    
    res.render('user/home', { 
        user: req.session.user,
        loginSuccess: loginSuccess || null,
        products: products,
        cartCount: cartCount,
        wishlistCount: wishlistCount
    });
};

// Show landing page
export const showLanding = async (req, res) => {
    // Get featured products (active products, limit 8)
    const result = await getProducts({
        status: 'active',
        limit: 8,
        sort: 'newest',
        hideInactiveCategories: true
    });
    
    const products = result.products;
    
    res.render('user/landing', {
        products: products
    });
};

// Update showProfile function
export const showProfile = async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Get fresh user data
    const user = await getUserById(req.session.userId);
    if (user) {
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            googleId: user.googleId  // Include googleId for checking
        };
    }
    
    // Get cart and wishlist counts
    const cartCount = await getCartCount(req.session.userId);
    const wishlistCount = await getWishlistCount(req.session.userId);
    
    res.render('user/profile', {
        user: req.session.user,
        currentPage: 'profile',
        cartCount: cartCount,
        wishlistCount: wishlistCount
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
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            googleId: user.googleId  // Include googleId for checking
        };
    }
    
    // Get cart and wishlist counts
    const cartCount = await getCartCount(req.session.userId);
    const wishlistCount = await getWishlistCount(req.session.userId);
    
    res.render('user/edit-profile', {
        user: req.session.user,
        currentPage: 'edit-profile',
        cartCount: cartCount,
        wishlistCount: wishlistCount,
        isGoogleUser: !!req.session.user?.googleId  // Pass to view based on googleId
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
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            googleId: user.googleId  // Include googleId for checking
        };
    }
    
    // Get user addresses
    const addresses = await getUserAddresses(req.session.userId);
    
    // Get cart and wishlist counts
    const cartCount = await getCartCount(req.session.userId);
    const wishlistCount = await getWishlistCount(req.session.userId);
    
    res.render('user/addresses', {
        user: req.session.user,
        addresses: addresses,
        currentPage: 'addresses',
        cartCount: cartCount,
        wishlistCount: wishlistCount
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
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            googleId: user.googleId  // Include googleId for checking
        };
    }
    
    // Get cart and wishlist counts
    const cartCount = await getCartCount(req.session.userId);
    const wishlistCount = await getWishlistCount(req.session.userId);
    
    res.render('user/change-password', {
        user: req.session.user,
        currentPage: 'password',
        cartCount: cartCount,
        wishlistCount: wishlistCount
    });
};

// Show about page
export const showAbout = async (req, res) => {
    try {
        // Get cart and wishlist counts if user is logged in
        let cartCount = 0;
        let wishlistCount = 0;
        
        if (req.session.userId) {
            cartCount = await getCartCount(req.session.userId);
            wishlistCount = await getWishlistCount(req.session.userId);
        }
        
        res.render('user/about', {
            user: req.session.user || null,
            cartCount: cartCount,
            wishlistCount: wishlistCount
        });
    } catch (error) {
        console.error('Show about error:', error);
        res.status(500).render('error/500');
    }
};

// Show contact page
export const showContact = async (req, res) => {
    try {
        // Get cart and wishlist counts if user is logged in
        let cartCount = 0;
        let wishlistCount = 0;
        
        if (req.session.userId) {
            cartCount = await getCartCount(req.session.userId);
            wishlistCount = await getWishlistCount(req.session.userId);
        }
        
        res.render('user/contact', {
            user: req.session.user || null,
            cartCount: cartCount,
            wishlistCount: wishlistCount
        });
    } catch (error) {
        console.error('Show contact error:', error);
        res.status(500).render('error/500');
    }
};

// Handle 404 errors
export const show404 = (req, res) => {
    res.status(404).render('error/404');
};
