// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
};

// Order Status
export const ORDER_STATUS = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURN_REQUESTED: 'Return Requested',
    RETURNED: 'Returned',
    RETURN_DECLINED: 'Return Declined'
};

// Payment Status
export const PAYMENT_STATUS = {
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded'
};

// Item Status
export const ITEM_STATUS = {
    ACTIVE: 'Active',
    CANCELLED: 'Cancelled'
};