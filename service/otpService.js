import OTP from "../models/OTP.js";
import { generateOTP } from "../helper/utils.js";
import { validateOTP } from "../helper/validators.js";
import { sendOTPEmail } from "./emailService.js";

// Generate and save OTP
export const generateAndSaveOTP = async (email, purpose) => {
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
        // For development, still show OTP in console if email fails
        console.log(`OTP for ${email}: ${otp}`);
    }
    
    return otp;
};

// Verify OTP
export const verifyOTP = async (email, otp, purpose) => {
    const otpValidation = validateOTP(otp);
    if (!otpValidation.isValid) {
        return otpValidation;
    }
    
    const otpRecord = await OTP.findOne({
        email,
        otp,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    });
    
    if (!otpRecord) {
        return { isValid: false, message: 'Invalid or expired OTP' };
    }
    
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    return { isValid: true, message: 'OTP verified successfully' };
};