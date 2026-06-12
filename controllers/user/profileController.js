import { validatePassword, getUserById, updateUser, updateUserEmail, checkEmailExists, updateUserAvatar } from "../../service/userService.js";
import { generateAndSaveOTP, verifyOTP } from "../../service/otpService.js";
import { sendOTPEmail } from "../../service/emailService.js";
import { generateOTP } from "../../helper/utils.js";
import { deleteFromCloudinary } from "../../config/cloudinary.js";
import OTP from "../../models/OTP.js";

// Update profile
export const updateProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { firstName, lastName, phone } = req.body;

        if (!firstName || !lastName) {
            return res.json({ success: false, message: 'Name fields are required' });
        }

        const updatedUser = await updateUser(userId, firstName, lastName, phone);
        
        if (updatedUser) {
            // Update session with plain object, not Mongoose document
            req.session.user = {
                id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                profileImage: updatedUser.profileImage,
                isAdmin: updatedUser.isAdmin,
                createdAt: updatedUser.createdAt,
                googleId: updatedUser.googleId  // Include googleId
            };
            res.json({ success: true, message: 'Profile updated successfully' });
        } else {
            res.json({ success: false, message: 'Failed to update profile' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error updating profile' });
    }
};

// Send OTP for email change
export const sendEmailChangeOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { newEmail } = req.body;
        
        if (!newEmail) {
            return res.json({ success: false, message: 'Email is required' });
        }
        
        const emailExists = await checkEmailExists(newEmail, userId);
        if (emailExists) {
            return res.json({ success: false, message: 'Email already exists' });
        }
        
        // Generate and send OTP
        const otp = generateOTP();
        await OTP.create({
            email: newEmail,
            otp,
            purpose: 'email-change'
        });
        
        const emailResult = await sendOTPEmail(newEmail, otp, 'email-change');
        if (emailResult.success) {
            req.session.newEmail = newEmail;
            res.json({ success: true, message: 'OTP sent to new email' });
        } else {
            res.json({ success: false, message: 'Failed to send email' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error sending OTP' });
    }
};

// Verify email change OTP
export const verifyEmailChangeOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { otp } = req.body;
        const newEmail = req.session.newEmail;
        if (!otp) {
            return res.json({ success: false, message: 'OTP is required' });
        }
        if (!newEmail) {
            return res.json({ success: false, message: 'No email change request found' });
        }
        // Verify OTP
        const otpResult = await verifyOTP(newEmail, otp, 'email-change');
        if (otpResult.isValid) {
            const updatedUser = await updateUserEmail(userId, newEmail);
            if (updatedUser) {
                req.session.user = {
                    id: updatedUser._id,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    profileImage: updatedUser.profileImage,
                    isAdmin: updatedUser.isAdmin
                };
                delete req.session.newEmail;
                res.json({ success: true, message: 'Email updated successfully' });
            } else {
                res.json({ success: false, message: 'Failed to update email' });
            }
        } else {
            res.json({ success: false, message: otpResult.message });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error verifying OTP' });
    }
};

export const resendEmailChangeOTP = async (req, res) => {
    try {
        const newEmail = req.session.newEmail;

        if (!newEmail) {
            return res.json({ success: false, message: 'No email change request found' });
        }
        
        // Generate and send new OTP
        const otp = generateOTP();
        await OTP.create({
            email: newEmail,
            otp,
            purpose: 'email-change'
        });
        
        const emailResult = await sendOTPEmail(newEmail, otp, 'email-change');
        if (emailResult.success) {
            res.json({ success: true, message: 'New OTP sent' });
        } else {
            res.json({ success: false, message: 'Failed to send email' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error sending OTP' });
    }
};

// Upload avatar
export const uploadAvatar = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }

        if (!req.file) {
            return res.json({ success: false, message: 'No image file provided' });
        }

        // Get current user to check if they have an existing avatar
        const currentUser = await getUserById(userId);
        
        if (currentUser && currentUser.profileImage) {
            try {
                const urlParts = currentUser.profileImage.split('/');
                const publicIdWithExtension = urlParts[urlParts.length - 1];
                const publicId = `horologue/avatars/${publicIdWithExtension.split('.')[0]}`;
                await deleteFromCloudinary(publicId);
            } catch (deleteError) {
                console.error('Error deleting old avatar:', deleteError);
            }
        }

        // Update user with new avatar URL
        const updatedUser = await updateUserAvatar(userId, req.file.path);
        
        if (updatedUser) {
            req.session.user = {
                id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                profileImage: updatedUser.profileImage,
                isAdmin: updatedUser.isAdmin,
                createdAt: updatedUser.createdAt
            };
            
            res.json({ 
                success: true, 
                message: 'Avatar updated successfully',
                avatarUrl: req.file.path,
                user: req.session.user
            });
        } else {
            res.json({ success: false, message: 'Failed to update avatar in database' });
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.json({ success: false, message: 'Error uploading avatar: ' + error.message });
    }
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }

        // Get current user
        const currentUser = await getUserById(userId);
        
        if (currentUser && currentUser.profileImage) {
            try {
                const urlParts = currentUser.profileImage.split('/');
                const publicIdWithExtension = urlParts[urlParts.length - 1];
                const publicId = `horologue/avatars/${publicIdWithExtension.split('.')[0]}`;
                await deleteFromCloudinary(publicId);
            } catch (deleteError) {
                console.error('Error deleting avatar from Cloudinary:', deleteError);
            }
        }

        // Update user to remove avatar
        const updatedUser = await updateUserAvatar(userId, null);
        
        if (updatedUser) {
            // Update session with fresh user data
            req.session.user = {
                id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                profileImage: updatedUser.profileImage,
                isAdmin: updatedUser.isAdmin
            };
            
            res.json({ 
                success: true, 
                message: 'Avatar deleted successfully',
                user: req.session.user
            });
        } else {
            res.json({ success: false, message: 'Failed to delete avatar' });
        }
    } catch (error) {
        console.error('Avatar delete error:', error);
        res.json({ success: false, message: 'Error deleting avatar' });
    }
};

// Change password with current password verification
export const changePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }

        // Get current user
        const user = await getUserById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Check if user is Google OAuth user
        const isGoogleUser = !!user.googleId;

        // For regular users, verify current password
        if (!isGoogleUser) {
            if (!currentPassword) {
                return res.json({ success: false, message: 'Current password is required' });
            }
            
            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                return res.json({ success: false, message: 'Current password is incorrect' });
            }
        }

        // Validate new password
        if (newPassword !== confirmPassword) {
            return res.json({ success: false, message: 'New passwords do not match' });
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.json({ success: false, message: passwordValidation.message });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        const successMessage = isGoogleUser 
            ? 'Password set successfully. You can now login with email and password.' 
            : 'Password changed successfully';

        res.json({ success: true, message: successMessage });

    } catch (error) {
        console.error('Change password error:', error);
        res.json({ success: false, message: 'Error changing password' });
    }
};

// Send OTP for change password (forgot password mode)
export const sendChangePasswordOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { email } = req.body;

        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }

        // Get current user
        const user = await getUserById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (user.email !== email) {
            return res.json({ success: false, message: 'Invalid request' });
        }

        // Check if user is Google OAuth user
        if (user.googleId) {
            return res.json({ success: false, message: 'Google users can set password directly without OTP verification' });
        }

        // Check if user can send OTP (1 minute cooldown)
        const lastOTP = await OTP.findOne({
            email: user.email,
            purpose: 'change-password'
        }).sort({ createdAt: -1 });
        
        if (lastOTP) {
            const timeSinceLastOTP = Date.now() - lastOTP.createdAt.getTime();
            const oneMinute = 60 * 1000;
            
            if (timeSinceLastOTP < oneMinute) {
                const remainingTime = Math.ceil((oneMinute - timeSinceLastOTP) / 1000);
                return res.json({
                    success: false,
                    message: `Please wait ${remainingTime} seconds before requesting a new code.`
                });
            }
        }

        // Generate and send OTP
        const otp = await generateAndSaveOTP(user.email, 'change-password');
        
        res.json({ success: true, message: 'OTP sent to your email address' });

    } catch (error) {
        console.error('Send change password OTP error:', error);
        res.json({ success: false, message: 'Error sending OTP: ' + error.message });
    }
};

// Verify OTP for change password
export const verifyChangePasswordOTP = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { otp, newPassword, confirmPassword } = req.body;

        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }

        // Get current user
        const user = await getUserById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Verify OTP
        const otpResult = await verifyOTP(user.email, otp, 'change-password');
        if (!otpResult.isValid) {
            return res.json({ success: false, message: otpResult.message });
        }

        // Validate new password
        if (newPassword !== confirmPassword) {
            return res.json({ success: false, message: 'Passwords do not match' });
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.json({ success: false, message: passwordValidation.message });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Verify change password OTP error:', error);
        res.json({ success: false, message: 'Error verifying OTP' });
    }
};

// Resend OTP for change password
export const resendChangePasswordOTP = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.json({ success: false, message: 'Not authenticated' });
        }

        // Get current user
        const user = await getUserById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Check if user can resend (1 minute cooldown)
        const lastOTP = await OTP.findOne({
            email: user.email,
            purpose: 'change-password'
        }).sort({ createdAt: -1 });
        
        if (lastOTP) {
            const timeSinceLastOTP = Date.now() - lastOTP.createdAt.getTime();
            const oneMinute = 60 * 1000;
            
            if (timeSinceLastOTP < oneMinute) {
                const remainingTime = Math.ceil((oneMinute - timeSinceLastOTP) / 1000);
                return res.json({
                    success: false,
                    message: `Please wait ${remainingTime} seconds before requesting a new code.`
                });
            }
        }

        // Generate and send new OTP
        await generateAndSaveOTP(user.email, 'change-password');
        
        res.json({ success: true, message: 'New OTP sent to your email' });

    } catch (error) {
        console.error('Resend change password OTP error:', error);
        res.json({ success: false, message: 'Error sending OTP' });
    }
};