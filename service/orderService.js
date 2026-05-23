import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
   

function generateOrderNumber(){
    const timestamp = Date.now();
    const random = Math.floor(Math.random()*1000);
    return `ORD${timestamp}${random}`;
}
// palcing the ordder 
export async function placeOrder(userId, addressId, paymentMethod) {
    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }
        const Address = (await import('../models/Address.js')).default;
        const address = await Address.findById(addressId);
        
        if (!address) {
            throw new Error('Address not found');
        }
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of cart.items) {
            const product = item.product;
            const variant = product.variants.id(item.variantId);
            
            if (!variant) {
                throw new Error(`Variant not found for product ${product.name}`);
            }
            if (variant.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name} - ${variant.color}`);
            }
            let price = variant.price;
            if (product.offer > 0) {
                price = price - (price * product.offer / 100);
            }
            
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;
            
            orderItems.push({
                product: product._id,
                variantId: variant._id,
                color: variant.color,
                price: price,
                quantity: item.quantity,
                itemTotal: itemTotal
            });
            variant.stock -= item.quantity;
            await product.save();
        }
        const discount = 0;
        const tax = 0;
        const shippingCharge = 0;
        const totalAmount = subtotal - discount + tax + shippingCharge;
        const order = new Order({
            userId: userId,
            orderNumber: generateOrderNumber(),
            items: orderItems,
            shippingAddress: {
                fullName: address.fullName,
                phone: address.phoneNumber,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                addressType: address.addressType
            },
            subtotal: subtotal,
            discount: discount,
            tax: tax,
            shippingCharge: shippingCharge,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
            orderStatus: 'Pending'
        });
        
        await order.save();
        cart.items = [];
        await cart.save();
        
        return order;
    } catch (error) {
        throw error;
    }
}

// Get user orders
export async function getUserOrders(userId, page = 1, limit = 10) {
    try {
        const skip = (page - 1) * limit;
        
        const orders = await Order.find({ userId })
            .populate('items.product')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit);
        
        const total = await Order.countDocuments({ userId });
        
        return {
            orders: orders,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total: total
        };
    } catch (error) {
        throw error;
    }
}

// Get order by ID
export async function getOrderById(orderId, userId) {
    try {
        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.product')
            .populate('userId');
        
        if (!order) {
            throw new Error('Order not found');
        }
        
        return order;
    } catch (error) {
        throw error;
    }
}

// Cancel order
export async function cancelOrder(orderId, userId, reason) {
    try {
        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.product');
        
        if (!order) {
            throw new Error('Order not found');
        }
        
        if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') {
            throw new Error('Cannot cancel this order');
        }
        for (const item of order.items) {
            const product = await Product.findById(item.product._id);
            const variant = product.variants.id(item.variantId);
            
            if (variant) {
                variant.stock += item.quantity;
                await product.save();
            }
        }
        order.orderStatus = 'Cancelled';
        order.cancelledDate = new Date();
        order.cancellationReason = reason || '';
        
        await order.save();
        
        return order;
    } catch (error) {
        throw error;
    }
}

// Cancel ordered item
export async function cancelOrderItem(orderId, itemId, userId, reason) {
    try {
        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.product');
        
        if (!order) {
            throw new Error('Order not found');
        }
        
        if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') {
            throw new Error('Cannot cancel items from this order');
        }
        
        const item = order.items.id(itemId);
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        // Restore stock
        const product = await Product.findById(item.product._id);
        const variant = product.variants.id(item.variantId);
        
        if (variant) {
            variant.stock += item.quantity;
            await product.save();
        }
        order.items.pull(itemId);
        let subtotal = 0;
        order.items.forEach(item => {
            subtotal += item.itemTotal;
        });
        
        order.subtotal = subtotal;
        order.totalAmount = subtotal - order.discount + order.tax + order.shippingCharge;
        if (order.items.length === 0) {
            order.orderStatus = 'Cancelled';
            order.cancelledDate = new Date();
            order.cancellationReason = reason || 'All items cancelled';
        }
        
        await order.save();
        
        return order;
    } catch (error) {
        throw error;
    }
}

// Return order
export async function returnOrder(orderId, userId, reason) {
    try {
        const order = await Order.findOne({ _id: orderId, userId });
        
        if (!order) {
            throw new Error('Order not found');
        }
        
        if (order.orderStatus !== 'Delivered') {
            throw new Error('Only delivered orders can be returned');
        }
        
        if (!reason || reason.trim() === '') {
            throw new Error('Return reason is required');
        }
        
        order.orderStatus = 'Return Requested';
        order.cancellationReason = reason;
        
        await order.save();
        
        return order;
    } catch (error) {
        throw error;
    }
}

// Search orders
export async function searchOrders(userId, searchTerm) {
    try {
        const orders = await Order.find({
            userId: userId,
            $or: [
                { orderNumber: { $regex: searchTerm, $options: 'i' } },
                { orderStatus: { $regex: searchTerm, $options: 'i' } }
            ]
        })
        .populate('items.product')
        .sort({ orderDate: -1 });
        
        return orders;
    } catch (error) {
        throw error;
    }
}