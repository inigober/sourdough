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
