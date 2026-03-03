'use client';

import { formatQuantity, scaleQuantity } from '@/lib/ingredient';

type SharedItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  extra: string | null;
  checked: boolean;
};

export default function SharedListView({
  title,
  sourceUrl,
  items,
  originalServings,
  targetServings,
}: {
  title: string;
  sourceUrl: string;
  items: SharedItem[];
  originalServings: number;
  targetServings: number;
}) {
  const finalItems = items.filter((item) => !item.checked);

  const text = finalItems
    .map((item) => {
      const scaled = scaleQuantity(item.quantity, originalServings, targetServings);
      return `- ${[formatQuantity(scaled, item.unit), item.unit, item.name].filter(Boolean).join(' ')}`;
    })
    .join('\n');

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      <h1 className="text-3xl font-bold">Shared Shopping List</h1>
      <h2 className="mt-2 text-xl">{title}</h2>
      <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-300 underline">
        {sourceUrl}
      </a>
      <p className="mt-2 text-sm text-slate-300">Read-only list · scaled for {targetServings} servings.</p>

      <ul className="mt-6 space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {finalItems.map((item) => {
          const scaled = scaleQuantity(item.quantity, originalServings, targetServings);
          return (
            <li key={item.id}>
              • {[formatQuantity(scaled, item.unit), item.unit, item.name].filter(Boolean).join(' ')}
              {item.extra ? <span className="text-slate-400"> ({item.extra})</span> : null}
            </li>
          );
        })}
      </ul>

      <button className="mt-4 rounded bg-indigo-600 px-4 py-2" onClick={() => navigator.clipboard.writeText(text || 'No items remaining.')}>
        Copy list
      </button>
    </main>
  );
}
