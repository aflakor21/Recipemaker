import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  try {
    const body = (await req.json()) as { checked: boolean };
    const existing = await prisma.item.findFirst({
      where: { id: params.itemId, shoppingListId: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const updated = await prisma.item.update({
      where: { id: params.itemId },
      data: { checked: Boolean(body.checked) },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update item.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
