/**
 * Client-Side Personal Information Validator
 */
export const validatePersonal = (data = {}) => {
  const errors = {};

  if (!data.firstName || !data.firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }

  if (!data.lastName || !data.lastName.trim()) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }

  if (data.dob) {
    const dobDate = new Date(data.dob);
    if (isNaN(dobDate.getTime())) {
      errors.dob = 'Invalid date of birth format';
    } else if (dobDate > new Date()) {
      errors.dob = 'Date of birth cannot be in the future';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
