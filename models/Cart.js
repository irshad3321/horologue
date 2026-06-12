import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    variantColor: {
        type: String,
        default: ''
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    }
}, {
    timestamps: true
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false  // Allow null for guest carts
    },
    guestId: {
        type: String,  // Session ID for guest users
        required: false
    },
    items: [cartItemSchema]
}, {
    timestamps: true
});

// Ensure either user or guestId is present
cartSchema.index({ user: 1 }, { sparse: true });
cartSchema.index({ guestId: 1 }, { sparse: true });

export default mongoose.model('Cart', cartSchema);
