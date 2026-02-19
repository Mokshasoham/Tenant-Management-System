// Validation utilities

export const validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  
  phone: (phone) => /^\+?[0-9\s\-()]{10,}$/.test(phone),
  
  password: (password) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  },
  
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  mongoId: (id) => /^[0-9a-fA-F]{24}$/.test(id),
  
  isNumber: (value) => !isNaN(value) && value !== '',
  
  isPositive: (value) => parseFloat(value) > 0,
  
  minLength: (value, min) => value?.toString().length >= min,
  
  maxLength: (value, max) => value?.toString().length <= max,
  
  required: (value) => value !== null && value !== undefined && value !== '',
};

// Format utilities
export const formatters = {
  currency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },
  
  date: (date, format = 'short') => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: format === 'long' ? 'long' : '2-digit',
      day: '2-digit',
    });
  },
  
  datetime: (datetime) => {
    return new Date(datetime).toLocaleString('en-US');
  },
  
  phone: (phone) => {
    const digits = phone?.replace(/\D/g, '');
    if (digits?.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  },
  
  capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
  
  titleCase: (str) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  },
};

// Constants
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};

export const TENANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
};

export const PROPERTY_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  RENTED: 'rented',
};

export const LEASE_STATUS = {
  ACTIVE: 'active',
  TERMINATED: 'terminated',
  EXPIRED: 'expired',
  PENDING: 'pending',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};
