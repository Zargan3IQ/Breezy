const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email);

const PASSWORD_MIN_LENGTH = 10;

/*
 * Returns an array of issues with the password. If the array is empty, the password is valid.
 * Issues can include:
 * - "Password must be at least 10 characters long."   
 * - "Password must contain a lowercase letter."
 * - "Password must contain an uppercase letter."
 * - "Password must contain a digit."
 * - "Password must contain a special character."
 */
export const getPasswordIssues = (password: string): string[] => {
  const issues: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }
  if (!/[a-z]/.test(password)) issues.push('Password must contain a lowercase letter.');
  if (!/[A-Z]/.test(password)) issues.push('Password must contain an uppercase letter.');
  if (!/[0-9]/.test(password)) issues.push('Password must contain a digit.');
  if (!/[^a-zA-Z0-9]/.test(password)) issues.push('Password must contain a special character.');

  return issues;
};

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export const isValidUsername = (username: string): boolean => USERNAME_REGEX.test(username);
