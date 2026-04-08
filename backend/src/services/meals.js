import { supabase, toCamel } from '../db.js';
import { logEvent } from './events.js';

export async function addMeal(userId, { name, calories, notes }) {
  const { data, error } = await supabase
    .from('meals')
    .insert({
      user_id: userId,
      name,
      calories: calories ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const meal = toCamel(data);
  await logEvent(userId, 'meal_added', { mealId: meal.id, name: meal.name });
  return meal;
}

export async function listMeals(userId) {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return toCamel(data);
}

export async function updateMeal(userId, mealId, fields) {
  const update = {};
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.calories !== undefined) update.calories = fields.calories;
  if (fields.notes !== undefined) update.notes = fields.notes;
  const { data, error } = await supabase
    .from('meals')
    .update(update)
    .eq('id', mealId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data) await logEvent(userId, 'meal_updated', { mealId });
  return toCamel(data);
}

export async function deleteMeal(userId, mealId) {
  const { data, error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data) await logEvent(userId, 'meal_deleted', { mealId });
  return toCamel(data);
}
