import mongoose from 'mongoose';
import 'dotenv/config';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calorai';
  await mongoose.connect(uri);
  console.log('[db] connected:', uri);
}

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: String, unique: true, required: true, index: true },
    username: String,
    firstName: String,
    experimentGroup: { type: String, enum: ['control', 'test', null], default: null },
    onboardingStep: { type: Number, default: 0 },
    onboardingCompleted: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    expoPushToken: { type: String, default: null },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const mealSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    calories: Number,
    notes: String,
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    eventName: { type: String, required: true, index: true },
    properties: { type: Object, default: {} },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
export const Meal = mongoose.model('Meal', mealSchema);
export const Event = mongoose.model('Event', eventSchema);
