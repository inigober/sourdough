import { flourProfiles } from './flourProfiles.ts';
import type { FlourBlendEntry, FlourType, RecipeInput } from './types.ts';

export function createFlourBlendEntry(
  flourType: FlourType = 'wheatType1050',
  percent = 100,
): FlourBlendEntry {
  return {
    id: crypto.randomUUID(),
    flourType,
    percent,
  };
}

export function estimateTotalFlourGrams(input: RecipeInput): number {
  const hydration = input.hydrationPercent / 100;
  const saltRate = input.saltPercent / 100;
  return input.finalDoughWeightGrams / (1 + hydration + saltRate);
}

export function getRoundedTotalFlourGrams(input: RecipeInput): number {
  return Math.round(estimateTotalFlourGrams(input));
}

export function getFlourGrams(percent: number, totalFlourGrams: number): number {
  return Math.round((percent / 100) * totalFlourGrams);
}

export function getPrimaryFlourType(doughFlours: FlourBlendEntry[]): FlourType {
  const primary = doughFlours.reduce((current, entry) =>
    entry.percent > current.percent ? entry : current,
  );
  return primary.flourType;
}

export function getWeightedFermentationSpeedMultiplier(doughFlours: FlourBlendEntry[]): number {
  return doughFlours.reduce(
    (sum, entry) =>
      sum + flourProfiles[entry.flourType].fermentationSpeedMultiplier * (entry.percent / 100),
    0,
  );
}

export function formatFlourBlendSummary(doughFlours: FlourBlendEntry[]): string {
  const activeEntries = doughFlours.filter((entry) => entry.percent > 0);

  if (activeEntries.length === 0) {
    return 'Flour blend';
  }

  if (activeEntries.length === 1) {
    const entry = activeEntries[0];
    return `${entry.percent}% ${flourProfiles[entry.flourType].label}`;
  }

  if (activeEntries.length === 2) {
    return activeEntries
      .map((entry) => `${entry.percent}% ${flourProfiles[entry.flourType].label}`)
      .join(' + ');
  }

  return formatMultiFlourBlendLabel(activeEntries);
}

function formatMultiFlourBlendLabel(activeEntries: FlourBlendEntry[]): string {
  const families = new Set(activeEntries.map((entry) => flourProfiles[entry.flourType].family));

  if (families.size === 1) {
    const family = activeEntries[0] ? flourProfiles[activeEntries[0].flourType].family : 'wheat';
    return family === 'wheat' ? 'Combined wheat flour' : 'Combined rye flour';
  }

  return 'Wheat / rye blend';
}

export function getFlourBlendTotalPercent(doughFlours: FlourBlendEntry[]): number {
  return roundTo(
    doughFlours.reduce((sum, entry) => sum + entry.percent, 0),
    1,
  );
}

export function updateFlourType(
  doughFlours: FlourBlendEntry[],
  entryId: string,
  flourType: FlourType,
): FlourBlendEntry[] {
  return doughFlours.map((entry) => (entry.id === entryId ? { ...entry, flourType } : entry));
}

export function updateFlourPercent(
  doughFlours: FlourBlendEntry[],
  entryId: string,
  nextPercent: number,
): FlourBlendEntry[] {
  const clampedPercent = clamp(nextPercent, 1, 99);
  const target = doughFlours.find((entry) => entry.id === entryId);
  if (!target) {
    return doughFlours;
  }

  if (doughFlours.length === 1) {
    return [{ ...target, percent: 100 }];
  }

  const others = doughFlours.filter((entry) => entry.id !== entryId);
  const remainingPercent = 100 - clampedPercent;
  const othersTotal = others.reduce((sum, entry) => sum + entry.percent, 0);

  return doughFlours.map((entry) => {
    if (entry.id === entryId) {
      return { ...entry, percent: clampedPercent };
    }

    return {
      ...entry,
      percent:
        othersTotal === 0
          ? remainingPercent / others.length
          : roundTo((entry.percent / othersTotal) * remainingPercent, 1),
    };
  });
}

export function stepFlourPercent(
  doughFlours: FlourBlendEntry[],
  entryId: string,
  deltaPercent: number,
): FlourBlendEntry[] {
  if (deltaPercent === 0) {
    return doughFlours;
  }

  const target = doughFlours.find((entry) => entry.id === entryId);
  if (!target) {
    return doughFlours;
  }

  const nextPercent = clamp(Math.round(target.percent + deltaPercent), 1, 99);
  if (nextPercent === target.percent) {
    return doughFlours;
  }

  return updateFlourPercent(doughFlours, entryId, nextPercent);
}

function buildGramMap(doughFlours: FlourBlendEntry[], total: number): Map<string, number> {
  return new Map(doughFlours.map((entry) => [entry.id, getFlourGrams(entry.percent, total)]));
}

function gramsMapToBlend(
  doughFlours: FlourBlendEntry[],
  gramMap: Map<string, number>,
  total: number,
): FlourBlendEntry[] {
  return doughFlours.map((entry) => ({
    ...entry,
    percent: roundTo(((gramMap.get(entry.id) ?? 0) / total) * 100, 1),
  }));
}

function redistributeGramsAmongOthers(
  gramMap: Map<string, number>,
  others: FlourBlendEntry[],
  gramsToAssign: number,
): void {
  if (others.length === 0 || gramsToAssign < 0) {
    return;
  }

  const othersGramsTotal = others.reduce((sum, entry) => sum + (gramMap.get(entry.id) ?? 0), 0);
  let assigned = 0;

  others.forEach((entry, index) => {
    const isLast = index === others.length - 1;
    const nextGrams = isLast
      ? gramsToAssign - assigned
      : othersGramsTotal === 0
        ? Math.floor(gramsToAssign / others.length)
        : Math.round(((gramMap.get(entry.id) ?? 0) / othersGramsTotal) * gramsToAssign);

    assigned += nextGrams;
    gramMap.set(entry.id, nextGrams);
  });
}

export function updateFlourGrams(
  doughFlours: FlourBlendEntry[],
  entryId: string,
  grams: number,
  totalFlourGrams: number,
): FlourBlendEntry[] {
  const total = Math.round(totalFlourGrams);
  if (total <= 0 || !Number.isFinite(grams)) {
    return doughFlours;
  }

  if (doughFlours.length === 1) {
    const onlyEntry = doughFlours[0];
    return onlyEntry ? [{ ...onlyEntry, percent: 100 }] : doughFlours;
  }

  const target = doughFlours.find((entry) => entry.id === entryId);
  if (!target) {
    return doughFlours;
  }

  const others = doughFlours.filter((entry) => entry.id !== entryId);
  const maxTargetGrams = total - others.length;
  const targetGrams = clamp(Math.round(grams), 1, maxTargetGrams);
  const gramMap = buildGramMap(doughFlours, total);

  gramMap.set(entryId, targetGrams);
  redistributeGramsAmongOthers(gramMap, others, total - targetGrams);

  return gramsMapToBlend(doughFlours, gramMap, total);
}

export function stepFlourGrams(
  doughFlours: FlourBlendEntry[],
  entryId: string,
  delta: number,
  totalFlourGrams: number,
): FlourBlendEntry[] {
  const total = Math.round(totalFlourGrams);
  const target = doughFlours.find((entry) => entry.id === entryId);
  if (!target || delta === 0) {
    return doughFlours;
  }

  if (doughFlours.length === 1) {
    return [{ ...target, percent: 100 }];
  }

  const gramMap = buildGramMap(doughFlours, total);
  const currentGrams = gramMap.get(entryId) ?? 0;
  const maxTargetGrams = total - (doughFlours.length - 1);
  const nextGrams = clamp(currentGrams + delta, 1, maxTargetGrams);

  if (nextGrams === currentGrams) {
    return doughFlours;
  }

  gramMap.set(entryId, nextGrams);
  const others = doughFlours.filter((entry) => entry.id !== entryId);
  redistributeGramsAmongOthers(gramMap, others, total - nextGrams);

  return gramsMapToBlend(doughFlours, gramMap, total);
}

export function addFlourEntry(doughFlours: FlourBlendEntry[]): FlourBlendEntry[] {
  const newPercent = doughFlours.length === 1 ? 20 : 10;
  const remainingPercent = 100 - newPercent;
  const currentTotal = doughFlours.reduce((sum, entry) => sum + entry.percent, 0);

  const scaledEntries = doughFlours.map((entry) => ({
    ...entry,
    percent:
      currentTotal === 0
        ? remainingPercent / doughFlours.length
        : roundTo((entry.percent / currentTotal) * remainingPercent, 1),
  }));

  return [...scaledEntries, createFlourBlendEntry('wholeWheat', newPercent)];
}

export function getFlourIngredientRows(
  doughFlours: FlourBlendEntry[],
  totalFlourGrams: number,
): readonly (readonly [string, number])[] {
  return doughFlours
    .filter((entry) => entry.percent > 0)
    .map((entry) => [
      flourProfiles[entry.flourType].label,
      getFlourGrams(entry.percent, totalFlourGrams),
    ] as const);
}

export function removeFlourEntry(doughFlours: FlourBlendEntry[], entryId: string): FlourBlendEntry[] {
  if (doughFlours.length <= 1) {
    return doughFlours;
  }

  const removed = doughFlours.find((entry) => entry.id === entryId);
  const remaining = doughFlours.filter((entry) => entry.id !== entryId);
  if (!removed) {
    return doughFlours;
  }

  const remainingTotal = remaining.reduce((sum, entry) => sum + entry.percent, 0);
  if (remainingTotal === 0) {
    return [{ ...remaining[0], percent: 100 }];
  }

  return remaining.map((entry) => ({
    ...entry,
    percent: roundTo(entry.percent + (removed.percent * entry.percent) / remainingTotal, 1),
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
