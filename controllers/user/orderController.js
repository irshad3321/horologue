import { HTTP_STATUS } from '../../helper/constants.js';
import * as orderService from '../../service/orderService.js';
import * as cartService from '../../service/cartService.js';
import * as addressService from '../../service/addressService.js';
import * as wishlistService from '../../service/wishlistService.js';
import Coupon from '../../models/Coupon.js';



// Show checkout page
export const showCheckout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const orderId = req.query.orderId;
        let order = null;
        let cart = null;
        let subtotal = 0;
        let discount = 0;
        let total = 0;
         
    
        if (orderId) {
            order = await Order.findOne({ _id: orderId, userId }).populate('items.product');
            if (!order || order.paymentStatus !== 'Failed') {
                return res.redirect('/orders');
            }
    
            // Map order items to mimic cart structure for rendering
            cart = {
                items: order.items.map(item => ({
                    product: item.product,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    color: item.color
                }))
            };
            subtotal = order.subtotal;
            discount = order.discount;
            total = order.totalAmount;
        } else {
            cart = await cartService.getUserCart(userId);
            if (!cart || cart.items.length === 0) {
                return res.redirect('/cart');
            }
            


            cart.items.forEach(item => {
                const variant = item.product.variants.id(item.variantId);
                let price = variant.price;
                if (item.product.offer > 0) {
                    price = Math.round(price - (price * item.product.offer / 100));
                }
                const itemTotal = Math.round(price * item.quantity);
                subtotal += itemTotal;
            });

            discount = 0;
            total = subtotal - discount;
        }
        

        // Check if any cart item has an offer to disable coupon
        let flag = false;
        if (cart && cart.items) {
            for (const item of cart.items) {
                if (item.product && item.product.offer > 0) {
                    flag = true;
                    break;
                }
            }
        }

        const addressData = await addressService.getUserAddresses(userId);
        const addresses = addressData.addresses || [];

        // Get cart and wishlist counts
        const cartCount = await cartService.getCartCount(userId);
        const wishlistCount = await wishlistService.getWishlistCount(userId);

        res.render('user/checkout', {
            user: req.session?.user,
            cart: cart,
            addresses: addresses,
            subtotal: subtotal,
            discount: discount,
            total: total,
            cartCount: cartCount,
            wishlistCount: wishlistCount,
            orderId: orderId || null,
            order: order,
            flag: flag
           
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
}
export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId, paymentMethod, couponCode, couponDiscount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!addressId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Please select a shipping address'
            })
        }

        // Get cart to calculate total
        const cart = await cartService.getUserCart(userId);
        if (!cart || cart.items.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Calculate total amount
        let totalAmount = 0;
        cart.items.forEach(item => {
            const variant = item.product.variants.id(item.variantId);
            let price = variant.price;
            if (item.product.offer > 0) {
                price = price - (price * item.product.offer / 100);
            }
            totalAmount += price * item.quantity;
        });

        if (couponDiscount) {
            totalAmount -= couponDiscount;
        }

        if (paymentMethod === 'COD' && totalAmount > 2000) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Cash on Delivery is not available for orders above ₹2,000. Please choose another payment method.'
            });
        }

        const order = await orderService.placeOrder(
            userId,
            addressId,
            paymentMethod || 'COD',
            couponCode || null,
            couponDiscount || 0,
            razorpayOrderId || null,
            razorpayPaymentId || null,
            razorpaySignature || null
        );


        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id
        })
    } catch (error) {
        console.error('Place order error:', error);
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: error.message
        })
    }
}
// Show order success page
export const showOrderSuccess = async (req, res) => {
    try {
        const orderId = req.query.orderId;
      
        if (!orderId) {
            return res.redirect('/orders');
        }
        const order = await orderService.getOrderById(orderId, req.session.userId);
        
        // Get cart and wishlist counts
        const cartCount = await cartService.getCartCount(req.session.userId);
        const wishlistCount = await wishlistService.getWishlistCount(req.session.userId);

        res.render('user/order-success', {
            order: order,
            user: req.session.user,
            cartCount: cartCount,
            wishlistCount: wishlistCount
        });
    } catch (error) {
        console.error('Order success error:', error);
        res.redirect('/orders');
    }
};

// Show orders listtt
export const showOrders = async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1

        const result = await orderService.getUserOrders(userId, page, 10)
        const cartCount = await cartService.getCartCount(userId)
        const wishlistCount = await wishlistService.getWishlistCount(userId)

        res.render('user/orders', {
            user: req.session.user,
            orders: result.orders,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            total: result.total,
            cartCount: cartCount,
            wishlistCount: wishlistCount
        });
    } catch (error) {
        console.error('Orders list error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
};

// Show order detail
export const showOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;

        const order = await orderService.getOrderById(orderId, userId);

        // Get cart and wishlist counts
        const cartCount = await cartService.getCartCount(userId);
        const wishlistCount = await wishlistService.getWishlistCount(userId);

        res.render('user/order-detail', {
            user: req.session.user,
            order: order,
            cartCount: cartCount,
            wishlistCount: wishlistCount
        });
    } catch (error) {
        console.error('Order detail error:', error);
        res.status(HTTP_STATUS.NOT_FOUND).render('error/404');
    }
}

// Cancel order API
export const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
        const { reason } = req.body;
        const order = await orderService.cancelOrder(orderId, userId, reason);

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: error.message
        })
    }
}

// Cancel order item API
export const cancelOrderItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.params
        const userId = req.session.userId
        const { reason } = req.body

        const order = await orderService.cancelOrderItem(orderId, itemId, userId, reason)
        res.json({
            success: true,
            message: 'Item cancelled successfully'
        })
    } catch (error) {
        console.error('Cancel item error:', error)
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: error.message
        })
    }
}

// Return order API
export const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.id
        const userId = req.session.userId
        const { reason } = req.body
        const order = await orderService.returnOrder(orderId, userId, reason)

        res.json({
            success: true,
            message: 'Return request submitted successfully'
        })
    } catch (error) {
        console.error('Return order error:', error);
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: error.message
        })
    }
}

// Download invoice API
export const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id
        const userId = req.session.userId

        const order = await orderService.getOrderById(orderId, userId)
        res.render('user/invoice', {
            order: order
        });

    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

// Razorpay Integration
import razorpay from '../../config/razorpay.js';
import crypto from 'crypto';
import { validateCoupon, applyCoupon as applyCouponService } from '../../service/couponService.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';

// Create Razorpay Order
export const createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        const options = {
            amount: Math.round(amount * 100), // amount in paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order: order,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.json({
            success: false,
            message: 'Failed to create payment order'
        });
    }
};

// Verify Razorpay Payment
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            res.json({
                success: true,
                message: 'Payment verified successfully',
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            });
        } else {
            res.json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};

// Handle payment failure and create order with Failed status
export const handlePaymentFailure = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId, couponCode, couponDiscount, razorpayOrderId, amount, reason } = req.body;

        // Create order with Failed payment status
        const order = await orderService.createFailedOrder(
            userId,
            addressId,
            couponCode || null,
            couponDiscount || 0,
            razorpayOrderId || null,
            reason || 'Payment failed'
        );

        res.json({
            success: true,
            message: 'Order recorded with payment failure',
            orderId: order._id
        });
    } catch (error) {
        console.error('Handle payment failure error:', error);
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

// Validate Coupon
export const validateCouponController = async (req, res) => {
    try {
        const { code, amount } = req.body

        if (!code || !amount) {
            return res.json({
                valid: false,
                message: 'Coupon code and amount are required'
            })
        }

        const result = await validateCoupon(code, amount)
        res.json(result);
    } catch (error) {
        console.error('Coupon validation error:', error)
        res.json({
            valid: false,
            message: 'Error validating coupon'
        })
    }
}

// Get available coupons for user
export const getAvailableCoupons = async (req, res) => {
    try {
        const now = new Date();

        const coupons = await Coupon.find({
            status: 'active',
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            $expr: { $lt: ['$usedCount', '$usageLimit'] }
        }).select('code discountType discountValue minPurchase maxDiscount validUntil description');

        res.json({
            success: true,
            coupons: coupons
        });
    } catch (error) {
        console.error('Get available coupons error:', error);
        res.json({
            success: false,
            message: 'Failed to fetch coupons'
        });
    }
};

// Validate stock before placing order
export const validateStock = async (req, res) => {
    try {
        const userId = req.session.userId;
        const cart = await cartService.getUserCart(userId);

        if (!cart || cart.items.length === 0) {
            return res.json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Check each item for availability and stock
        for (const item of cart.items) {
            const product = item.product;

            // Check if product is active
            if (product.status !== 'active' || product.isDeleted) {
                return res.json({
                    success: false,
                    message: `${product.name} is no longer available`
                });
            }

            // Check variant and stock
            const variant = product.variants.id(item.variantId);

            if (!variant) {
                return res.json({
                    success: false,
                    message: `Variant not found for ${product.name}`
                });
            }

            if (variant.stock < item.quantity) {
                if (variant.stock === 0) {
                    return res.json({
                        success: false,
                        message: `${product.name} - ${variant.color} is out of stock`
                    });
                }
                return res.json({
                    success: false,
                    message: `Only ${variant.stock} items available for ${product.name} - ${variant.color}`
                });
            }
        }

        // All items are available
        res.json({
            success: true,
            message: 'All items are available'
        });

    } catch (error) {
        console.error('Stock validation error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to validate stock'
        });
    }
};

export const updatePaymentStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
        const { paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature, addressId } = req.body;

        // Update order
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        // Update address if a new one is selected during retry
        if (addressId) {
            const Address = (await import('../../models/Address.js')).default;
            const address = await Address.findOne({ _id: addressId, userId });
            if (address) {
                order.addressId = addressId;
                order.shippingAddress = {
                    fullName: address.fullName,
                    phone: address.phoneNumber,
                    addressLine1: address.addressLine1,
                    addressLine2: address.addressLine2,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    addressType: address.addressType
                };
            }
        }

        const method = paymentMethod || 'Online';

        if (method === 'Online') {
            // Verify payment signature
            const sign = razorpayOrderId + '|' + razorpayPaymentId;
            const expectedSign = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest('hex');

            if (razorpaySignature !== expectedSign) {
                return res.json({ success: false, message: 'Invalid payment signature' });
            }

            order.paymentMethod = 'Online';
            order.paymentStatus = 'Paid';
            order.orderStatus = 'Pending';
            order.razorpayOrderId = razorpayOrderId;
            order.razorpayPaymentId = razorpayPaymentId;
            order.razorpaySignature = razorpaySignature;
        } else if (method === 'Wallet') {
            const { deductMoneyFromWallet, getWalletBalance } = await import('../../service/walletService.js');
            const balance = await getWalletBalance(userId);
            if (balance < order.totalAmount) {
                return res.json({ success: false, message: 'Insufficient wallet balance' });
            }
            await deductMoneyFromWallet(userId, order.totalAmount, `Order payment for #${order.orderNumber}`, order._id);

            order.paymentMethod = 'Wallet';
            order.paymentStatus = 'Paid';
            order.orderStatus = 'Pending';
        } else if (method === 'COD') {
            if (order.totalAmount > 2000) {
                return res.json({ success: false, message: 'COD is not available for orders above ₹2,000' });
            }
            order.paymentMethod = 'COD';
            order.paymentStatus = 'Pending';
            order.orderStatus = 'Pending';
        } else {
            return res.json({ success: false, message: 'Invalid payment method' });
        }

        order.cancelledDate = null;
        order.cancellationReason = null;
        await order.save();

        // Reduce product stock now that payment is successful
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
                const variant = product.variants.id(item.variantId);
                if (variant && variant.stock >= item.quantity) {
                    variant.stock -= item.quantity;
                    await product.save();
                }
            }
        }

        // Clear the user's cart now that the payment is successful
        await cartService.clearCart(userId);

        res.json({ success: true, message: 'Payment successful and order confirmed' });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.json({ success: false, message: 'Failed to update payment status' });
    }
};
