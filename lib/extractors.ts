import * as cheerio from 'cheerio';
import { ExtractedRecipe } from './types';
import { parseIngredientsText } from './ingredient';

type JsonLdRecipe = {
  '@type'?: string | string[];
  name?: string;
  recipeYield?: string | string[];
  recipeIngredient?: string[];
};

function parseYieldToNumber(yieldValue: string | string[] | undefined): number | null {
  if (!yieldValue) return null;
  const value = Array.isArray(yieldValue) ? yieldValue[0] : yieldValue;
  const match = value?.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function isRecipeType(typeVal: string | string[] | undefined): boolean {
  if (!typeVal) return false;
  const values = Array.isArray(typeVal) ? typeVal : [typeVal];
  return values.some((val) => val.toLowerCase().includes('recipe'));
}

function extractFromJsonLd(html: string, sourceUrl: string): ExtractedRecipe | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (const script of scripts.toArray()) {
    const text = $(script).text();
    try {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
          ? parsed['@graph']
          : [parsed];

      for (const item of items) {
        const candidate = item as JsonLdRecipe;
        if (isRecipeType(candidate['@type']) && candidate.recipeIngredient?.length) {
          return {
            title: candidate.name || 'Untitled recipe',
            sourceUrl,
            originalServings: parseYieldToNumber(candidate.recipeYield),
            ingredients: candidate.recipeIngredient.map((line) => ({
              ...parseIngredientsText(line)[0],
            })),
            extractionNotes: ['Extracted from JSON-LD Recipe schema.'],
          };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractFromHtmlFallback(html: string, sourceUrl: string): ExtractedRecipe | null {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim() || $('title').text().trim() || 'Untitled recipe';

  const listSelectors = [
    '[class*="ingredient"] li',
    '[id*="ingredient"] li',
    '.ingredients-item',
    '.ingredient',
  ];

  const lines: string[] = [];
  for (const selector of listSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text && text.length < 160) lines.push(text);
    });
    if (lines.length > 2) break;
  }

  const servingsText = $('[class*="yield"], [class*="serving"], [id*="yield"], [id*="serving"]')
    .first()
    .text()
    .trim();
  const servings = parseYieldToNumber(servingsText);

  if (!lines.length) return null;

  return {
    title,
    sourceUrl,
    originalServings: servings,
    ingredients: parseIngredientsText(lines.join('\n')),
    extractionNotes: ['Extracted from fallback HTML ingredient selectors.'],
  };
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipe> {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Recipemaker Bot' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch recipe URL (${response.status})`);
  }

  const html = await response.text();
  const jsonLd = extractFromJsonLd(html, url);
  if (jsonLd) return jsonLd;

  const fallback = extractFromHtmlFallback(html, url);
  if (fallback) return fallback;

  return {
    title: 'Could not extract recipe automatically',
    sourceUrl: url,
    originalServings: null,
    ingredients: [],
    extractionNotes: ['Automatic extraction failed. Paste ingredient text manually below.'],
    manualTextRequired: true,
  };
}

export async function extractFromTikTokUrl(url: string): Promise<ExtractedRecipe> {
  const notes: string[] = [];
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = (await response.json()) as { title?: string; author_name?: string };
      const title = data.title || 'TikTok recipe';
      notes.push('Fetched TikTok oEmbed metadata.');

      const parsed = parseIngredientsText(title);
      if (parsed.some((p) => p.quantity !== null || p.unit !== null)) {
        return {
          title,
          sourceUrl: url,
          originalServings: null,
          ingredients: parsed,
          extractionNotes: [...notes, 'Parsed ingredient-like text from caption/title.'],
        };
      }

      return {
        title,
        sourceUrl: url,
        originalServings: null,
        ingredients: [],
        extractionNotes: [...notes, 'No transcript/caption ingredients were accessible via public endpoints.'],
        manualTextRequired: true,
      };
    }
  } catch {
    notes.push('TikTok oEmbed request failed.');
  }

  return {
    title: 'TikTok extraction unavailable',
    sourceUrl: url,
    originalServings: null,
    ingredients: [],
    extractionNotes: [...notes, 'Paste recipe text manually for TikTok videos without accessible captions/transcripts.'],
    manualTextRequired: true,
  };
}
