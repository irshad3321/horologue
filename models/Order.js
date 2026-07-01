import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        color: String,
        price: Number,
        quantity: Number,
        itemTotal: Number,
        itemStatus: {
            type: String,
            enum: ['Active', 'Cancelled', 'Returned'],
            default: 'Active'
        },
        cancelledDate: Date,
        cancellationReason: String
    }],
    shippingAddress: {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String,
        addressType: String
    },
    subtotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    shippingCharge: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    couponCode: {
        type: String,
        default: null
    },
    couponDiscount: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online', 'Wallet'],
        default: 'COD'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Returned', 'Return Declined'],
        default: 'Pending'
    },
  cancel:{
    type:Number,
    default:0
  },
    orderDate: {
        type: Date,
        default: Date.now
    },
    deliveryDate: Date,
    cancelledDate: Date,
    cancellationReason: String,
    declineReason: String
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
