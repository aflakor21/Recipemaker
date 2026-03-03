import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SharedListView from '@/app/components/SharedListView';

export default async function SharePage({ params }: { params: { shareId: string } }) {
  const list = await prisma.shoppingList.findUnique({
    where: { shareId: params.shareId },
    include: { items: true, recipe: true },
  });

  if (!list) {
    notFound();
  }

  return (
    <SharedListView
      title={list.recipe?.title || 'Shared recipe'}
      sourceUrl={list.recipe?.sourceUrl || '#'}
      items={list.items}
      originalServings={list.recipe?.originalServings || list.targetServings || 1}
      targetServings={list.targetServings}
    />
  );
}
