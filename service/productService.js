import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';


async function getBrandStatus(brandName) {
    const brand = await Brand.findOne({ name: brandName, isDeleted: false });
    return brand ? brand.status : 'active'; 
}

export async function getProducts(filters = {}) {
    const search = filters.search;
    const status = filters.status;
    const category = filters.category;
    const brand = filters.brand;
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const sort = filters.sort || 'newest';
    const minPrice = filters.minPrice;
    const maxPrice = filters.maxPrice;
    const hideInactiveCategories = filters.hideInactiveCategories || false;
    
    const query = { isDeleted: false };




    if (hideInactiveCategories) {
        const activeCategories = await Category.find({ 
            status: 'active', 
            isDeleted: false 
        }).select('name');
        
        const activeCategoryNames = activeCategories.map(cat => cat.name);
        query.category = { $in: activeCategoryNames };
    }
    
    // Search filter
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
        ];
    }
    if (status) {
        query.status = status;
    }

    if (category) {
        query.category = category;
    }
    if (brand) {
        query.brand = brand;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        // Don't apply price filter in query for price sorting
        // We'll filter after calculating min prices
        if (sort !== 'price-asc' && sort !== 'price-desc') {
            query['variants.price'] = {};
            if (minPrice !== undefined) {
                query['variants.price'].$gte = minPrice;
            }
            if (maxPrice !== undefined) {
                query['variants.price'].$lte = maxPrice;
            }
        }
    }
    
    const skip = (page - 1) * limit;
    
    // Sort options
    let sortOption = {};
    let useCollation = false;
    if (sort === 'newest') {
        sortOption = { createdAt: -1 };
    } else if (sort === 'oldest') {
        sortOption = { createdAt: 1 };
    } else if (sort === 'name-asc') {
        sortOption = { name: 1 };
        useCollation = true; // Case-insensitive sorting
    } else if (sort === 'name-desc') {
        sortOption = { name: -1 };
        useCollation = true; // Case-insensitive sorting
    } else if (sort === 'price-asc' || sort === 'price-desc') {
        // For price sorting, we'll fetch all products first and sort in memory
        // because MongoDB can't reliably sort by min/max of variant array
        sortOption = null;
    } else {
        sortOption = { createdAt: -1 };
    }
    
    let products;
    let total;
    
    if (sort === 'price-asc' || sort === 'price-desc') {
        // Fetch all matching products (without limit for sorting)
        let allProducts = await Product.find(query);
        
        // Filter out products with inactive/blocked brands
        const productsWithBrands = await Promise.all(
            allProducts.map(async (product) => {
                const brandStatus = await getBrandStatus(product.brand);
                return { product, brandStatus };
            })
        );
        
        // Keep only products with active brands
        allProducts = productsWithBrands
            .filter(item => item.brandStatus === 'active')
            .map(item => item.product);
        
        // Calculate min price for each product and sort
        let productsWithMinPrice = allProducts.map(product => {
            const productMinPrice = Math.min(...product.variants.map(v => v.price));
            // Apply offer discount to get final price
            let finalPrice = productMinPrice;
            if (product.offer > 0) {
                finalPrice = productMinPrice - (productMinPrice * product.offer / 100);
            }
            return { product, productMinPrice: finalPrice };
        });
        
        // Apply price range filter based on min price
        if (minPrice !== undefined || maxPrice !== undefined) {
            productsWithMinPrice = productsWithMinPrice.filter(item => {
                let matches = true;
                if (minPrice !== undefined && item.productMinPrice < minPrice) {
                    matches = false;
                }
                if (maxPrice !== undefined && item.productMinPrice > maxPrice) {
                    matches = false;
                }
                return matches;
            });
        }
        
        // Sort by min price
        productsWithMinPrice.sort((a, b) => {
            return sort === 'price-asc' ? a.productMinPrice - b.productMinPrice : b.productMinPrice - a.productMinPrice;
        });
        
        // Apply pagination after sorting
        total = productsWithMinPrice.length;
        const paginatedProductsWithPrice = productsWithMinPrice.slice(skip, skip + limit);
        
        // Add brand status back to paginated products
        products = paginatedProductsWithPrice.map(item => ({
            ...item.product.toObject(),
            brandStatus: 'active'
        }));
        
        // Return early to avoid duplicate brand status check
        return {
            products: products,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        };
    } else {
        // Normal sorting with pagination
        const queryBuilder = Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));
        
        // Apply case-insensitive collation for name sorting
        if (useCollation) {
            queryBuilder.collation({ locale: 'en', strength: 2 });
        }
        
        products = await queryBuilder;
        
        total = await Product.countDocuments(query);
    }
    const productsWithBrandStatus = await Promise.all(
        products.map(async (product) => {
            const brandStatus = await getBrandStatus(product.brand);
            return {
                ...product.toObject(),
                brandStatus: brandStatus
            };
        })
    );
    
    return {
        products: productsWithBrandStatus,
        total: total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
    };
}

export async function   getProductById(productId) {
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) return null;
    
    const brandStatus = await getBrandStatus(product.brand);
    return {
        ...product.toObject(),
        brandStatus: brandStatus
    };
}
export async function createProduct(productData) {
    const product = new Product(productData);
    return await product.save();
}
export async function updateProduct(productId, updateData) {
    const product = await Product.findById(productId);
    
    if (!product) {
        return null;
    }
    
    if (updateData.variants) {
        const updatedVariants = updateData.variants.map(newVariant => {
            if (newVariant._id) {
                const existingVariant = product.variants.id(newVariant._id);
                if (existingVariant) {
                    existingVariant.color = newVariant.color;
                    existingVariant.price = parseFloat(newVariant.price);
                    existingVariant.stock = parseInt(newVariant.stock);
                    existingVariant.images = newVariant.images;
                    return existingVariant;
                }
            }
            return newVariant;
        });
        
        product.variants = updatedVariants;
    }
    
    // Update other fields
    if (updateData.name) product.name = updateData.name;
    if (updateData.brand) product.brand = updateData.brand;
    if (updateData.category) product.category = updateData.category;
    if (updateData.description !== undefined) product.description = updateData.description;
    if (updateData.offer !== undefined) product.offer = updateData.offer;
    if (updateData.status) product.status = updateData.status;
    if (updateData.premium) product.premium = updateData.premium;
    
    await product.save();
    return product;
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

// Get all unique brands
export async function getAllBrands() {
    const brands = await Product.distinct('brand', { 
        isDeleted: false, 
        status: 'active' 
    });
        
    return brands.sort();
}



// Get related products by category
export async function getRelatedProducts(productId, category, limit = 4) {
    return await Product.find({
        _id: { $ne: productId },
        category: category,
        status: 'active',
        isDeleted: false
    })
    .limit(limit)
    .sort({ createdAt: -1 });
}

