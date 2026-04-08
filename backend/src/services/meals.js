import { Meal } from '../db.js';
import { logEvent } from './events.js';

export async function addMeal(userId, data) {
  const meal = await Meal.create({ userId, ...data });
  await logEvent(userId, 'meal_added', { mealId: meal._id, name: meal.name });
  return meal;
}

export async function listMeals(userId) {
  return Meal.find({ userId }).sort({ loggedAt: -1 });
}

export async function updateMeal(userId, mealId, data) {
  const meal = await Meal.findOneAndUpdate({ _id: mealId, userId }, data, { new: true });
  if (meal) await logEvent(userId, 'meal_updated', { mealId });
  return meal;
}

export async function deleteMeal(userId, mealId) {
  const res = await Meal.findOneAndDelete({ _id: mealId, userId });
  if (res) await logEvent(userId, 'meal_deleted', { mealId });
  return res;
}
