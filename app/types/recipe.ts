export type Recipe = {
  name: string;
  ingredients: string[];
  instructions: string[];
  calories: string;
  tags: string[];
  readyInMinutes?: number;
  imageUrl?: string;
};
