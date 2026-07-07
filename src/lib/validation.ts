export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
}

/**
 * Parses month/year query params, falling back to the current month for
 * anything missing, non-numeric, or out of range (month 0-11, year 2000
 * through next year).
 */
export function clampMonthYear(
  monthRaw: string | null,
  yearRaw: string | null,
  now: Date = new Date()
): { month: number; year: number } {
  const month = monthRaw === null ? NaN : parseInt(monthRaw, 10);
  const year = yearRaw === null ? NaN : parseInt(yearRaw, 10);
  return {
    month: Number.isInteger(month) && month >= 0 && month <= 11 ? month : now.getMonth(),
    year:
      Number.isInteger(year) && year >= 2000 && year <= now.getFullYear() + 1
        ? year
        : now.getFullYear(),
  };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}
