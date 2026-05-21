import type { RecipeInput, RecipeValidationIssue } from '../../lib/recipe/types.ts';

export function getFieldValidationProps(
  issues: RecipeValidationIssue[],
  field: keyof RecipeInput | 'doughFlours',
): { message?: string; status?: 'error' | 'warning' } {
  const issue = issues.find((validationIssue) => validationIssue.field === field);

  if (!issue) {
    return {};
  }

  return {
    message: issue.message,
    status: issue.level,
  };
}
