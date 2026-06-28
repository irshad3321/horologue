import bcrypt from 'bcryptjs';

// Generate random OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash password
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

// Compare password
export const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing password');
  }
};

export const getOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000); 
};

// Check if OTP is expired
export const isOTPExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};

export const formatPhoneNumber = (phone) => {
  return phone.replace(/\D/g, ''); 
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Convert date to IS
export const toIST = (date) => {
  if (!date) return null;
  
  const istDate = new Date(date);
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(istDate.getTime() + istOffset);
}
export const formatISTDate = (date) => {
  if (!date) return 'N/A';
  
  const istDate = new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  return istDate;
};

// Generate unique referral code
export const generateReferralCode = () => {
  return 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

