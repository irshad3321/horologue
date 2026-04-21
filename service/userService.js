import User from "../models/User.js";
import { validateEmail, validatePassword, validateName, validatePhone } from "../helper/validators.js";

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