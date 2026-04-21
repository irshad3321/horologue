import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send OTP email
export const sendOTPEmail = async (email, otp, purpose) => {
    try {
        const transporter = createTransporter();
        let subject, htmlContent;

        // Different email content based on purpose
        switch (purpose) {
            case 'signup':
                subject = 'Verify Your Email - Horologue';
                htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #333; margin: 0; font-size: 28px;">🕰️ Horologue</h1>
                            <p style="color: #666; margin: 10px 0 0 0;">Premium Watch Collection</p>
                        </div>
                        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Verify Your Email Address</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Welcome to Horologue! Please use the verification code below to complete your registration:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; display: inline-block;">
                                <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otp}</span>
                            </div>
                        </div>
                        <p style="color: #555; font-size: 14px; text-align: center; margin-bottom: 20px;">
                            This code will expire in <strong>5 minutes</strong>
                        </p>
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                <strong>Security Note:</strong> Never share this code with anyone. Horologue will never ask for your verification code.
                            </p>
                        </div>
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 12px; margin: 0;">If you didn't request this verification, please ignore this email.</p>
                            <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">© 2024 Horologue. All rights reserved.</p>
                        </div>
                    </div>
                </div>`;
                break;

            case 'forgot-password':
                subject = 'Reset Your Password - Horologue';
                htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #333; margin: 0; font-size: 28px;">🕰️ Horologue</h1>
                            <p style="color: #666; margin: 10px 0 0 0;">Premium Watch Collection</p>
                        </div>
                        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Reset Your Password</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            You requested to reset your password. Please use the verification code below:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f8f9fa; border: 2px dashed #dc3545; border-radius: 8px; padding: 20px; display: inline-block;">
                                <span style="font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 5px;">${otp}</span>
                            </div>
                        </div>
                        <p style="color: #555; font-size: 14px; text-align: center; margin-bottom: 20px;">
                            This code will expire in <strong>5 minutes</strong>
                        </p>
                        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                            <p style="color: #721c24; margin: 0; font-size: 14px;">
                                <strong>Security Alert:</strong> If you didn't request a password reset, please secure your account immediately.
                            </p>
                        </div>
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 12px; margin: 0;">If you didn't request this, please ignore this email.</p>
                            <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">© 2024 Horologue. All rights reserved.</p>
                        </div>
                    </div>
                </div>`;
                break;

            case 'admin-forgot-password':
                subject = 'Admin Password Reset - Horologue';
                htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #333; margin: 0; font-size: 28px;">🕰️ Horologue</h1>
                            <p style="color: #666; margin: 10px 0 0 0;">Admin Portal</p>
                        </div>
                        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Admin Password Reset</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            An admin password reset was requested for your account. Please use the verification code below:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f8f9fa; border: 2px dashed #000; border-radius: 8px; padding: 20px; display: inline-block;">
                                <span style="font-size: 32px; font-weight: bold; color: #000; letter-spacing: 5px;">${otp}</span>
                            </div>
                        </div>
                        <p style="color: #555; font-size: 14px; text-align: center; margin-bottom: 20px;">
                            This code will expire in <strong>5 minutes</strong>
                        </p>
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                <strong>Admin Security Alert:</strong> This is an admin account password reset. If you didn't request this, please contact system administrator immediately.
                            </p>
                        </div>
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 12px; margin: 0;">If you didn't request this reset, please contact support immediately.</p>
                            <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">© 2024 Horologue Admin Portal. All rights reserved.</p>
                        </div>
                    </div>
                </div>`;
                break;

            case 'email-change':
                subject = 'Verify New Email Address - Horologue';
                htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #333; margin: 0; font-size: 28px;">🕰️ Horologue</h1>
                            <p style="color: #666; margin: 10px 0 0 0;">Premium Watch Collection</p>
                        </div>
                        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Verify New Email Address</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Please verify your new email address using the code below:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f8f9fa; border: 2px dashed #28a745; border-radius: 8px; padding: 20px; display: inline-block;">
                                <span style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 5px;">${otp}</span>
                            </div>
                        </div>
                        <p style="color: #555; font-size: 14px; text-align: center; margin-bottom: 20px;">
                            This code will expire in <strong>5 minutes</strong>
                        </p>
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 12px; margin: 0;">If you didn't request this change, please contact support.</p>
                            <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">© 2024 Horologue. All rights reserved.</p>
                        </div>
                    </div>
                </div>`;
                break;

            default:
                subject = 'Verification Code - Horologue';
                htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Your Verification Code</h2>
                    <p>Your verification code is: <strong>${otp}</strong></p>
                    <p>This code will expire in 5 minutes.</p>
                </div>`;
        }

        const mailOptions = {
            from: `"Horologue" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false, error: error.message };
    }
};