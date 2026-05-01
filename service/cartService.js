import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// Get user cart with product details
export async function getUserCart(userId) {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
        return { items: [] };
    }
    
    // Fix cart items with invalid variant IDs by matching color
    let cartUpdated = false;
    
    for (const item of cart.items) {
        const product = item.product;
        
        // Check if variant exists
        const variant = product.variants.id(item.variantId);
        
        if (!variant && item.variantColor) {
            // Variant not found - try to find matching variant by color
            const matchingVariant = product.variants.find(v => v.color === item.variantColor);
            
            if (matchingVariant) {
                item.variantId = matchingVariant._id;
                cartUpdated = true;
            }
        } else if (!variant && product.variants && product.variants.length > 0) {
            // No color stored, use first variant
            const firstVariant = product.variants[0];
            item.variantId = firstVariant._id;
            item.variantColor = firstVariant.color;
            cartUpdated = true;
        }
    }
    
    // Save cart if any items were updated
    if (cartUpdated) {
        await cart.save();
    }
    
    return cart;
}

// Add product to cart
export async function addToCart(userId, productId, variantId, quantity = 1) {
    // Check if product exists and is active
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    if (product.status !== 'active' || product.isDeleted) {
        throw new Error('Product is not available');
    }
    
    // Find the variant
    const variant = product.variants.id(variantId);
    
    if (!variant) {
        throw new Error('Variant not found');
    }
    
    // Check stock
    if (variant.stock < quantity) {
        throw new Error('Insufficient stock');
    }
    
    // Find or create cart
    let cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
        cart = new Cart({ user: userId, items: [] });
    }
    
    // Check if product variant already in cart
    const existingItem = cart.items.find(
        item => item.product.toString() === productId && 
                item.variantId.toString() === variantId
    );
    
    if (existingItem) {
        // Increase quantity of existing variant
        const newQuantity = existingItem.quantity + quantity;
        
        // Check maximum quantity limit (5 per variant)
        if (newQuantity > 5) {
            throw new Error('Maximum 5 quantities allowed per variant');
        }
        
        // Check stock for new quantity
        if (variant.stock < newQuantity) {
            throw new Error('Insufficient stock');
        }
        
        existingItem.quantity = newQuantity;
        existingItem.variantColor = variant.color;
    } else {
        // Adding new variant - check if quantity exceeds limit
        if (quantity > 5) {
            throw new Error('Maximum 5 quantities allowed per variant');
        }
        
        // Add new variant as separate cart item
        cart.items.push({
            product: productId,
            variantId: variantId,
            variantColor: variant.color,
            quantity: quantity
        });
    }
    
    await cart.save();
    return cart;
}

// Update cart item quantity
export async function updateCartQuantity(userId, productId, variantId, quantity) {
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
        throw new Error('Cart not found');
    }
    
    // Find the item
    const item = cart.items.find(
        item => item.product.toString() === productId && 
                item.variantId.toString() === variantId
    );
    
    if (!item) {
        throw new Error('Item not found in cart');
    }
    
    // Check maximum quantity limit (5 per product)
    if (quantity > 5) {
        throw new Error('Maximum 5 quantities allowed per product');
    }
    
    // Check stock
    const product = await Product.findById(productId);
    const variant = product.variants.id(variantId);
    
    if (variant.stock < quantity) {
        throw new Error('Insufficient stock');
    }
    
    item.quantity = quantity;
    await cart.save();
    
    return cart;
}

// Remove item from cart
export async function removeFromCart(userId, productId, variantId) {
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
        throw new Error('Cart not found');
    }
    
    // Remove the item
    cart.items = cart.items.filter(
        item => !(item.product.toString() === productId && 
                  item.variantId.toString() === variantId)
    );
    
    await cart.save();
    return cart;
}

// Clear entire cart
export async function clearCart(userId) {
    const cart = await Cart.findOne({ user: userId });
    
    if (cart) {
        cart.items = [];
        await cart.save();
    }
    
    return cart;
}

// Get cart item count
export async function getCartCount(userId) {
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
        return 0;
    }
    
    return cart.items.length;
}
