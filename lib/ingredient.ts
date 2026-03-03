import { ParsedIngredient } from './types';

const unicodeFractions: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅛': '1/8',
};

const normalizedUnits: Record<string, string> = {
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  gram: 'g',
  grams: 'g',
  g: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  liter: 'l',
  liters: 'l',
  l: 'l',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  cloves: 'clove',
  clove: 'clove',
};

function parseFractionToken(token: string): number | null {
  if (!token) return null;
  const replaced = unicodeFractions[token] ?? token;
  if (replaced.includes('/')) {
    const [a, b] = replaced.split('/').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) {
      return a / b;
    }
  }
  const val = Number(replaced);
  return Number.isFinite(val) ? val : null;
}

export function parseIngredientLine(line: string): ParsedIngredient {
  const cleaned = line.trim().replace(/[–—]/g, '-');
  const tokens = cleaned.split(/\s+/);

  let quantity: number | null = null;
  let quantityTokensUsed = 0;

  const first = parseFractionToken(tokens[0] ?? '');
  const second = parseFractionToken(tokens[1] ?? '');

  if (first !== null) {
    quantity = first;
    quantityTokensUsed = 1;
    if (second !== null && (tokens[1]?.includes('/') || Number.isInteger(first))) {
      quantity += second;
      quantityTokensUsed = 2;
    }
  }

  const unitToken = tokens[quantityTokensUsed]?.toLowerCase().replace('.', '') ?? '';
  const unit = normalizedUnits[unitToken] ?? null;
  const ingredientStart = quantityTokensUsed + (unit ? 1 : 0);
  const remainder = tokens.slice(ingredientStart).join(' ');

  const [namePart, ...extraParts] = remainder.split(',').map((part) => part.trim());

  return {
    raw: line,
    quantity,
    unit,
    name: namePart || remainder || line,
    extra: extraParts.length ? extraParts.join(', ') : null,
  };
}

export function parseIngredientsText(text: string): ParsedIngredient[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .map(parseIngredientLine);
}

export function scaleQuantity(quantity: number | null, originalServings: number, targetServings: number): number | null {
  if (quantity === null || !Number.isFinite(originalServings) || originalServings <= 0) {
    return quantity;
  }
  return quantity * (targetServings / originalServings);
}

export function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity === null) return '';
  const metricUnits = new Set(['g', 'kg', 'ml', 'l']);
  if (unit && metricUnits.has(unit)) {
    return quantity.toFixed(quantity < 10 ? 1 : 0).replace(/\.0$/, '');
  }

  const whole = Math.floor(quantity);
  const fraction = quantity - whole;
  const candidates: Array<[number, string]> = [
    [1 / 8, '1/8'],
    [1 / 6, '1/6'],
    [1 / 5, '1/5'],
    [1 / 4, '1/4'],
    [1 / 3, '1/3'],
    [1 / 2, '1/2'],
    [2 / 3, '2/3'],
    [3 / 4, '3/4'],
  ];

  let closest = '';
  let minDiff = Number.POSITIVE_INFINITY;
  for (const [value, label] of candidates) {
    const diff = Math.abs(fraction - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = label;
    }
  }

  if (minDiff < 0.07) {
    return `${whole > 0 ? `${whole} ` : ''}${closest}`.trim();
  }

  return Number(quantity.toFixed(2)).toString();
}
