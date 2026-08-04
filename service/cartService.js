import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// Get user cart with product details and pagination
export async function getUserCart(identifier, page = 1, limit = 5) {
    const isUserId = identifier && identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier);
    
    const query = isUserId ? { user: identifier } : { guestId: identifier };
    const cart = await Cart.findOne(query).populate('items.product');
    
    if (!cart) {
        return { 
            items: [], 
            allItems: [],
            page: 1, 
            totalPages: 0, 
            total: 0 
        };
    }
    
    let cartUpdated = false;
    
    for (const item of cart.items) {
        const product = item.product;

        const variant = product.variants.id(item.variantId);
        
        if (!variant && item.variantColor) {
            const matchingVariant = product.variants.find(v => v.color === item.variantColor);
            
            if (matchingVariant) {
                item.variantId = matchingVariant._id;
                cartUpdated = true;
            }
        } else if (!variant && product.variants && product.variants.length > 0) {
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
    
    const Brand = (await import('../models/Brand.js')).default;
    
    for (const item of cart.items) {
        const product = item.product;
        const brand = await Brand.findOne({ name: product.brand, isDeleted: false });
        product.brandStatus = brand ? brand.status : 'active';
    }
    
    // Pagination logic
    const total = cart.items.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = cart.items.slice(startIndex, endIndex);
    
    return {
        items: paginatedItems,
        allItems: cart.items,
        page: page,
        totalPages: totalPages,
        total: total
    };
}

// Add product to cart
export async function addToCart(identifier, productId, variantId, quantity = 1) {
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    if (product.status !== 'active' || product.isDeleted) {
        throw new Error('Product is not available');
    }
    
       
    // Check brand status
    const Brand = (await import('../models/Brand.js')).default;
    const brand = await Brand.findOne({ name: product.brand, isDeleted: false });
    if (brand && brand.status === 'inactive') {
        throw new Error('This brand is currently deactivated');
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
    
    const isUserId = identifier && identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier);
    const query = isUserId ? { user: identifier } : { guestId: identifier };
    
    let cart = await Cart.findOne(query);
    
    if (!cart) {
        cart = new Cart(isUserId ? { user: identifier, items: [] } : { guestId: identifier, items: [] });
    }
    
    const existingItem = cart.items.find(
        item => item.product.toString() === productId && 
                item.variantId.toString() === variantId
    );
    
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
       
        if (newQuantity > 5) {
            throw new Error('Maximum 5 quantities allowed per variant');
        }
      
            
        if (variant.stock < newQuantity) {
            throw new Error('Insufficient stock');
        }
        
        existingItem.quantity = newQuantity;
        existingItem.variantColor = variant.color;
    } else {
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
    
    // Remove from wishlist if exists
    try {
        const Wishlist = (await import('../models/Wishlist.js')).default;
        const wishlist = await Wishlist.findOne({ user: userId });
        
        if (wishlist) {
            const originalLength = wishlist.items.length;
            wishlist.items = wishlist.items.filter(
                item => item.product.toString() !== productId
            );
            
            if (wishlist.items.length < originalLength) {
                await wishlist.save();
            }
        }
    } catch (error) {
    }
    
    return cart;
}

// Update cart item quantity
export async function updateCartQuantity(identifier, productId, variantId, quantity) {
    const isUserId = identifier && identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier);
    const query = isUserId ? { user: identifier } : { guestId: identifier };
    
    const cart = await Cart.findOne(query);
    
    if (!cart) {
        throw new Error('Cart not found');
    }
    
    const item = cart.items.find(
        item => item.product.toString() === productId && 
                item.variantId.toString() === variantId
    );
    
    if (!item) {
        throw new Error('Item not found in cart');
    }
   
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    if (product.status !== 'active' || product.isDeleted) {
        throw new Error('Product is not available');
    }
    
    if (quantity > 5) {
        throw new Error('Maximum 5 quantities allowed per product');
    }

    
    const variant = product.variants.id(variantId);
    
    if (!variant) {
        throw new Error('Variant not found');
    }
    
    if (variant.stock < quantity) {
        if (variant.stock === 0) {
            throw new Error(`${product.name} - ${variant.color} is out of stock`);
        }
        throw new Error(`Only ${variant.stock} items available for ${product.name} - ${variant.color}`);
    }
    
    item.quantity = quantity;
    await cart.save();
    
    return cart;
}

// Remove item from cart
export async function removeFromCart(identifier, productId, variantId) {
    const isUserId = identifier && identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier);
    const query = isUserId ? { user: identifier } : { guestId: identifier };
    
    const cart = await Cart.findOne(query);
    
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
export async function clearCart(identifier) {
    const isUserId = identifier && identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier);
    const query = isUserId ? { user: identifier } : { guestId: identifier };
    
    const cart = await Cart.findOne(query);
    
    if (cart) {
        cart.items = [];
        await cart.save();
    }
    
    return cart;
}

// Get cart item count
export async function getCartCount(identifier) {
    const isUserId = identifier && identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier);
    const query = isUserId ? { user: identifier } : { guestId: identifier };
    
    const cart = await Cart.findOne(query);
    
    if (!cart) {
        return 0;
    }
    
    return cart.items.length;   
}
