import * as productService from '../../service/productService.js';
import * as categoryService from '../../service/categoryService.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../config/cloudinary.js'
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
        res.status(500).render('error/500');
    }
}
export async function getAddProductPage(req, res) {
    try {
        const categories = await categoryService.getCategories({ limit: 100, status: 'active' });
        
        res.render('admin/add-product', {
            admin: req.session.user,
            currentPage: 'products',
            categories: categories.categories
        });
    } catch (error) {
        console.error('Error loading add product page:', error);
        res.status(500).render('error/500');
    }
}
export async function getEditProductPage(req, res) {
    try {
        const { productId } = req.params;
        
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(404).render('error/404');
        }
        
        const categories = await categoryService.getCategories({ limit: 100, status: 'active' });
        
        res.render('admin/edit-product', {
            admin: req.session.user,
            currentPage: 'products',
            product,
            productId,
            categories: categories.categories
        });
    } catch (error) {
        console.error('Error loading edit product page:', error);
        res.status(500).render('error/500');
    }
}

// Get product by ID (API endpoint)
export async function getProductById(req, res) {
    try {
        const { productId } = req.params;
        
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(404).json({ 
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch product' 
        });
    }
}

export async function createProduct(req, res) {
    try {
        const { name, brand, category, description, offer, status, premium, variants } = req.body;
        if (!name || !brand || !category) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, brand, and category are required' 
            });
        }
        
        if (!variants || variants.length === 0) {
            return res.status(400).json({ 
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
        res.status(201).json({ 
            success: true, 
            message: 'Product created successfully',
            product 
        })
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ 
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
            return res.status(400).json({ 
                success: false, 
                message: 'Name, brand, and category are required' 
            });
        }
        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(404).json({ 
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
        res.status(500).json({ 
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
            return res.status(404).json({ 
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
        res.status(500).json({ 
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
            return res.status(404).json({ 
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to toggle product status' 
        })
    }
}
export async function uploadVariantImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ 
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload image' 
        })
    }
}
export async function deleteVariantImage(req, res) {
    try {
        const { publicId } = req.body;
        
        if (!publicId) {
            return res.status(400).json({ 
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete image' 
        });
    }
}
