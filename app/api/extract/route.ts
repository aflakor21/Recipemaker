import { NextRequest, NextResponse } from 'next/server';
import { extractFromTikTokUrl, extractRecipeFromUrl } from '@/lib/extractors';
import { parseIngredientsText } from '@/lib/ingredient';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { mode: 'url' | 'tiktok' | 'manual'; url?: string; text?: string; title?: string };

    if (body.mode === 'manual') {
      if (!body.text?.trim()) {
        return NextResponse.json({ error: 'Manual ingredient text is required.' }, { status: 400 });
      }
      return NextResponse.json({
        title: body.title?.trim() || 'Manual recipe',
        sourceUrl: body.url || 'manual',
        originalServings: null,
        ingredients: parseIngredientsText(body.text),
        extractionNotes: ['Parsed from manually pasted text.'],
      });
    }

    if (!body.url) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
    }

    const recipe = body.mode === 'tiktok' ? await extractFromTikTokUrl(body.url) : await extractRecipeFromUrl(body.url);
    return NextResponse.json(recipe);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected extraction error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
