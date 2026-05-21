export const AUTH_PROMPT_DISMISSED_KEY = 'sourdough:auth-prompt-dismissed';

export function isAuthPromptDismissed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  return localStorage.getItem(AUTH_PROMPT_DISMISSED_KEY) === 'true';
}

export function setAuthPromptDismissed(dismissed: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (dismissed) {
    localStorage.setItem(AUTH_PROMPT_DISMISSED_KEY, 'true');
    return;
  }

  localStorage.removeItem(AUTH_PROMPT_DISMISSED_KEY);
}
