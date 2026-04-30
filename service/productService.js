import Product from '../models/Product.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
export async function getProducts(filters = {}) {
    const { search, status, category, page = 1, limit = 10, sort = 'newest', minPrice, maxPrice } = filters;
    
    const query = { isDeleted: false };
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } }
        ];
    }
    if (status) {
        query.status = status;
    }
    if (category) {
        query.category = category;
    }
    
    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
        query['variants.price'] = {};
        if (minPrice !== undefined) {
            query['variants.price'].$gte = minPrice;
        }
        if (maxPrice !== undefined) {
            query['variants.price'].$lte = maxPrice;
        }
    }
    
    const skip = (page - 1) * limit;
    let sortOption = {};
    switch (sort) {
        case 'newest':
            sortOption = { createdAt: -1 };
            break;
        case 'oldest':
            sortOption = { createdAt: 1 };
            break;
        case 'name-asc':
            sortOption = { name: 1 };
            break;
        case 'name-desc':
            sortOption = { name: -1 };
            break;
        case 'price-asc':
            sortOption = { 'variants.price': 1 };
            break;
        case 'price-desc':
            sortOption = { 'variants.price': -1 };
            break;
        default:
            sortOption = { createdAt: -1 };
    }
    const products = await Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));
    const total = await Product.countDocuments(query);
    
    return {
        products,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
    };
}

export async function getProductById(productId) {
    return await Product.findOne({ _id: productId, isDeleted: false });
}
export async function createProduct(productData) {
    const product = new Product(productData);
    return await product.save();
}
export async function updateProduct(productId, updateData) {
    return await Product.findByIdAndUpdate(
        productId,
        updateData,
        { returnDocument: 'after', runValidators: true }
    );
}
export async function deleteProduct(productId) {
    return await Product.findByIdAndUpdate(
        productId,
        { isDeleted: true },
        { returnDocument: 'after' }
    );
}
export async function toggleProductStatus(productId) {
    const product = await Product.findById(productId);
    if (!product) return null;
    
    product.status = product.status === 'active' ? 'inactive' : 'active';
    return await product.save();
}
export async function deleteVariantImages(images) {
    for (const image of images) {
        if (image.publicId) {
            await deleteFromCloudinary(image.publicId);
        }
    }
}
export async function addVariant(productId, variantData) {
    const product = await Product.findById(productId);
    if (!product) return null;
    
    product.variants.push(variantData);
    return await product.save();
}
export async function updateVariant(productId, variantId, variantData) {
    const product = await Product.findById(productId);
    if (!product) return null;
    
    const variant = product.variants.id(variantId);
    if (!variant) return null;
    
    Object.assign(variant, variantData);
    return await product.save();
}

export async function deleteVariant(productId, variantId) {
    const product = await Product.findById(productId);
    if (!product) return null;
    
    const variant = product.variants.id(variantId);
    if (!variant) return null
    await deleteVariantImages(variant.images);
    
    product.variants.pull(variantId);
    return await product.save();
}
