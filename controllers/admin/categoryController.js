import Product from '../../models/Product.js';
import * as categoryService from '../../service/categoryService.js';
export async function getCategoriesPage(req, res) {
    try {
        const { search, status, page = 1 } = req.query;
        
        const filters = {
            search,
            status,
            page,
            limit: 10,
            sort: 'desc'
        };
        
        const result = await categoryService.getCategories(filters);
        res.render('admin/category', {
            admin: req.session.user,
            currentPage: 'category',
            categories: result.categories,
            search: search || '',
            status: status || '',
            currentPageNum: result.page,
            totalPages: result.totalPages,
            total: result.total
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).render('error/500');
    }
}

// Create category
export async function createCategory(req, res) {
    try {
        const { name, description, offer, status } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'Category name is required' 
            });
        }
        const exists = await categoryService.categoryNameExists(name);
        if (exists) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category name already exists' 
            });
        }
        const category = await categoryService.createCategory({
            name: name.trim(),
            description: description?.trim() || '',
            offer: offer || 0,
            status: status || 'active'
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Category created successfully',
            category 
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create category' 
        });
    }
}

// Update category
export async function updateCategory(req, res) {
    try {
        const { categoryId } = req.params;
        const { name, description, offer, status } = req.body;
        
        // Validation
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'Category name is required' 
            });
        }
        const category = await categoryService.getCategoryById(categoryId);
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }
        const exists = await categoryService.categoryNameExists(name, categoryId);
        if (exists) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category name already exists' 
            });
        }
        const updatedCategory = await categoryService.updateCategory(categoryId, {
            name: name.trim(),
            description: description?.trim() || '',
            offer: offer || 0,
            status: status || 'active'
        });
        
        res.json({ 
            success: true, 
            message: 'Category updated successfully',
            category: updatedCategory 
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update category' 
        });
    }
}

// Delete category
export async function deleteCategory(req, res) {
    try {
        const { categoryId } = req.params
        const category = await categoryService.getCategoryById(categoryId)
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }
        await categoryService.deleteCategory(categoryId);
        
        res.json({ 
            success: true, 
            message: 'Category deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete category' 
        });
    }
}
export async function toggleCategoryStatus(req, res) {
    try {
        const { categoryId } = req.params;
        
        const category = await categoryService.toggleCategoryStatus(categoryId);
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Category ${category.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            status: category.status 
        });
    } catch (error) {
        console.error('Error toggling category status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to toggle category status' 
        });
    }
}
export async function getCategoryById(req, res) {
    try {
        const { categoryId } = req.params;
        
        const category = await categoryService.getCategoryById(categoryId);
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }
        
        res.json({ 
            success: true, 
            category 
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch category' 
        });
    }
}
