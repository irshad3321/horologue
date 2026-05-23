import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

// Get user wishlist with product details
export async function getUserWishlist(userId) {
    const wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');
    
    if (!wishlist) {
        return { items: [] };
    }
    
    return wishlist;
}

// Add product to wishlist
export async function addToWishlist(userId, productId) {
    // Check if product exists and is active
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    if (product.status !== 'active' || product.isDeleted) {
        throw new Error('Product is not available');
    }
    
    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: userId });
    
    if (!wishlist) {
        wishlist = new Wishlist({ user: userId, items: [] });
    }
    
    // Check if product already in wishlist
    const existingItem = wishlist.items.find(
        item => item.product.toString() === productId
    );
    
    if (existingItem) {
        throw new Error('Product already in wishlist');
    }
    
    // Add new item
    wishlist.items.push({ product: productId });
    
    await wishlist.save();
    return wishlist;
}

// Remove product from wishlist
export async function removeFromWishlist(userId, productId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    
    if (!wishlist) {
        return null;
    }
    
    // Convert productId to string for comparison
    const productIdStr = productId.toString();
    
    // Remove the item
    const originalLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
        item => item.product.toString() !== productIdStr
    );
    
    // Only save if something was removed
    if (wishlist.items.length < originalLength) {
        await wishlist.save();
    }
    
    return wishlist;
}

// Check if product is in wishlist
export async function isInWishlist(userId, productId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    
    if (!wishlist) {
        return false;
    }
    
    const exists = wishlist.items.some(
        item => item.product.toString() === productId
    );
    
    return exists;
}

// Get wishlist item count
export async function getWishlistCount(userId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    
    if (!wishlist) {
        return 0;
    }
    
    return wishlist.items.length;
}

// Clear entire wishlist
export async function clearWishlist(userId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    
    if (wishlist) {
        wishlist.items = [];
        await wishlist.save();
    }
    
    return wishlist;
}
