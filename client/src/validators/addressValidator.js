/**
 * Client-Side Address Information Validator
 */
export const validateAddress = (data = {}) => {
  const errors = {};

  if (data.address?.postalCode && data.address.postalCode.trim() && data.address.postalCode.trim().length < 3) {
    errors.postalCode = 'Postal code must be at least 3 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
