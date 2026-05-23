import * as orderService from '../../service/orderService.js';
import * as cartService from '../../service/cartService.js';
import * as addressService from '../../service/addressService.js';

// Show checkout page
export const showCheckout = async (req, res) => {
    try {
        const userId = req.session.userId
        const cart = await cartService.getUserCart(userId);
        
        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }
        const addresses = await addressService.getUserAddresses(userId);
        let subtotal = 0;
        cart.items.forEach(item => {
            const variant = item.product.variants.id(item.variantId);
            let price = variant.price;
            if (item.product.offer > 0) {
                price = price - (price * item.product.offer / 100);
            }
            subtotal += price * item.quantity;
        });
        
        const discount = 0;
        const total = subtotal - discount;
        
        res.render('user/checkout', {
            user: req.session.user,
            cart: cart,
            addresses: addresses,
            subtotal: subtotal,
            discount: discount,
            total: total
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).render('error/500');
    }
}
export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { addressId, paymentMethod } = req.body;
        
        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: 'Please select a shipping address'
            })
        } 
        const order = await orderService.placeOrder(userId, addressId, paymentMethod || 'COD');
        
        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id
        })
    } catch (error) {
        console.error('Place order error:', error);
        res.status(400).json({
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
        res.render('user/order-success', {
            order: order
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
        const page = parseInt(req.query.page) || 1;
        
        const result = await orderService.getUserOrders(userId, page, 10);
        
        res.render('user/orders', {
            user: req.session.user,
            orders: result.orders,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            total: result.total
        });
    } catch (error) {
        console.error('Orders list error:', error);
        res.status(500).render('error/500');
    }
};

// Show order detail
export const showOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
        
        const order = await orderService.getOrderById(orderId, userId);
        
        res.render('user/order-detail', {
            user: req.session.user,
            order: order
        });
    } catch (error) {
        console.error('Order detail error:', error);
        res.status(404).render('error/404');
    }
};

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
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Cancel order item API
export const cancelOrderItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const userId = req.session.userId;
        const { reason } = req.body;
        
        const order = await orderService.cancelOrderItem(orderId, itemId, userId, reason);
        
        res.json({
            success: true,
            message: 'Item cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel item error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Return order API
export const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
        const { reason } = req.body;
        
        const order = await orderService.returnOrder(orderId, userId, reason);
        
        res.json({
            success: true,
            message: 'Return request submitted successfully'
        });
    } catch (error) {
        console.error('Return order error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Download invoice API
export const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
        
        const order = await orderService.getOrderById(orderId, userId);
        
        // Import PDFKit
        const PDFDocument = (await import('pdfkit')).default;
        
        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
        
        // Pipe PDF to response
        doc.pipe(res);
        
        // Add company header
        doc.fontSize(20).text('HOROLOGUE', { align: 'center' });
        doc.fontSize(10).text('Premium Watch Store', { align: 'center' });
        doc.moveDown();
        
        // Add invoice title
        doc.fontSize(16).text('INVOICE', { align: 'center' });
        doc.moveDown();
        
        // Add order details
        doc.fontSize(10);
        doc.text(`Invoice Number: ${order.orderNumber}`, 50, 150);
        doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString('en-IN')}`, 50, 165);
        doc.text(`Payment Method: ${order.paymentMethod}`, 50, 180);
        doc.text(`Payment Status: ${order.paymentStatus}`, 50, 195);
        
        // Add customer details
        doc.text('Bill To:', 350, 150);
        doc.text(order.shippingAddress.fullName, 350, 165);
        doc.text(order.shippingAddress.phone, 350, 180);
        
        // Add shipping address
        doc.moveDown(4);
        doc.text('Shipping Address:', 50);
        doc.text(`${order.shippingAddress.addressLine1}`, 50);
        if (order.shippingAddress.addressLine2) {
            doc.text(`${order.shippingAddress.addressLine2}`, 50);
        }
        doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`, 50);
        
        // Add table header
        doc.moveDown(2);
        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Item', 50, tableTop);
        doc.text('Color', 250, tableTop);
        doc.text('Qty', 350, tableTop);
        doc.text('Price', 400, tableTop);
        doc.text('Total', 480, tableTop, { align: 'right' });
        
        // Add line under header
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        // Add items
        doc.font('Helvetica');
        let yPosition = tableTop + 25;
        
        order.items.forEach(item => {
            doc.text(item.product.name, 50, yPosition, { width: 180 });
            doc.text(item.color, 250, yPosition);
            doc.text(item.quantity.toString(), 350, yPosition);
            doc.text(`₹${item.price.toLocaleString('en-IN')}`, 400, yPosition);
            doc.text(`₹${item.itemTotal.toLocaleString('en-IN')}`, 480, yPosition, { align: 'right' });
            yPosition += 25;
        });
        
        // Add line before totals
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 15;
        
        // Add totals
        doc.text('Subtotal:', 400, yPosition);
        doc.text(`₹${order.subtotal.toLocaleString('en-IN')}`, 480, yPosition, { align: 'right' });
        yPosition += 20;
        
        if (order.discount > 0) {
            doc.text('Discount:', 400, yPosition);
            doc.text(`-₹${order.discount.toLocaleString('en-IN')}`, 480, yPosition, { align: 'right' });
            yPosition += 20;
        }
        
        if (order.tax > 0) {
            doc.text('Tax:', 400, yPosition);
            doc.text(`₹${order.tax.toLocaleString('en-IN')}`, 480, yPosition, { align: 'right' });
            yPosition += 20;
        }
        
        doc.text('Shipping:', 400, yPosition);
        doc.text(`₹${order.shippingCharge.toLocaleString('en-IN')}`, 480, yPosition, { align: 'right' });
        yPosition += 20;
        
        // Add line before grand total
        doc.moveTo(400, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 15;
        
        // Add grand total
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total Amount:', 400, yPosition);
        doc.text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 480, yPosition, { align: 'right' });
        
        // Add footer
        doc.fontSize(8).font('Helvetica');
        doc.text('Thank you for your business!', 50, 700, { align: 'center' });
        doc.text('For any queries, contact us at support@horologue.com', 50, 715, { align: 'center' });
        
        // Finalize PDF
        doc.end();
        
    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
