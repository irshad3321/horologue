import { HTTP_STATUS } from '../../helper/constants.js';
import * as productService from '../../service/productService.js';
import * as categoryService from '../../service/categoryService.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../config/cloudinary.js';
import Product from '../../models/Product.js';
export async function getProductsPage(req, res) {
    try {
        const { search, status, category, page = 1, sort = 'newest' } = req.query
        
        const filters = {
            search,
            status,
            category,
            page,
            sort,
            limit: 5
        }
        const result = await productService.getProducts(filters)
        const categories = await categoryService.getCategories({ limit: 100 })
        res.render('admin/products', {
            admin: req.session.user,
            currentPage: 'products',
            products: result.products,
            categories: categories.categories,
            search: search || '',
            status: status || '',
            category: category || '',
            sort: sort || 'newest',
            currentPageNum: result.page,
            totalPages: result.totalPages,
            total: result.total
        })
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
}
export async function getAddProductPage(req, res) {
    try {
        const categories = await categoryService.getCategories({ limit: 100, status: 'active' });
        const { getActiveBrands } = await import('../../service/brandService.js');
        const brands = await getActiveBrands();
        
        res.render('admin/add-product', {
            admin: req.session.user,
            currentPage: 'products',
            categories: categories.categories,
            brands: brands
        });
    } catch (error) {
        console.error('Error loading add product page:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
}
export async function getEditProductPage(req, res) {
    try {
        const { productId } = req.params;
        
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(HTTP_STATUS.NOT_FOUND).render('error/404');
        }
        
        const categories = await categoryService.getCategories({ limit: 100, status: 'active' });
        const { getActiveBrands } = await import('../../service/brandService.js');
        const brands = await getActiveBrands();
        
        res.render('admin/edit-product', {
            admin: req.session.user,
            currentPage: 'products',
            product,
            productId,
            categories: categories.categories,
            brands: brands
        });
    } catch (error) {
        console.error('Error loading edit product page:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
}
export async function getProductById(req, res) {
    try {
        const { productId } = req.params;
        
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        
        res.json({ 
            success: true, 
            product 
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to fetch product' 
        });
    }
}

export async function createProduct(req, res) {
    try {
        const { name, brand, category, description, offer, status, premium, variants } = req.body;
        if (!name || !brand || !category) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                success: false, 
                message: 'Name, brand, and category are required' 
            });
        }
        
        if (!variants || variants.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                success: false, 
                message: 'At least one variant is required' 
            });
        }
        const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        for (let variant of parsedVariants) {
            if (variant.images && variant.images.length > 0) {
                variant.images = variant.images.map(img => ({
                    url: img.url || img,
                    publicId: img.publicId || ''
                }));
            }
        }
        
        // Create product
        const product = await productService.createProduct({
            name: name.trim(),
            brand: brand.trim(),
            category,
            description: description?.trim() || '',
            offer: offer || 0,
            status: status || 'active',
            premium: premium || 'No',
            variants: parsedVariants
        })
        res.status(HTTP_STATUS.CREATED).json({ 
            success: true, 
            message: 'Product created successfully',
            product 
        })
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to create product' 
        })
    }
}
export async function updateProduct(req, res) {
    try {
        const { productId } = req.params;
        const { name, brand, category, description, offer, status, premium, variants } = req.body;
        if (!name || !brand || !category) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                success: false, 
                message: 'Name, brand, and category are required' 
            });
        }
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        for (let variant of parsedVariants) {
            if (variant.newImages && variant.newImages.length > 0) {
                const uploadedImages = [];
                for (let image of variant.newImages) {
                    const result = await uploadToCloudinary(image, 'products', {
                        width: 800,
                        height: 800,
                        crop: 'fill'
                    });
                    uploadedImages.push({
                        url: result.secure_url,
                        publicId: result.public_id
                    });
                }
                variant.images = [...(variant.images || []), ...uploadedImages];
            }
        }
        const updatedProduct = await productService.updateProduct(productId, {
            name: name.trim(),
            brand: brand.trim(),
            category,
            description: description?.trim() || '',
            offer: offer || 0,
            status: status || 'active',
            premium: premium || 'No',
            variants: parsedVariants
        });
        
        res.json({ 
            success: true, 
            message: 'Product updated successfully',
            product: updatedProduct 
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to update product' 
        });
    }
}

// Delete product
export async function deleteProduct(req, res) {
    try {
        const { productId } = req.params;
        
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        await productService.deleteProduct(productId);
        
        res.json({ 
            success: true, 
            message: 'Product deleted successfully' 
        })
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to delete product' 
        })
    }
}
export async function toggleProductStatus(req, res) {
    try {
        const { productId } = req.params   
        const product = await productService.toggleProductStatus(productId);
        if (!product) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        res.json({ 
            success: true, 
            message: `Product ${product.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            status: product.status 
        });
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to toggle product status' 
        })
    }
}
export async function uploadVariantImage(req, res) {
    try {
        if (!req.file) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                success: false, 
                message: 'No image file provided' 
            })
        }
        const result = await uploadToCloudinary(req.file.path, 'products', {
            width: 800,
            height: 800,
            crop: 'fill'
        })
        res.json({ 
            success: true, 
            message: 'Image uploaded successfully',
            image: {
                url: result.secure_url,
                publicId: result.public_id
            }
        })
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to upload image' 
        })
    }
}
export async function deleteVariantImage(req, res) {
    try {
        const { publicId } = req.body;
        
        if (!publicId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                success: false, 
                message: 'Public ID is required' 
            });
        }
        await deleteFromCloudinary(publicId);
        res.json({ 
            success: true, 
            message: 'Image deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to delete image' 
        });
    }
}


// Show inventory management page
export const showInventory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const search = req.query.search || '';
        const brand = req.query.brand || '';

        const allBrands = await Product.distinct('brand', { isDeleted: false });

        const query = { isDeleted: false };
        
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        
        if (brand) {
            query.brand = brand;
        }
        
        const allProducts = await Product.find(query).sort({ name: 1 });
        
        const allVariants = [];
        allProducts.forEach(product => {
            product.variants.forEach(variant => {
                allVariants.push({
                    product: product,
                    variant: variant
                });
            });
        });
        
        // Calculate pagination
        const totalVariants = allVariants.length;
        const totalPages = Math.ceil(totalVariants / limit);
        const skip = (page - 1) * limit;
        
        const paginatedVariants = allVariants.slice(skip, skip + limit);

        const productsForView = paginatedVariants.map(item => ({
            _id: item.product._id,
            name: item.product.name,
            brand: item.product.brand,
            variants: [item.variant]
        }));
        
        res.render('admin/inventory', {
            admin: req.session.user,
            currentPage: 'inventory',
            products: productsForView,
            currentPageNum: page,
            totalPages: totalPages,
            search,
            brand,
            brands: allBrands.sort(),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        });
    } catch (error) {
        console.error('Inventory page error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
};

// Update stock API
export const updateStock = async (req, res) => {
    try {
        const { productId, variantId, stock } = req.body;
        
        if (!productId || !variantId || stock === undefined) {
            return res.json({
                success: false,
                message: 'Missing required fields'
            });
        }
        

        const product = await Product.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found'
            });
        }
       
        const variant = product.variants.id(variantId);
        if (!variant) {
            return res.json({
                success: false,
                message: 'Variant not found'
            });
        }
        
        variant.stock = parseInt(stock);
        await product.save();
        
        res.json({
            success: true,
            message: 'Stock updated successfully'
        });
    } catch (error) {
        console.error('Update stock error:', error);
        res.json({
            success: false,
            message: 'Failed to update stock'
        });
    }
};
