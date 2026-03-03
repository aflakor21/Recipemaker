import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ParsedIngredient } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title: string;
      sourceUrl: string;
      originalServings: number | null;
      targetServings: number;
      ingredients: ParsedIngredient[];
    };

    const recipe = await prisma.recipe.create({
      data: {
        title: body.title,
        sourceUrl: body.sourceUrl,
        originalServings: body.originalServings,
      },
    });

    const shoppingList = await prisma.shoppingList.create({
      data: {
        recipeId: recipe.id,
        targetServings: body.targetServings,
        shareId: randomUUID().replace(/-/g, '').slice(0, 12),
        items: {
          create: body.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            extra: ingredient.extra,
          })),
        },
      },
      include: {
        items: true,
        recipe: true,
      },
    });

    return NextResponse.json(shoppingList);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create shopping list.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
