import { HTTP_STATUS } from '../../helper/constants.js';
import Coupon from '../../models/Coupon.js';

// Show coupons page
export const showCoupons = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;
        
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);
        
        const coupons = await Coupon.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.render('admin/coupons', {
            admin: req.session.user,
            currentPage: 'coupons',
            coupons: coupons,
            currentPageNum: page,
            totalPages: totalPages,
            totalCoupons: totalCoupons
        });
    } catch (error) {
        console.error('Show coupons error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500');
    }
}

// Get all coupons API
export const getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            coupons: coupons
        });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.json({
            success: false,
            message: 'Failed to fetch coupons'
        });
    }
};

// Create coupon
export const createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxDiscount,
            validFrom,
            validUntil,
            usageLimit,
            status,
            description
        } = req.body;
        
        const existingCoupon = await Coupon.findOne({ 
            code: code.toUpperCase() 
        });
        
        if (existingCoupon) {
            return res.json({
                success: false,
                message: 'Coupon code already exists'
            });
        }
        
        // Validate dates
        const fromDate = new Date(validFrom);
        const untilDate = new Date(validUntil);
        
        if (untilDate <= fromDate) {
            return res.json({
                success: false,
                message: 'Valid until date must be after valid from date'
            });
        }
        
        // Validate discount value
        if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
            return res.json({
                success: false,
                message: 'Percentage discount must be between 1 and 100'
            });
        }
        
        if (discountType === 'fixed' && discountValue <= 0) {
            return res.json({
                success: false,
                message: 'Fixed discount must be greater than 0'
            });
        }

        // Validate minPurchase vs discount amount
        if (discountType === 'fixed' && parseFloat(minPurchase) <= parseFloat(discountValue)) {
            return res.json({
                success: false,
                message: 'Minimum purchase amount must be greater than the discount amount'
            });
        }

        if (discountType === 'percentage' && maxDiscount && parseFloat(minPurchase) <= parseFloat(maxDiscount)) {
            return res.json({
                success: false,
                message: 'Minimum purchase amount must be greater than the maximum discount amount'
            });
        }
        
        const coupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue),
            minPurchase: parseFloat(minPurchase),
            maxDiscount: parseFloat(maxDiscount),
            validFrom: fromDate,
            validUntil: untilDate,
            usageLimit: parseInt(usageLimit),
            status,
            description: description || ''
        });
        
        await coupon.save();
        
        res.json({
            success: true,
            message: 'Coupon created successfully',
            coupon: coupon
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.json({
            success: false,
            message: 'Failed to create coupon'
        });
    }
};

// Update coupon
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxDiscount,
            validFrom,
            validUntil,
            usageLimit,
            status,
            description
        } = req.body;
        
        const coupon = await Coupon.findById(id);
        
        if (!coupon) {
            return res.json({
                success: false,
                message: 'Coupon not found'
            });
        }
        
        // Check if code is being changed and if new code exists
        if (code.toUpperCase() !== coupon.code) {
            const existingCoupon = await Coupon.findOne({ 
                code: code.toUpperCase(),
                _id: { $ne: id }
            });
            
            if (existingCoupon) {
                return res.json({
                    success: false,
                    message: 'Coupon code already exists'
                });
            }
        }
        
        // Validate dates
        const fromDate = new Date(validFrom);
        const untilDate = new Date(validUntil);
        
        if (untilDate <= fromDate) {
            return res.json({
                success: false,
                message: 'Valid until date must be after valid from date'
            });
        }
        
        // Validate discount value
        if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
            return res.json({
                success: false,
                message: 'Percentage discount must be between 1 and 100'
            });
        }
        
        if (discountType === 'fixed' && discountValue <= 0) {
            return res.json({
                success: false,
                message: 'Fixed discount must be greater than 0'
            });
        }

        // Validate minPurchase vs discount amount
        if (discountType === 'fixed' && parseFloat(minPurchase) <= parseFloat(discountValue)) {
            return res.json({
                success: false,
                message: 'Minimum purchase amount must be greater than the discount amount'
            });
        }

        if (discountType === 'percentage' && maxDiscount && parseFloat(minPurchase) <= parseFloat(maxDiscount)) {
            return res.json({
                success: false,
                message: 'Minimum purchase amount must be greater than the maximum discount amount'
            });
        }
        
        coupon.code = code.toUpperCase();
        coupon.discountType = discountType;
        coupon.discountValue = parseFloat(discountValue);
        coupon.minPurchase = parseFloat(minPurchase);
        coupon.maxDiscount = parseFloat(maxDiscount);
        coupon.validFrom = fromDate;
        coupon.validUntil = untilDate;
        coupon.usageLimit = parseInt(usageLimit);
        coupon.status = status;
        coupon.description = description || '';
        
        await coupon.save();
        
        res.json({
            success: true,
            message: 'Coupon updated successfully',
            coupon: coupon
        });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.json({
            success: false,
            message: 'Failed to update coupon'
        });
    }
};

// Toggle coupon status
export const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const coupon = await Coupon.findById(id);
        
        if (!coupon) {
            return res.json({
                success: false,
                message: 'Coupon not found'
            });
        }
        
        coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
        await coupon.save();
        
        res.json({
            success: true,
            message: `Coupon ${coupon.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            coupon: coupon
        });
    } catch (error) {
        console.error('Toggle coupon error:', error);
        res.json({
            success: false,
            message: 'Failed to toggle coupon status'
        });
    }
};

// Delete coupon
export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        
        const coupon = await Coupon.findByIdAndDelete(id);
        
        if (!coupon) {
            return res.json({
                success: false,
                message: 'Coupon not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.json({
            success: false,
            message: 'Failed to delete coupon'
        });
    }
};

// Get coupon by ID
export const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const coupon = await Coupon.findById(id);
        
        if (!coupon) {
            return res.json({
                success: false,
                message: 'Coupon not found'
            });
        }
        
        res.json({
            success: true,
            coupon: coupon
        });
    } catch (error) {
        console.error('Get coupon error:', error);
        res.json({
            success: false,
            message: 'Failed to fetch coupon'
        });
    }
};
