import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to upload image to Cloudinary
export async function uploadToCloudinary(file, folder, options = {}) {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: `horologue/${folder}`,
            ...options
        });
        return result;
    } catch (error) {
        throw new Error('Failed to upload to Cloudinary');
    }
}

// Function to delete image from Cloudinary
export async function deleteFromCloudinary(publicId) {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        throw new Error('Failed to delete from Cloudinary');
    }
}

export default cloudinary;