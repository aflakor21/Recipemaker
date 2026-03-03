import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { shareId: string } }) {
  const list = await prisma.shoppingList.findUnique({
    where: { shareId: params.shareId },
    include: {
      recipe: true,
      items: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  return NextResponse.json(list);
}
