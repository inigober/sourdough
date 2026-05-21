import type { RecipeTemplateId } from './templates.ts';

export const templateImageSrc: Record<RecipeTemplateId, string> = {
  'country-loaf': '/templates/country-loaf.png',
  focaccia: '/templates/focaccia.png',
  pizza: '/templates/pizza.png',
  ciabatta: '/templates/ciabatta.png',
  'pan-de-cristal': '/templates/pan-de-cristal.png',
  'pain-de-champagne': '/templates/pain-de-champagne.png',
};

export function getTemplateImageSrc(templateId: RecipeTemplateId): string {
  return templateImageSrc[templateId];
}
