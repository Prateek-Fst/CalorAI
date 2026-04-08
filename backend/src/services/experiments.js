import crypto from 'crypto';
import { supabase, toCamel } from '../db.js';
import { logEvent } from './events.js';

/**
 * A/B engine: real Statsig if STATSIG_SERVER_KEY is set, otherwise an
 * internal deterministic SHA-256 bucketer with the same interface.
 */
const EXPERIMENT_NAME = 'onboarding_flow_v1';
const GROUPS = ['control', 'test'];

let statsig = null;
let statsigReady = false;

export async function initExperiments() {
  const key = process.env.STATSIG_SERVER_KEY;
  if (!key) {
    console.log('[experiments] STATSIG_SERVER_KEY not set — using internal bucketing');
    return;
  }
  try {
    const mod = await import('statsig-node');
    statsig = mod.default || mod;
    await statsig.initialize(key);
    statsigReady = true;
    console.log('[experiments] Statsig initialized');
  } catch (e) {
    console.warn('[experiments] Statsig init failed, falling back:', e.message);
  }
}

function hashBucket(unitId) {
  const h = crypto.createHash('sha256').update(`${EXPERIMENT_NAME}:${unitId}`).digest('hex');
  const u = parseInt(h.slice(0, 8), 16) / 0xffffffff;
  return u < 0.5 ? 'control' : 'test';
}

export function assignGroup(unitId) {
  if (statsigReady && statsig) {
    try {
      const exp = statsig.getExperimentSync({ userID: String(unitId) }, EXPERIMENT_NAME);
      const group = exp.get('group', null);
      if (GROUPS.includes(group)) return group;
    } catch (e) {
      console.warn('[experiments] Statsig getExperiment failed, fallback:', e.message);
    }
  }
  return hashBucket(unitId);
}

/**
 * Ensure the user has an experiment group. `user` is a camelCase row from db.toCamel.
 * Returns the (possibly updated) user row + the group.
 */
export async function getOrAssign(user) {
  if (user.experimentGroup) return { user, group: user.experimentGroup };
  const group = assignGroup(user.telegramId);
  const { data, error } = await supabase
    .from('users')
    .update({ experiment_group: group })
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;
  await logEvent(user.id, 'experiment_exposure', {
    experiment: EXPERIMENT_NAME,
    group,
    provider: statsigReady ? 'statsig' : 'internal',
  });
  return { user: toCamel(data), group };
}
