import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { targetServings?: number };
    if (!body.targetServings || body.targetServings <= 0) {
      return NextResponse.json({ error: 'Valid targetServings is required.' }, { status: 400 });
    }

    const updated = await prisma.shoppingList.update({
      where: { id: params.id },
      data: { targetServings: body.targetServings },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update list.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
