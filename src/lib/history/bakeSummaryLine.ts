import { formatFlourBlendSummary } from '../recipe/flourBlend.ts';
import { flourProfiles } from '../recipe/flourProfiles.ts';
import type { FlourBlendEntry } from '../recipe/types.ts';
import type { BakeRecipeFacts } from './types.ts';

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isUsableFlourEntry(value: unknown): value is FlourBlendEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<FlourBlendEntry>;
  return (
    typeof entry.flourType === 'string' &&
    Object.hasOwn(flourProfiles, entry.flourType) &&
    typeof entry.percent === 'number' &&
    Number.isFinite(entry.percent)
  );
}

/**
 * Picks the numbers the History list needs out of a bake's recipe snapshot. The snapshot comes
 * from storage and may be older or incomplete, so each field is checked and simply left out when
 * it is missing or unusable. Used for both the on-device and the account list.
 */
export function pickBakeRecipeFacts(recipeInput: unknown): BakeRecipeFacts | undefined {
  if (!recipeInput || typeof recipeInput !== 'object') {
    return undefined;
  }

  const source = recipeInput as Record<string, unknown>;
  const facts: BakeRecipeFacts = {};

  if (isPositiveNumber(source.hydrationPercent)) {
    facts.hydrationPercent = source.hydrationPercent;
  }

  if (isPositiveNumber(source.finalDoughWeightGrams)) {
    facts.finalDoughWeightGrams = source.finalDoughWeightGrams;
  }

  if (isPositiveNumber(source.numberOfLoaves)) {
    facts.numberOfLoaves = source.numberOfLoaves;
  }

  if (Array.isArray(source.doughFlours)) {
    const flours = source.doughFlours.filter(isUsableFlourEntry);
    if (flours.length > 0) {
      facts.doughFlours = flours;
    }
  }

  return Object.keys(facts).length > 0 ? facts : undefined;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * Loaf size: the weight per loaf when there are several loaves ("2 × 450 g"), otherwise the dough
 * weight ("900 g"). Needs the dough weight; returns null without it.
 */
export function formatLoafSize(facts: BakeRecipeFacts): string | null {
  const { finalDoughWeightGrams, numberOfLoaves } = facts;
  if (finalDoughWeightGrams === undefined) {
    return null;
  }

  const loaves = numberOfLoaves !== undefined ? Math.round(numberOfLoaves) : 1;
  if (loaves > 1) {
    return `${loaves} × ${formatNumber(finalDoughWeightGrams / loaves)} g`;
  }

  return `${formatNumber(finalDoughWeightGrams)} g`;
}

/** The flour blend as one short phrase; a single flour drops the redundant "100%". */
export function formatFlourLabel(facts: BakeRecipeFacts): string | null {
  if (!facts.doughFlours || facts.doughFlours.length === 0) {
    return null;
  }

  const summary = formatFlourBlendSummary(facts.doughFlours);
  return summary.replace(/^100% /, '');
}

/**
 * The muted line under a bake in the History list, for example
 * "78% · 900 g · Wheat Type 1050" or "75% · 2 × 450 g · 70% Wheat Type 1050 + 30% Whole wheat".
 * Parts with no data are skipped; returns an empty string when there is nothing to show.
 */
export function buildBakeSummaryLine(facts: BakeRecipeFacts | undefined): string {
  if (!facts) {
    return '';
  }

  const parts = [
    facts.hydrationPercent !== undefined ? `${formatNumber(facts.hydrationPercent)}%` : null,
    formatLoafSize(facts),
    formatFlourLabel(facts),
  ];

  return parts.filter((part): part is string => part !== null).join(' · ');
}
