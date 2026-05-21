export function formatAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('email rate limit exceeded') || normalized.includes('over_email_send_rate_limit')) {
    return 'Too many confirmation emails were sent. Wait about an hour, or sign in if you already created an account.';
  }

  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  return message;
}
