// Empty file - you will write validation functions here
// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    isValid: emailRegex.test(email),
    message: emailRegex.test(email) ? '' : 'Please enter a valid email address'
  };
};

// Password validation - Strong password requirements
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long`
    };
  }
  
  if (!hasUpperCase) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter (A-Z)'
    };
  }
  
  if (!hasLowerCase) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter (a-z)'
    };
  }
  
  if (!hasNumbers) {
    return {
      isValid: false,
      message: 'Password must contain at least one number (0-9)'
    };
  }
  
  if (!hasSpecialChar) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character (!@#$%^&*...)'
    };
  }
  
  return {
    isValid: true,
    message: 'Password is valid'
  };
};

// Phone validation (10 digits)
export const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return {
    isValid: phoneRegex.test(phone),
    message: phoneRegex.test(phone) ? '' : 'Please enter a valid 10-digit phone number',
  };
};

// Name validation
export const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s]{2,50}$/;
  return {
    isValid: nameRegex.test(name),
    message: nameRegex.test(name) ? '' : 'Name must be 2-50 characters and contain only letters'
  };
};

// OTP validation
export const validateOTP = (otp) => {
  const otpRegex = /^\d{6}$/;
  return {
    isValid: otpRegex.test(otp),
    message: otpRegex.test(otp) ? '' : 'OTP must be 6 digits'
  };
};

