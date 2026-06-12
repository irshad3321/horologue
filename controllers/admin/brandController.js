import * as brandService from '../../service/brandService.js';

// Show brands page
export const showBrands = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const result = await brandService.getAllBrands(page, 5, search, status);
        
        res.render('admin/brands', {
            admin: req.session.user,
            brands: result.brands,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            total: result.total,
            search: search,
            status: status
        });
    } catch (error) {
        console.error('Show brands error:', error);
        res.status(500).render('error/500');
    }
};

// Get brand by ID API
export const getBrandById = async (req, res) => {
    try {
        const brandId = req.params.id;
        const brand = await brandService.getBrandById(brandId);
        
        res.json({
            success: true,
            brand: brand
        });
    } catch (error) {
        console.error('Get brand error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

// Create brand API
export const createBrand = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name || name.trim() === '') {
            return res.json({
                success: false,
                message: 'Brand name is required'
            });
        }
        
        const brand = await brandService.createBrand(name, description);
        
        res.json({
            success: true,
            message: 'Brand created successfully',
            brand: brand
        });
    } catch (error) {
        console.error('Create brand error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

// Update brand API
export const updateBrand = async (req, res) => {
    try {
        const brandId = req.params.id;
        const { name, description, status } = req.body;
        
        if (!name || name.trim() === '') {
            return res.json({
                success: false,
                message: 'Brand name is required'
            });
        }
        
        const brand = await brandService.updateBrand(brandId, name, description, status);
        
        res.json({
            success: true,
            message: 'Brand updated successfully',
            brand: brand
        });
    } catch (error) {
        console.error('Update brand error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

// Delete brand API
export const deleteBrand = async (req, res) => {
    try {
        const brandId = req.params.id;
        await brandService.deleteBrand(brandId);
        
        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });
    } catch (error) {
        console.error('Delete brand error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

// Toggle brand status API
export const toggleBrandStatus = async (req, res) => {
    try {
        const brandId = req.params.id;
        const brand = await brandService.toggleBrandStatus(brandId);
        
        res.json({
            success: true,
            message: `Brand ${brand.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            status: brand.status
        });
    } catch (error) {
        console.error('Toggle brand status error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
};
