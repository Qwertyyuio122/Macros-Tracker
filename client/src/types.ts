export type Micronutrients = Record<
  | "vitamin_a_mcg"
  | "vitamin_c_mg"
  | "vitamin_d_mcg"
  | "vitamin_e_mg"
  | "vitamin_k_mcg"
  | "thiamin_mg"
  | "riboflavin_mg"
  | "niacin_mg"
  | "vitamin_b6_mg"
  | "folate_mcg"
  | "vitamin_b12_mcg"
  | "calcium_mg"
  | "iron_mg"
  | "magnesium_mg"
  | "phosphorus_mg"
  | "potassium_mg"
  | "zinc_mg",
  number
>;

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  micronutrients: Micronutrients;
}

export interface NutritionGoals extends NutritionTotals {
  source: "formula" | "custom";
}

export interface User {
  id: number;
  username: string;
  age: number;
  gender: string;
  goal: string;
  weight_kg: number;
  height_cm: number;
}

export interface FoodEntry {
  id: number;
  entry_date: string;
  source: string;
  description: string | null;
  nutrients: NutritionTotals;
  created_at: string;
}

export interface DashboardResponse {
  date: string;
  goals: NutritionGoals;
  consumed: NutritionTotals;
  entries: FoodEntry[];
}
