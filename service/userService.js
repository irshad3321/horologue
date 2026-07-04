import User from "../models/User.js";
import { validateEmail, validatePassword, validateName, validatePhone } from "../helper/validators.js";
// import User from '../models/User.js';
export { validatePassword };

export const validateRegistration = (userData) => {
    const { firstName, lastName, email, phone, password, confirmPassword } = userData;

    const firstNameValidation = validateName(firstName);
    if (!firstNameValidation.isValid) {
        return firstNameValidation;
    }

    const lastNameValidation = validateName(lastName);
    if (!lastNameValidation.isValid) {
        return lastNameValidation;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        return emailValidation;
    }

    if (phone) {
        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.isValid) {
            return phoneValidation;
        }
    }



    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        return passwordValidation;
    }

    if (password !== confirmPassword) {
        return { isValid: false, message: 'Passwords do not match' };
    }

    return { isValid: true, message: '' };
};

// Check if user exists
export const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

// Create new user
export const createUser = async (userData) => {
    const { referralCode } = userData;
    const { generateReferralCode } = await import('../helper/utils.js');
    
    let referrerId = null;
    const referralBonus = 100;
    
   
    if (referralCode && referralCode.trim() !== '') {
        const referrer = await User.findOne({ referralCode: referralCode.trim() });
        
        if (!referrer) {
            throw new Error('Invalid referral code');
        }
        
        referrerId = referrer._id;
        
       
        referrer.wallet.balance += referralBonus;
        referrer.referralEarnings = (referrer.referralEarnings || 0) + referralBonus;
        referrer.wallet.transactions.push({
            type: 'credit',
            amount: referralBonus,
            description: `Referral bonus for inviting ${userData.firstName}`,
            date: new Date()
        })
        
       
        if (!referrer.referralHistory) {
            referrer.referralHistory = [];
        }
        referrer.referralHistory.push({
            referredUserName: `${userData.firstName} ${userData.lastName}`,
            amount: referralBonus,
            date: new Date()
        });
        
        await referrer.save();
    }
    
    const newUser = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        isVerified: true,
        referralCode: generateReferralCode(),
        referredBy: referrerId,
        referralEarnings: 0
    });
    
   
    if (referrerId) {
        newUser.wallet.balance = referralBonus;
        newUser.wallet.transactions.push({
            type: 'credit',
            amount: referralBonus,
            description: 'Welcome bonus for using referral code',
            date: new Date()
        });
    }
    
    return await newUser.save();
};

// Validate login
export const validateLogin = async (email, password) => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        return emailValidation;
    }
    

    const user = await User.findOne({ email });
    if (!user) {
        return { isValid: false, message: 'Invalid email or password' };
    }

    if (user.isBlocked) {
        return { isValid: false, message: 'Your account has been blocked. Please contact support.' };
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        return { isValid: false, message: 'Invalid email or password' };
    }
    
   
    if (!user.referralCode) {
        const { generateReferralCode } = await import('../helper/utils.js');
        user.referralCode = generateReferralCode();
        if (user.referralEarnings === undefined) {
            user.referralEarnings = 0;
        }
        await user.save();
    }

    return { isValid: true, user };
};
export const getUserById=async(userId)=>{
    try{
        const user=await User.findById(userId)
        return user
    }catch(error){
        return null
    }
};
export const updateUser=async(userId,firstName,lastName,phone)=>{

    try{
        const user=await User.findByIdAndUpdate(userId,
            {firstName,lastName,phone},
            {returnDocument: 'after'}
        )
        return user
    }catch(error){
        return null
    }

}
export const updateUserEmail=async(userId,email)=>{
    try {
        const user=await User.findByIdAndUpdate(userId,
            {email},
            {returnDocument: 'after'}
        )
        return user
    }catch(error){
        return null
    }
}
export const checkEmailExists=async(email,userId)=>{
    try {
        const user=await User.findOne({
            email:email,
            _id:{$ne:userId}
        })
        return user?true:false
    }catch(error){
        return false;
    }
}


export const updateUserAvatar = async (userId, avatarUrl) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { profileImage: avatarUrl },
            { returnDocument: 'after' }
        );
        return user;
    } catch (error) {
        console.error('Error updating user avatar:', error);
        return null;
    }
};


export const getUserAvatar = async (userId) => {
    try {
        const user = await User.findById(userId).select('profileImage');
        return user ? user.profileImage : null;
    } catch (error) {
        return null;
    }
};