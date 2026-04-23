import OTP from "../models/OTP.js";
import { generateOTP } from "../helper/utils.js";
import { validateOTP } from "../helper/validators.js";
import { sendOTPEmail } from "./emailService.js";

// Generate and save OTP
export const generateAndSaveOTP = async (email, purpose) => {
    try {
        const otp = generateOTP();
        
        await OTP.create({
            email,
            otp,
            purpose
        });
        
        // Send OTP via email
        const emailResult = await sendOTPEmail(email, otp, purpose);
        
        if (!emailResult.success) {
            console.error(`Failed to send OTP to ${email}:`, emailResult.error);
            throw new Error(`Failed to send OTP: ${emailResult.error}`);
        }
        
        return otp;
    } catch (error) {
        console.error('Error in generateAndSaveOTP:', error);
        throw error;
    }
};

// Get latest OTP creation time for timer calculation
export const getLatestOTPCreationTime = async (email, purpose) => {
    try {
        const latestOTP = await OTP.findOne({
            email,
            purpose,
            isUsed: false
        }).sort({ createdAt: -1 });
        
        return latestOTP ? latestOTP.createdAt : null;
    } catch (error) {
        console.error('Error getting OTP creation time:', error);
        return null;
    }
};

// Verify OTP
export const verifyOTP = async (email, otp, purpose) => {
    const otpValidation = validateOTP(otp);
    if (!otpValidation.isValid) {
        return otpValidation;
    }
    
    // Find the latest OTP for this email and purpose
    const otpRecord = await OTP.findOne({
        email,
        purpose
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
        return { isValid: false, message: 'No OTP found for this email' };
    }
    
    if (otpRecord.isUsed) {
        return { isValid: false, message: 'OTP already used' };
    }
    
    if (otpRecord.expiresAt <= new Date()) {
        return { isValid: false, message: 'OTP expired' };
    }
    
    if (otpRecord.otp !== otp) {
        return { isValid: false, message: 'Invalid OTP' };
    }
    
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    return { isValid: true, message: 'OTP verified successfully' };
};