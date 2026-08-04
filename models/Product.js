import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
    color: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    images: [{
        url: String,
        publicId: String
    }]
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
   
    offer: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    premium: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    variants: [variantSchema],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('Product', productSchema);
