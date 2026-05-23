import * as productService from '../../service/productService.js';
import * as categoryService from '../../service/categoryService.js';
import * as cartService from '../../service/cartService.js';
import * as wishlistService from '../../service/wishlistService.js';

// Show products listing page
export const showProducts = async (req, res) => {
    try {
        const search = req.query.search;
        const category = req.query.category;
        const brand = req.query.brand;
        const priceRange = req.query.priceRange;
        const sort = req.query.sort;
        const page = req.query.page || 1;
        const filters = {
            search: search,
            category: category,
            brand: brand,
            sort: sort || 'newest',
            page: page,
            limit: 8,
            status: 'active',
            hideInactiveCategories: true 
        };
        if (priceRange) {
            if (priceRange === '50000+') {
                filters.minPrice = 50000;
            } else {
                const prices = priceRange.split('-');
                filters.minPrice = parseInt(prices[0]);
                filters.maxPrice = parseInt(prices[1]);
            }
        }
        
        // Get products from database
        const result = await productService.getProducts(filters);
        const categoriesResult = await categoryService.getCategories({ 
            status: 'active', 
            limit: 100 
        });
        
        // Get all brands
        const brands = await productService.getAllBrands();
        
        // Get user's wishlist
        let wishlistProductIds = [];
        if (req.session.userId) {
            const wishlist = await wishlistService.getUserWishlist(req.session.userId);
            wishlistProductIds = wishlist.items.map(item => {
                // Handle both populated and non-populated product references
                const productId = item.product._id || item.product;
                return productId.toString();
            });
        }
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.render('user/products', {
            user: req.session.user || null,
            products: result.products,
            categories: categoriesResult.categories,
            brands: brands,
            search: search || '',
            category: category || '',
            brand: brand || '',
            priceRange: priceRange || '',
            sort: sort || 'newest',
            currentPage: result.page,
            totalPages: result.totalPages,
            total: result.total,
            wishlistProductIds: wishlistProductIds
        });
    } catch (error) {
        res.status(500).render('error/500');
    }
};

// Show single prodduct detail page
export const showProductDetail = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(404).render('error/404');
        }
        
        if (product.status !== 'active') {
            return res.status(404).render('error/404');
        }
        
        // Check if product is in wishlist
        let isInWishlist = false;
        if (req.session.userId) {
            isInWishlist = await wishlistService.isInWishlist(req.session.userId, productId);
        }
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.render('user/product-detail', {
            user: req.session.user || null,
            product: product,
            isInWishlist: isInWishlist
        });
    } catch (error) {
        res.status(500).render('error/500');
    }
};

// Show wishlist page
export const showWishlist = async (req, res) => {
    try {
        let wishlist = { items: [] };
        
        if (req.session.userId) {
            wishlist = await wishlistService.getUserWishlist(req.session.userId);
        }
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.render('user/wishlist', {
            user: req.session.user || null,
            wishlist: wishlist
        });
    } catch (error) {
        res.status(500).render('error/500');
    }
};

// Show cart page
export const showCart = async (req, res) => {
    try {
        let cart = { items: [] };
        
        if (req.session.userId) {
            cart = await cartService.getUserCart(req.session.userId);
        }
         
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.render('user/cart', {
            user: req.session.user || null,
            cart: cart
        });
    } catch (error) {
        res.status(500).render('error/500');
    }
};

// Add to cart
export const addToCart = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to add items to cart'
            });
        }
        
        const productId = req.body.productId;
        const variantId = req.body.variantId;
        const quantity = parseInt(req.body.quantity) || 1;
        const cart = await cartService.addToCart(
            req.session.userId,
            productId,
            variantId,
            quantity
        );
        
        await wishlistService.removeFromWishlist(req.session.userId, productId);
        
        res.json({
            success: true,
            message: 'Product added to cart',
            cartCount: cart.items.length
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}



// Update cart quanti
export const updateCartQuantity = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login'
            });
        }
        const productId = req.body.productId;
        const variantId = req.body.variantId;
        const quantity = parseInt(req.body.quantity);
        
        const cart = await cartService.updateCartQuantity(
            req.session.userId,
            productId,
            variantId,
            quantity
        )
        
        res.json({
            success: true,
            message: 'Cart updated'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Remove from cartt
export const removeFromCart = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login'
            });
        }
        
        const productId = req.body.productId;
        const variantId = req.body.variantId;
        
        const cart = await cartService.removeFromCart(
            req.session.userId,
            productId,
            variantId
        );
        
        res.json({
            success: true,
            message: 'Product removed from cart',
            cartCount: cart.items.length
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Clear entire cart
export const clearCart = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login'
            });
        }
        
        await cartService.clearCart(req.session.userId);
        
        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Add to wishlis
export const addToWishlist = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to add items to wishlist'
            });
        }
        
        const productId = req.body.productId;
        
        const wishlist = await wishlistService.addToWishlist(
            req.session.userId,
            productId
        );
        
        res.json({
            success: true,
            message: 'Product added to wishlist',
            wishlistCount: wishlist.items.length
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Remove from wishlist API
export const removeFromWishlist = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login'
            });
        }
        
        const productId = req.body.productId;
        const variantId = req.body.variantId;
        
        const wishlist = await wishlistService.removeFromWishlist(
            req.session.userId,
            productId,
            variantId
        );
        
        res.json({
            success: true,
            message: 'Product removed from wishlist',
            wishlistCount: wishlist ? wishlist.items.length : 0
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Clear entire wishlist
export const clearWishlist = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login'
            });
        }
        
        await wishlistService.clearWishlist(req.session.userId);
        
        res.json({
            success: true,
            message: 'Wishlist cleared successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
