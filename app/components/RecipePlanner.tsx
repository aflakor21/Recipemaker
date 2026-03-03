'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatQuantity, scaleQuantity } from '@/lib/ingredient';
import { ParsedIngredient } from '@/lib/types';

type RecipePayload = {
  title: string;
  sourceUrl: string;
  originalServings: number | null;
  ingredients: ParsedIngredient[];
  extractionNotes: string[];
  manualTextRequired?: boolean;
};

type StoredList = {
  id: string;
  shareId: string;
  targetServings: number;
  items: Array<ParsedIngredient & { id: string; checked: boolean }>;
};

export default function RecipePlanner() {
  const [mode, setMode] = useState<'url' | 'tiktok'>('url');
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipePayload | null>(null);
  const [list, setList] = useState<StoredList | null>(null);
  const [originalServings, setOriginalServings] = useState(4);
  const [targetServings, setTargetServings] = useState(4);
  const [origin, setOrigin] = useState('');

  const finalItems = useMemo(() => {
    if (!list) return [];
    return list.items.filter((item) => !item.checked);
  }, [list]);

  async function createList(recipePayload: RecipePayload, target = targetServings, original = originalServings) {
    const response = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...recipePayload,
        originalServings: original,
        targetServings: target,
      }),
    });

    if (!response.ok) throw new Error('Could not persist shopping list.');
    const data = await response.json();
    setList({
      id: data.id,
      shareId: data.shareId,
      targetServings: data.targetServings,
      items: data.items,
    });
  }

  async function onFetch() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Extraction failed.');

      setRecipe(data);
      const inferredServings = data.originalServings && data.originalServings > 0 ? data.originalServings : 4;
      setOriginalServings(inferredServings);
      setTargetServings(inferredServings);

      if (data.ingredients?.length) {
        await createList(data, inferredServings, inferredServings);
      } else {
        setList(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  async function parseManualText() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'manual', text: manualText, title: recipe?.title, url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to parse manual text');
      setRecipe(data);
      await createList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse manual text');
    } finally {
      setLoading(false);
    }
  }

  async function toggleChecked(itemId: string, checked: boolean) {
    if (!list) return;
    setList({ ...list, items: list.items.map((i) => (i.id === itemId ? { ...i, checked } : i)) });

    await fetch(`/api/lists/${list.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked }),
    });
  }

  async function onTargetServingsChange(value: number) {
    if (!list || value <= 0) return;
    setTargetServings(value);
    await fetch(`/api/lists/${list.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetServings: value }),
    });
  }

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareLink = list && origin ? `${origin}/share/${list.shareId}` : '';

  async function copyFinalList() {
    const text = finalItems
      .map((item) => {
        const scaled = scaleQuantity(item.quantity, originalServings, targetServings);
        const qty = formatQuantity(scaled, item.unit);
        return `- ${[qty, item.unit, item.name].filter(Boolean).join(' ')}${item.extra ? ` (${item.extra})` : ''}`;
      })
      .join('\n');

    await navigator.clipboard.writeText(text || 'No items remaining.');
  }

  async function share() {
    if (!list) return;
    if (navigator.share) {
      await navigator.share({ title: recipe?.title || 'Shopping list', url: shareLink });
      return;
    }
    await navigator.clipboard.writeText(shareLink);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Recipe → Shopping List</h1>
      <p className="mb-6 text-slate-300">Extract from recipe pages or TikTok links, scale servings, and share the final list.</p>

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex gap-2">
          <button className={`rounded px-3 py-2 ${mode === 'url' ? 'bg-indigo-600' : 'bg-slate-800'}`} onClick={() => setMode('url')}>
            Recipe URL
          </button>
          <button className={`rounded px-3 py-2 ${mode === 'tiktok' ? 'bg-indigo-600' : 'bg-slate-800'}`} onClick={() => setMode('tiktok')}>
            TikTok URL
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder={mode === 'url' ? 'https://example.com/recipe' : 'https://www.tiktok.com/...'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="rounded bg-indigo-600 px-4 py-2 font-medium" onClick={onFetch} disabled={loading || !url}>
            {loading ? 'Fetching...' : 'Fetch recipe'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </section>

      {recipe && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-xl font-semibold">{recipe.title}</h2>
          <a className="text-sm text-indigo-300 underline" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
            {recipe.sourceUrl}
          </a>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
            {recipe.extractionNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          {(recipe.manualTextRequired || !recipe.ingredients.length) && (
            <div className="mt-4">
              <p className="mb-2 text-sm">Paste ingredient lines manually (one per line):</p>
              <textarea
                className="h-32 w-full rounded border border-slate-700 bg-slate-950 p-3"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
              <button className="mt-2 rounded bg-emerald-600 px-4 py-2" onClick={parseManualText}>
                Parse manual ingredients
              </button>
            </div>
          )}
        </section>
      )}

      {list && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold">Ingredients</h3>
              <label className="text-sm">Original servings</label>
              <input
                type="number"
                min={1}
                className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1"
                value={originalServings}
                onChange={(e) => setOriginalServings(Number(e.target.value) || 1)}
              />
              <label className="text-sm">Target servings</label>
              <input
                type="number"
                min={1}
                className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1"
                value={targetServings}
                onChange={(e) => onTargetServingsChange(Number(e.target.value) || 1)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="py-2">Have?</th>
                    <th className="py-2">Ingredient</th>
                    <th className="py-2">Scaled qty</th>
                    <th className="py-2">Unit</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((item) => {
                    const scaled = scaleQuantity(item.quantity, originalServings, targetServings);
                    return (
                      <tr key={item.id} className="border-b border-slate-800/60">
                        <td className="py-2">
                          <input type="checkbox" checked={item.checked} onChange={(e) => toggleChecked(item.id, e.target.checked)} />
                        </td>
                        <td className="py-2">{item.name}</td>
                        <td className="py-2">{formatQuantity(scaled, item.unit)}</td>
                        <td className="py-2">{item.unit || '-'}</td>
                        <td className="py-2 text-slate-300">{item.extra || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="mb-3 text-lg font-semibold">Final shopping list</h3>
            <ul className="mb-4 space-y-2 text-sm">
              {finalItems.length ? (
                finalItems.map((item) => {
                  const scaled = scaleQuantity(item.quantity, originalServings, targetServings);
                  return (
                    <li key={item.id}>
                      • {[formatQuantity(scaled, item.unit), item.unit, item.name].filter(Boolean).join(' ')}
                      {item.extra ? <span className="text-slate-400"> ({item.extra})</span> : null}
                    </li>
                  );
                })
              ) : (
                <li className="text-slate-400">Everything is already in your pantry 🎉</li>
              )}
            </ul>

            <div className="space-y-2">
              <button className="w-full rounded bg-indigo-600 px-4 py-2" onClick={copyFinalList}>
                Copy final list
              </button>
              <button
                className="w-full rounded bg-slate-700 px-4 py-2"
                onClick={() => navigator.clipboard.writeText(shareLink)}
              >
                Create share link
              </button>
              <button className="w-full rounded bg-emerald-700 px-4 py-2" onClick={share}>
                Share
              </button>
              {shareLink && <p className="break-all text-xs text-slate-400">{shareLink}</p>}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
