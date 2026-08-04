import { query } from "express-validator";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
export async function getCategories(filters={}){
    
    const {search,status,page=1,limit=10,sort='desc'}=filters

    const query={isDeleted:false}
    if(search && search.trim()){
        const searchRegex = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or=[
            {name:{$regex:searchRegex,$options:'i'}},
            {description:{$regex:searchRegex,$options:'i'}}
        ]
    }
    if (status && status !== 'all') {
        query.status = status;
    }
    
    const skip = (page - 1) * limit;
    const sortOrder = sort === 'asc' ? 1 : -1;

    const categories = await Category.find(query)
        
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(parseInt(limit));
    const total = await Category.countDocuments(query);
 
    return {
        categories,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
    };
}

export async function getCategoryById(categoryId) {
    return await Category.findOne({ _id: categoryId, isDeleted: false });

}

export async function createCategory(categoryData) {
    const category = new Category(categoryData);
    return await category.save();
}

export async function updateCategory(categoryId, updateData) {
   
    return await Category.findByIdAndUpdate(
        categoryId,
        updateData,

        { new: true, runValidators: true }
    );
}

export async function deleteCategory(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) return null;
    const deletedName = `${category.name}_deleted_${Date.now()}`;
    return await Category.findByIdAndUpdate(
        categoryId,
        { isDeleted: true, name: deletedName },
        { new: true }
    );
}

export async function toggleCategoryStatus(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) return null;
    category.status = category.status === 'active' ? 'inactive' : 'active';
    return await category.save();
}

export async function categoryNameExists(name, excludeId = null) {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = { 
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }, 
        isDeleted: false 
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return await Category.findOne(query);
}
