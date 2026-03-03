export type ParsedIngredient = {
  raw: string;
  quantity: number | null;
  unit: string | null;
  name: string;
  extra: string | null;
};

export type ExtractedRecipe = {
  title: string;
  sourceUrl: string;
  originalServings: number | null;
  ingredients: ParsedIngredient[];
  extractionNotes: string[];
  manualTextRequired?: boolean;
};
