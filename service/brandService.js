import Brand from '../models/Brand.js';

// Get all brands with pagination and search
export async function getAllBrands(page = 1, limit = 5, search = '', status = '') {
    const skip = (page - 1) * limit;
    
    const query = { isDeleted: false };
    if (status && status.trim() !== '') {
        query.status = status;
    }
    if (search && search.trim() !== '') {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    
    const brands = await Brand.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    
    const total = await Brand.countDocuments(query);
    
    return {
        brands,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
    };
}

// Get all active brands 
export async function getActiveBrands() {
    return await Brand.find({ status: 'active', isDeleted: false })
        .sort({ name: 1 })
        .select('name');
}

export async function getBrandById(brandId) {
    const brand = await Brand.findOne({ _id: brandId, isDeleted: false });
    if (!brand) {
        throw new Error('Brand not found');
    }
    return brand;
}

// Create new brand
export async function createBrand(name, description) {
    // Check if brand already exists
    const existingBrand = await Brand.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isDeleted: false 
    });
    
    if (existingBrand) {
        throw new Error('Brand already exists');
    }
    
    const brand = new Brand({
        name: name.trim(),
        description: description?.trim() || ''
    });
    
    await brand.save();
    return brand;
}

// Update brand
export async function updateBrand(brandId, name, description, status) {
    const brand = await Brand.findOne({ _id: brandId, isDeleted: false });
    
    if (!brand) {
        throw new Error('Brand not found');
    }
    if (name !== brand.name) {
        const existingBrand = await Brand.findOne({
            _id: { $ne: brandId },
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            isDeleted: false
        });
        
        if (existingBrand) {
            throw new Error('Brand name already exists');
        }
    }
    
    brand.name = name.trim();
    brand.description = description?.trim() || '';
    brand.status = status;
    
    await brand.save();
    return brand;
}

// Delete brand (soft delete)
export async function deleteBrand(brandId) {
    const brand = await Brand.findOne({ _id: brandId, isDeleted: false });
    
    if (!brand) {
        throw new Error('Brand not found');
    }
    
    brand.isDeleted = true;
    await brand.save();
    
    return brand;
}

export async function toggleBrandStatus(brandId) {
    const brand = await Brand.findOne({ _id: brandId, isDeleted: false });
    
    if (!brand) {
        throw new Error('Brand not found');
    }
    
    brand.status = brand.status === 'active' ? 'inactive' : 'active';
    await brand.save();
    
    return brand;
}
