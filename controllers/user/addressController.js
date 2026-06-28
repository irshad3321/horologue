import { 
    getUserAddresses, 
    createAddress, 
    updateAddress, 
    deleteAddress, 
    setDefaultAddress,
    validateAddressData 
} from '../../service/addressService.js';

export const getAddresses = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }
        const addresses = await getUserAddresses(userId);
        const arr=[]
        res.json({ success: true, addresses });
        
    } catch (error) {
        console.error('Get addresses error:', error);
        res.json({ success: false, message: 'Error fetching addresses' });
    }
};

// Add new address
export const addAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }
        
        const addressData = req.body   
        const validation = validateAddressData(addressData);
        if (!validation.isValid) {
            return res.json({ 
                success: false, 
                message: validation.errors.join(', ') 
            });
        }
        
        const result = await createAddress(userId, addressData);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Address added successfully',
                address: result.address 
            });
        } else {
            res.json({ 
                success: false, 
                message: result.message || 'Failed to add address' 
            });
        }
        
    } catch (error) {
        console.error('Add address error:', error);
        res.json({ success: false, message: 'Error adding address' });
    }
};

// Edit address
export const editAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        
        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }
        
        const addressData = req.body;
        const validation = validateAddressData(addressData);
        if (!validation.isValid) {
            return res.json({ 
                success: false, 
                message: validation.errors.join(', ') 
            });
        }
        
        const result = await updateAddress(userId, addressId, addressData);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Address updated successfully',
                address: result.address 
            });
        } else {
            res.json({ 
                success: false, 
                message: result.message || 'Failed to update address' 
            });
        }
        
    } catch (error) {
        console.error('Edit address error:', error);
        res.json({ success: false, message: 'Error updating address' });
    }
};

// Delete address
export const removeAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        
        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }
        
        const result = await deleteAddress(userId, addressId);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Address deleted successfully' 
            });
        } else {
            res.json({ 
                success: false, 
                message: result.message || 'Failed to delete address' 
            });
        }
        
    } catch (error) {
        console.error('Delete address error:', error);
        res.json({ success: false, message: 'Error deleting address' });
    }
};

// Set default address
export const setDefault = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        
        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }
        
        const result = await setDefaultAddress(userId, addressId);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Default address updated successfully' 
            });
        } else {
            res.json({ 
                success: false, 
                message: result.message || 'Failed to set default address' 
            });
        }
        
    } catch (error) {
        console.error('Set default address error:', error);
        res.json({ success: false, message: 'Error setting default address' });
    }
};