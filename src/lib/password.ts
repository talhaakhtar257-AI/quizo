export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: string;
}

export function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: "" };
  if (!isPasswordValid(password)) return { score: 1, label: "Too weak" };

  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (password.length >= 12 && (hasMixedCase || hasSpecial)) {
    return { score: 3, label: "Strong" };
  }
  return { score: 2, label: "Good" };
}
