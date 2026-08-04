import Address from '../models/Address.js';

// Get all addressdes for a user
export const getUserAddresses = async (userId, page = 1, limit = 5) => {
    try {
        const skip = (page - 1) * limit;
        
        const addresses = await Address.find({ userId })
            .sort({ isDefault: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        const total = await Address.countDocuments({ userId });
        
        return {
            addresses,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    } catch (error) {
        console.error('Error fetching user addresses:', error);
        return {
            addresses: [],
            pagination: {
                currentPage: 1,
                totalPages: 0,
                total: 0,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    }
};

// Create new address
export const createAddress = async (userId, addressData) => {

    try {
      
        const address = new Address({
            userId,
            ...addressData
        });
        
        const savedAddress = await address.save();
        return { success: true, address: savedAddress };
    } catch (error) {
        console.error('Error creating address:', error);
        return { success: false, message: error.message };
    }
};

// Update address
export const updateAddress = async (userId, addressId, addressData) => {
    try {
        const address = await Address.findOne({ _id: addressId, userId });
        
        if (!address) {
            return { success: false, message: 'Address not found' };
        }
        
        Object.assign(address, addressData);
        const updatedAddress = await address.save();
        
        return { success: true, address: updatedAddress };
    } catch (error) {
        console.error('Error updating address:', error);
        return { success: false, message: error.message };
    }
};

// Delete address
export const deleteAddress = async (userId, addressId) => {
    try {
        const address = await Address.findOne({ _id: addressId, userId });
        
        if (!address) {
            return { success: false, message: 'Address not found' };
        }
        
        await Address.deleteOne({ _id: addressId, userId });
        return { success: true, message: 'Address deleted successfully' };
    } catch (error) {
        console.error('Error deleting address:', error);
        return { success: false, message: error.message };
    }
};

// Set default address
export const setDefaultAddress = async (userId, addressId) => {
    try {
        const address = await Address.findOne({ _id: addressId, userId });
        
        if (!address) {
            return { success: false, message: 'Address not found' };
        }
        
        await Address.updateMany({ userId }, { isDefault: false });
        
        address.isDefault = true;
        await address.save();
        
        return { success: true, message: 'Default address updated successfully' };
    } catch (error) {
        console.error('Error setting default address:', error);
        return { success: false, message: error.message };
    }
};

// Validate address data
export const validateAddressData = (addressData) => {
    const errors = [];
    
    if (!addressData.fullName || addressData.fullName.trim().length < 3 || addressData.fullName.trim().length > 50) {
        errors.push('Full name must be between 3 and 50 characters long');
    } else if (!/^[a-zA-Z\s]+$/.test(addressData.fullName.trim())) {
        errors.push('Full name can only contain alphabets and spaces');
    }
    
    if (!addressData.phoneNumber || !/^\d{10}$/.test(addressData.phoneNumber) || /^0{10}$/.test(addressData.phoneNumber)) {
        errors.push('Please enter a valid 10-digit phone number');
    }
    
    if (!addressData.addressLine1 || addressData.addressLine1.trim().length < 5) {
        errors.push('Address line 1 must be at least 5 characters long');
    }
    
    if (!addressData.city || addressData.city.trim().length < 2) {
        errors.push('City must be at least 2 characters long');
    } else if (!/^[a-zA-Z\s]+$/.test(addressData.city.trim())) {
        errors.push('City can only contain alphabets and spaces');
    }
    
    if (!addressData.state || addressData.state.trim().length < 2) {
        errors.push('State must be at least 2 characters long');
    } else if (!/^[a-zA-Z\s]+$/.test(addressData.state.trim())) {
        errors.push('State can only contain alphabets and spaces');
    }
    
    if (!addressData.pincode || !/^\d{6}$/.test(addressData.pincode) || /^0{6}$/.test(addressData.pincode)) {
        errors.push('Please enter a valid 6-digit pincode');
    }
    
    if (addressData.addressType && !['home', 'work', 'other'].includes(addressData.addressType)) {
        errors.push('Invalid address type');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};