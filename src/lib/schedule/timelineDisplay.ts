type TimelineDateStep = {
  dateLabel?: string;
};

export function shouldShowTimelineDateLabel(steps: TimelineDateStep[], index: number): boolean {
  const dateLabel = steps[index]?.dateLabel;
  if (!dateLabel) {
    return false;
  }

  return index === 0 || steps[index - 1]?.dateLabel !== dateLabel;
}

export type TimelineLabelGroup<Step extends TimelineDateStep> = {
  /** "Bake day −1" or a real date. Undefined for steps that carry no day label. */
  label: string | undefined;
  steps: Step[];
};

/** Splits steps into runs that share a day label, in order, for the day headings of the timeline. */
export function groupStepsByDayLabel<Step extends TimelineDateStep>(steps: Step[]): TimelineLabelGroup<Step>[] {
  const groups: TimelineLabelGroup<Step>[] = [];

  for (const step of steps) {
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.label === step.dateLabel) {
      lastGroup.steps.push(step);
      continue;
    }

    groups.push({ label: step.dateLabel, steps: [step] });
  }

  return groups;
}
