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
    const newUser = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        isVerified: true
    });
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

// Update user avatar
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

// Get user avatar URL
export const getUserAvatar = async (userId) => {
    try {
        const user = await User.findById(userId).select('profileImage');
        return user ? user.profileImage : null;
    } catch (error) {
        return null;
    }
};