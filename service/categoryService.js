import Category from "../models/Category.js";
//ser pagi fil
export async function getCategories(filters={}){
    const {search,status,page=1,limit=10,sort='desc'}=filters

    const query={isDeleted:false}
    if(search){
        query.$or=[
            {name:{$regex:search,$option:'i'}},
            {description:{$regex:search,$option:'i'}}
        ]
    }
    if (status) {
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
        { returnDocument: 'after', runValidators: true }
    );
}
export async function deleteCategory(categoryId) {
    return await Category.findByIdAndUpdate(
        categoryId,
        { isDeleted: true },
        { returnDocument: 'after' }
    );
}

// Toggle category status
export async function toggleCategoryStatus(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) return null;
    
    category.status = category.status === 'active' ? 'inactive' : 'active';
    return await category.save();
}
export async function categoryNameExists(name, excludeId = null) {
    const query = { name: { $regex: new RegExp(`^${name}$`, 'i') }, isDeleted: false };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
     return await Category.findOne(query);
}