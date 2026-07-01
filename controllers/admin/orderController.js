import { HTTP_STATUS, ORDER_STATUS, PAYMENT_STATUS } from '../../helper/constants.js';
import Order from '../../models/Order.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';

// Show orders list page
export const showOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const status = req.query.status || '';
        const search = req.query.search || '';
        const sortBy = req.query.sort || 'newest';
        
        let query = {};
        
        if (status) {
            query.orderStatus = status;
        }
        
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } }
            ];
        }
        let sort = {};
        if (sortBy === 'newest') {
            sort.orderDate = -1;
        } else if (sortBy === 'oldest') {
            sort.orderDate = 1;
        } else if (sortBy === 'amount-high') {
            sort.totalAmount = -1;
        } else if (sortBy === 'amount-low') {
            sort.totalAmount = 1;
        }
        
        const orders = await Order.find(query)
            .populate('userId', 'firstName lastName email phone')
            .populate('items.product', 'name images variants')
            .sort(sort)
            .skip(skip)
            .limit(limit);
        
        const total = await Order.countDocuments(query);
        res.render('admin/orders', {
            admin: req.session.user,
            orders: orders,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total: total,
            status: status,
            search: search,
            sort: sortBy
        });
    } catch (error) {
        console.error('Admin orders list error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
};

// Show order detail page
export const showOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        const order = await Order.findById(orderId)
            .populate('userId', 'firstName lastName email phone')
            .populate('items.product', 'name images variants');
        
        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).render('error/404');
        }
        
        res.render('admin/order-detail', {
            admin: req.session.user,
            order: order
        });
    } catch (error) {
        console.error('Admin order detail error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
};

// Update order status API
export const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, declineReason } = req.body;
        
        const validStatuses = [
            ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED, 
            ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURN_REQUESTED, 
            ORDER_STATUS.RETURNED, ORDER_STATUS.RETURN_DECLINED
        ];
        
        if (!validStatuses.includes(status)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Invalid order status'
            });
        }
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Define status progression ordere
        const statusOrder = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED];
        const currentStatusIndex = statusOrder.indexOf(order.orderStatus);
        const newStatusIndex = statusOrder.indexOf(status);
        
        if (currentStatusIndex !== -1 && newStatusIndex !== -1 && newStatusIndex < currentStatusIndex) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: `Cannot change status from ${order.orderStatus} back to ${status}`
            });
        }
        if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED].includes(order.orderStatus) && 
            ![ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.RETURNED, ORDER_STATUS.RETURN_DECLINED].includes(status)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: `Cannot change status from ${order.orderStatus}`
            });
        }
        
        // Store old status before updating
        const oldStatus = order.orderStatus;
        order.orderStatus = status;
        
        if (status === ORDER_STATUS.DELIVERED) {
            order.deliveryDate = new Date();
            // Mark COD payment as Paid when delivered
            if (order.paymentMethod === 'COD' && order.paymentStatus === PAYMENT_STATUS.PENDING) {
                order.paymentStatus = PAYMENT_STATUS.PAID;
            }
        }
        
        // Restore stock only when approving return from 'Return Requested' status
        if (status === ORDER_STATUS.RETURNED && oldStatus === ORDER_STATUS.RETURN_REQUESTED) {
            // Restore stock when admin approves return
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    const variant = product.variants.id(item.variantId);
                    if (variant) {
                        variant.stock += item.quantity;
                        await product.save();
                    }
                }
            }
            
            // Refund to wallet when return is approved
            const { refundToWallet } = await import('../../service/walletService.js');
            await refundToWallet(
                order.userId, 
                order.totalAmount, 
                `Refund for returned order #${order.orderNumber}`, 
                order._id
            );
        }
        
        // If return is declined, change status back to Delivered and save reason
        if (status === ORDER_STATUS.RETURN_DECLINED) {
            order.orderStatus = ORDER_STATUS.DELIVERED;
            if (declineReason) {
                order.declineReason = declineReason;
            }
        }
        
        await order.save();
        
        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
};
