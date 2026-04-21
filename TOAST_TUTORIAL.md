# 🍞 Toast Notification System - Complete Guide

## Overview
The toast notification system provides elegant, non-intrusive notifications for user feedback. It includes both simple toast notifications and advanced SweetAlert2 dialogs.

## 📁 File Structure
```
views/partials/toast.ejs    # Toast system partial
```

## 🚀 Quick Start

### 1. Include Toast Partial
Add this to any EJS page where you want toast notifications:
```html
<%- include('../partials/toast') %>
```

### 2. Basic Toast Usage
```javascript
// Success notification
toastManager.success('Operation completed successfully!', 'Success');

// Error notification  
toastManager.error('Something went wrong!', 'Error');

// Warning notification
toastManager.warning('Please check your input', 'Warning');

// Info notification
toastManager.info('New update available', 'Information');
```

## 📋 Toast Methods

### `toastManager.success(message, title)`
```javascript
toastManager.success('User registered successfully!', 'Registration Complete');
toastManager.success('Email sent to your inbox');  // Title optional
```

### `toastManager.error(message, title)`
```javascript
toastManager.error('Invalid email or password', 'Login Failed');
toastManager.error('Network connection failed');
```

### `toastManager.warning(message, title)`
```javascript
toastManager.warning('Session will expire in 5 minutes', 'Session Warning');
toastManager.warning('Please save your work');
```

### `toastManager.info(message, title)`
```javascript
toastManager.info('New features available in settings', 'Update');
toastManager.info('Check your email for verification');
```

### `toastManager.show(message, type, title, duration)`
```javascript
// Custom toast with specific duration
toastManager.show('Custom message', 'success', 'Custom Title', 3000);

// Persistent toast (won't auto-dismiss)
toastManager.show('Important message', 'error', 'Critical', 0);
```

## 🎨 Toast Types & Colors

| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| `success` | Green | ✓ | Successful operations, confirmations |
| `error` | Red | ✕ | Errors, failures, validation issues |
| `warning` | Yellow | ⚠ | Warnings, cautions, important notices |
| `info` | Blue | ℹ | Information, tips, neutral messages |

## 🔧 Advanced Usage

### AJAX Form Submissions with Toast
```javascript
document.getElementById('myForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      toastManager.success(result.message, 'Success');
      // Optional: redirect after delay
      setTimeout(() => window.location.href = '/dashboard', 1500);
    } else {
      toastManager.error(result.message, 'Operation Failed');
    }
  } catch (error) {
    toastManager.error('Network error occurred', 'Connection Failed');
  }
});
```

### Controller Response Format
```javascript
// Success response
res.json({
  success: true,
  message: 'Operation completed successfully',
  data: { /* optional data */ }
});

// Error response
res.json({
  success: false,
  message: 'Operation failed: Invalid input'
});
```

## 🍭 SweetAlert2 Integration

### Basic Alert
```javascript
Swal.fire('Hello!', 'This is a basic alert', 'info');
```

### Confirmation Dialog
```javascript
Swal.fire({
  title: 'Are you sure?',
  text: 'This action cannot be undone',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonText: 'Yes, delete it!',
  cancelButtonText: 'Cancel'
}).then((result) => {
  if (result.isConfirmed) {
    // User confirmed
    toastManager.success('Item deleted successfully', 'Deleted');
  }
});
```

### Input Dialog
```javascript
Swal.fire({
  title: 'Enter your name',
  input: 'text',
  inputPlaceholder: 'Your name here...',
  showCancelButton: true
}).then((result) => {
  if (result.isConfirmed && result.value) {
    toastManager.success(`Hello, ${result.value}!`, 'Welcome');
  }
});
```

## 📱 Responsive Design
Toasts automatically adapt to mobile devices:
- **Desktop**: Fixed position top-right
- **Mobile**: Full width with margins

## ⚙️ Customization

### Custom Duration
```javascript
toastManager.success('Quick message', 'Fast', 2000);  // 2 seconds
toastManager.info('Persistent', 'Stay', 0);           // No auto-dismiss
```

### Manual Toast Removal
```javascript
const toast = toastManager.success('Manual control', 'Custom');
// Remove after 3 seconds manually
setTimeout(() => toastManager.removeToast(toast), 3000);
```

## 🎯 Real-World Examples

### Login Success
```javascript
if (loginResult.success) {
  toastManager.success(`Welcome back, ${user.firstName}!`, 'Login Successful');
  setTimeout(() => window.location.href = '/dashboard', 1500);
}
```

### Form Validation
```javascript
if (!email) {
  toastManager.error('Email is required', 'Validation Error');
  return;
}
if (!isValidEmail(email)) {
  toastManager.warning('Please enter a valid email address', 'Invalid Email');
  return;
}
```

### File Upload
```javascript
// Upload progress
toastManager.info('Uploading file...', 'Upload Started');

// Upload success
toastManager.success('File uploaded successfully', 'Upload Complete');

// Upload error
toastManager.error('Failed to upload file', 'Upload Failed');
```

### OTP Verification
```javascript
// OTP sent
toastManager.success('Verification code sent to your email', 'OTP Sent');

// OTP verified
toastManager.success('Email verified successfully', 'Verification Complete');

// OTP expired
toastManager.warning('Verification code has expired', 'Code Expired');
```

## 🔍 Debugging

### Console Logging
```javascript
// Enable debugging
toastManager.debug = true;

// Check active toasts
console.log('Active toasts:', toastManager.toasts.length);
```

### Error Handling
```javascript
try {
  // Your code here
} catch (error) {
  console.error('Error details:', error);
  toastManager.error('An unexpected error occurred', 'System Error');
}
```

## 🎨 Styling Notes

### CSS Classes
- `.toast-container` - Main container
- `.toast` - Individual toast
- `.toast.success` - Success toast styling
- `.toast.error` - Error toast styling
- `.toast.warning` - Warning toast styling
- `.toast.info` - Info toast styling

### Custom Styling
```css
/* Custom toast colors */
.toast.custom {
  border-left-color: #purple;
  background: linear-gradient(135deg, #f3e8ff, #ffffff);
}
```

## 📋 Best Practices

1. **Keep messages concise** - Users scan quickly
2. **Use appropriate types** - Match the message severity
3. **Provide clear actions** - Tell users what happened and what's next
4. **Don't spam** - Limit simultaneous toasts
5. **Test on mobile** - Ensure readability on small screens
6. **Handle errors gracefully** - Always show user-friendly error messages

## 🚨 Common Pitfalls

1. **Missing toast partial** - Always include `<%- include('../partials/toast') %>`
2. **Wrong message type** - Use `error` for failures, not `warning`
3. **Too many toasts** - Clear previous toasts before showing new ones
4. **No error handling** - Always wrap AJAX calls in try-catch
5. **Blocking redirects** - Use setTimeout for delayed redirects

## 📚 Examples in Current Project

### Registration Success
```javascript
// After OTP verification
toastManager.success('Registration completed successfully!', 'Welcome');
setTimeout(() => window.location.href = '/home', 1500);
```

### Forgot Password
```javascript
// After email sent
toastManager.success('Reset code sent to your email', 'Email Sent');
setTimeout(() => window.location.href = '/verify-otp-forgot', 1500);
```

### Resend OTP
```javascript
// Cooldown message
toastManager.warning(`Please wait ${remainingTime} seconds`, 'Cooldown Active');

// Success message
toastManager.success('New verification code sent', 'Code Sent');
```

This toast system provides a professional, user-friendly way to communicate with users throughout your application!