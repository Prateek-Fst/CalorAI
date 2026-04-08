import { User } from '../db.js';
import { logEvent } from './events.js';
import { getOrAssign } from './experiments.js';

export async function getOrCreateUser({ telegramId, username, firstName }) {
  let user = await User.findOne({ telegramId: String(telegramId) });
  let isNew = false;
  if (!user) {
    user = await User.create({ telegramId: String(telegramId), username, firstName });
    isNew = true;
    await logEvent(user._id, 'user_created', { telegramId: user.telegramId });
  }
  user.lastActiveAt = new Date();
  await user.save();
  const group = await getOrAssign(user);
  return { user, group, isNew };
}

export async function setOnboardingStep(userId, step, completed = false) {
  const update = { onboardingStep: step };
  if (completed) update.onboardingCompleted = true;
  return User.findByIdAndUpdate(userId, update, { new: true });
}

export async function markBlocked(telegramId) {
  return User.findOneAndUpdate({ telegramId: String(telegramId) }, { blocked: true });
}
