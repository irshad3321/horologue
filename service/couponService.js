import Coupon from '../models/Coupon.js';
import User from '../models/User.js'
export const validateCoupon = async (code, orderAmount) => {
    try {
        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase(),
            status: 'active'
        });
        
        
        if (!coupon) {
            return { valid: false, message: 'Invalid coupon code' };
        }
        
        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            return { valid: false, message: 'Coupon has expired' };
        }
        
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return { valid: false, message: 'Coupon usage limit reached' };
        }
        
        if (orderAmount < coupon.minPurchase) {
            return { 
                valid: false, 
                message: `Minimum purchase of ₹${coupon.minPurchase} required` 
            };
        }
        
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (orderAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else {
            discount = coupon.discountValue;
        }
        
        // Ensure discount doesn't exceed order amount
        discount = Math.min(discount, orderAmount);
        
        return {
            valid: true,
            coupon: coupon,
            discount: Math.round(discount)
        };
        
    } catch (error) {
        console.error('Coupon validation error:', error);
        return { valid: false, message: 'Error validating coupon' };
    }
};

export const applyCoupon = async (couponId) => {
    try {
       
        await Coupon.findByIdAndUpdate(couponId, {
            $inc: { usedCount: 1 }
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
    }
};

export const getCouponByCode = async (code) => {
    try {
        return await Coupon.findOne({ 
            code: code.toUpperCase(),
            status: 'active'
        });
    } catch (error) {
        console.error('Error getting coupon:', error);
        return null;
    }
};
