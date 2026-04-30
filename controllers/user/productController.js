import * as productService from '../../service/productService.js';
import * as categoryService from '../../service/categoryService.js';

// Show products listing page
export const showProducts = async (req, res) => {
    try {
        // Get filter values from URL query parameters
        const search = req.query.search;
        const category = req.query.category;
        const priceRange = req.query.priceRange;
        const sort = req.query.sort;
        const page = req.query.page || 1;
        
        // Build filters object
        const filters = {
            search: search,
            category: category,
            sort: sort || 'newest',
            page: page,
            limit: 12,
            status: 'active'
        };
        
        // Handle price range filter
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
        
        // Get all active categories
        const categoriesResult = await categoryService.getCategories({ 
            status: 'active', 
            limit: 100 
        });
        
        // Render products page
        res.render('user/products', {
            user: req.session.user || null,
            products: result.products,
            categories: categoriesResult.categories,
            search: search || '',
            category: category || '',
            priceRange: priceRange || '',
            sort: sort || 'newest',
            currentPage: result.page,
            totalPages: result.totalPages,
            total: result.total
        });
    } catch (error) {
        res.status(500).render('error/500');
    }
};

// Show single product detail page
export const showProductDetail = async (req, res) => {
    try {
        // Get product ID from URL
        const productId = req.params.id;
        
        // Get product from database
        const product = await productService.getProductById(productId);
        
        // Check if product exists and is active
        if (!product) {
            return res.status(404).render('error/404');
        }
        
        if (product.status !== 'active') {
            return res.status(404).render('error/404');
        }
        
        // Render product detail page
        res.render('user/product-detail', {
            user: req.session.user || null,
            product: product
        });
    } catch (error) {
        res.status(500).render('error/500');
    }
};

// Show wishlist page
export const showWishlist = (req, res) => {
    res.render('user/wishlist', {
        user: req.session.user || null
    });
};

// Show cart page
export const showCart = (req, res) => {
    res.render('user/cart', {
        user: req.session.user || null
    });
};
