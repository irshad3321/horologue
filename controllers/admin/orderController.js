import Order from '../../models/Order.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';

// Show orders list page
export const showOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        
        // Get filters from query
        const status = req.query.status || '';
        const search = req.query.search || '';
        const sortBy = req.query.sort || 'newest';
        
        // Build query
        let query = {};
        
        if (status) {
            query.orderStatus = status;
        }
        
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Build sort
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
        
        // Get orders with pagination
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
        res.status(500).render('error/500');
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
            return res.status(404).render('error/404');
        }
        
        res.render('admin/order-detail', {
            admin: req.session.user,
            order: order
        });
    } catch (error) {
        console.error('Admin order detail error:', error);
        res.status(500).render('error/500');
    }
};

// Update order status API
export const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, declineReason } = req.body;
        
        const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Returned', 'Return Declined'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status'
            });
        }
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        order.orderStatus = status;
        
        if (status === 'Delivered') {
            order.deliveryDate = new Date();
        }
        
        if (status === 'Cancelled' || status === 'Returned') {
            if (status === 'Cancelled') {
                order.cancelledDate = new Date();
            }
            
            // Restore stock when admin cancels or approves return
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
        }
        
        // If return is declined, change status back to Delivered and save reason
        if (status === 'Return Declined') {
            order.orderStatus = 'Delivered';
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
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
};
