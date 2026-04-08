import axios from 'axios';
import 'dotenv/config';

const api = axios.create({ baseURL: process.env.BACKEND_URL || 'http://localhost:4000' });

export const upsertUser = (data) => api.post('/api/users', data).then((r) => r.data);
export const updateOnboarding = (id, step, completed) =>
  api.patch(`/api/users/${id}/onboarding`, { step, completed }).then((r) => r.data);
export const logEvent = (userId, eventName, properties) =>
  api.post('/api/events', { userId, eventName, properties }).then((r) => r.data);

export const listMeals = (telegramId) =>
  api.get('/api/meals', { params: { telegramId } }).then((r) => r.data);
export const addMeal = (telegramId, data) =>
  api.post('/api/meals', data, { params: { telegramId } }).then((r) => r.data);
export const updateMeal = (telegramId, id, data) =>
  api.patch(`/api/meals/${id}`, data, { params: { telegramId } }).then((r) => r.data);
export const deleteMeal = (telegramId, id) =>
  api.delete(`/api/meals/${id}`, { params: { telegramId } }).then((r) => r.data);
