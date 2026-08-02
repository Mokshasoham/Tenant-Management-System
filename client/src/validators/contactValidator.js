/**
 * Client-Side Contact Information Validator
 */
export const validateContact = (data = {}) => {
  const errors = {};
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;

  if (data.secondaryEmail && !emailRegex.test(data.secondaryEmail.trim())) {
    errors.secondaryEmail = 'Invalid secondary email format';
  }

  if (data.phone && data.phone.trim() && !phoneRegex.test(data.phone.trim())) {
    errors.phone = 'Invalid phone number format';
  }

  if (data.alternatePhone && data.alternatePhone.trim() && !phoneRegex.test(data.alternatePhone.trim())) {
    errors.alternatePhone = 'Invalid alternate phone format';
  }

  if (data.emergencyContact?.phone && data.emergencyContact.phone.trim() && !phoneRegex.test(data.emergencyContact.phone.trim())) {
    errors.emergencyPhone = 'Invalid emergency contact phone format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
