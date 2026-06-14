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
            hideInactiveCategories: false 
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
                const productId = item.product._id || item.product;
                return productId.toString();
            });
        }
        
        // Get cart and wishlist counts
        let cartCount = 0;
        let wishlistCount = 0;
        if (req.session.userId) {
            cartCount = await cartService.getCartCount(req.session.userId);
            wishlistCount = await wishlistService.getWishlistCount(req.session.userId);
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
            wishlistProductIds: wishlistProductIds,
            cartCount: cartCount,
            wishlistCount: wishlistCount
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

        let isUnavailable = false;
        let unavailableReason = '';
        
        if (product.status !== 'active') {
            isUnavailable = true;
            unavailableReason = 'This product is currently unavailable';
        } else if (product.category) {
            try {
                const Category = (await import('../../models/Category.js')).default;
                const category = await Category.findOne({ name: product.category, isDeleted: false });
                if (category && category.status !== 'active') {
                    isUnavailable = true;
                    unavailableReason = 'This product category is currently unavailable';
                }
            } catch (categoryError) {
                console.error('Category check error:', categoryError);
                
            }
        }
        
        // Get user's wishlist items with variant info
        let wishlistVariants = [];
        if (req.session.userId) {
            const wishlist = await wishlistService.getUserWishlist(req.session.userId);
            wishlistVariants = wishlist.items.map(item => ({
                productId: (item.product._id || item.product).toString(),
                variantId: item.variantId ? item.variantId.toString() : null
            }));
        }
        
        // Get related products from same category
        const relatedProducts = await productService.getRelatedProducts(productId, product.category, 4)
        let wishlistProductIds = [];
        if (req.session.userId) {
            const wishlist = await wishlistService.getUserWishlist(req.session.userId);
            wishlistProductIds = wishlist.items.map(item => {
                const productId = item.product._id || item.product;
                return productId.toString();
            });
        }
        
        let cartCount = 0;
        let wishlistCount = 0;
        if (req.session.userId) {
            cartCount = await cartService.getCartCount(req.session.userId);
            wishlistCount = await wishlistService.getWishlistCount(req.session.userId);
        }
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.render('user/product-detail', {
            user: req.session.user || null,
            product: product,
            wishlistVariants: wishlistVariants,
            relatedProducts: relatedProducts,
            wishlistProductIds: wishlistProductIds,
            cartCount: cartCount,
            wishlistCount: wishlistCount,
            isUnavailable: isUnavailable,
            unavailableReason: unavailableReason
        });
    } catch (error) {
        console.error('Show product detail error:', error);
        res.status(500).render('error/500');
    }
};

// Show wishlist page
export const showWishlist = async (req, res) => {
    try {
        let wishlist = { items: [] };
        let cartCount = 0;
        let wishlistCount = 0;
        
        if (req.session.userId) {
            wishlist = await wishlistService.getUserWishlist(req.session.userId);
            cartCount = await cartService.getCartCount(req.session.userId);
            wishlistCount = await wishlistService.getWishlistCount(req.session.userId);
        }
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.render('user/wishlist', {
            user: req.session.user || null,
            wishlist: wishlist,
            cartCount: cartCount,
            wishlistCount: wishlistCount
        });
    } catch (error) {
        res.status(500).render('error/500');
    }
};

// Show cart page
export const showCart = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        
        let cart = { items: [], allItems: [], page: 1, totalPages: 0, total: 0 };
        let cartCount = 0;
        let wishlistCount = 0;
        
        const cartIdentifier = req.session.userId || req.sessionID;
        
        cart = await cartService.getUserCart(cartIdentifier, page, limit);
        cartCount = await cartService.getCartCount(cartIdentifier);
        
        if (req.session.userId) {
            wishlistCount = await wishlistService.getWishlistCount(req.session.userId);
        }
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.render('user/cart', {
            user: req.session.user || null,
            cart: cart,
            currentPage: cart.page,
            totalPages: cart.totalPages,
            totalItems: cart.total,
            cartCount: cartCount,
            wishlistCount: wishlistCount
        });
    } catch (error) {
        console.error('Show cart error:', error);
        res.status(500).render('error/500');
    }
};

// Add to cart
export const addToCart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const variantId = req.body.variantId;
        const quantity = parseInt(req.body.quantity) || 1;
        
        const cartIdentifier = req.session.userId || req.sessionID;
        
       
        
        const cart = await cartService.addToCart(
            cartIdentifier,
            productId,
            variantId,
            quantity
        );
        
        if (req.session.userId) {
            await wishlistService.removeFromWishlist(req.session.userId, productId);
        }
        
        res.json({
            success: true,
            message: 'Product added to cart',
            cartCount: cart.items.length
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}



// Update cart quanti
export const updateCartQuantity = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        
        const cartIdentifier = req.session.userId || req.sessionID;
        
        await cartService.updateCartQuantity(
            cartIdentifier,
            productId,
            variantId,
            parseInt(quantity)
        );
        
        res.json({
            success: true,
            message: 'Cart updated'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}
// Remove from cartt
export const removeFromCart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const variantId = req.body.variantId;
    
        const cartIdentifier = req.session.userId || req.sessionID;
        
        const cart = await cartService.removeFromCart(
            cartIdentifier,
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
        // Use userId if logged in, otherwise use session ID for guest cart
        const cartIdentifier = req.session.userId || req.sessionID;
        
        await cartService.clearCart(cartIdentifier);
        
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
