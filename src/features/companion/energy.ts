import { COMPANION_ENERGY } from './config';

export function calculateEnergy(
  energy: number,
  maxEnergy: number,
  lastUpdateIso: string
): { energy: number; lastEnergyUpdate: string; nextRegenMs: number } {
  const max = maxEnergy || COMPANION_ENERGY.MAX;
  let e = energy;
  let last = new Date(lastUpdateIso).getTime();
  if (Number.isNaN(last)) last = Date.now();
  const now = Date.now();
  if (e >= max) {
    return { energy: max, lastEnergyUpdate: new Date(last).toISOString(), nextRegenMs: 0 };
  }
  const elapsed = now - last;
  const gained = Math.floor(elapsed / COMPANION_ENERGY.REGEN_MS);
  if (gained > 0) {
    e = Math.min(max, e + gained);
    last = last + gained * COMPANION_ENERGY.REGEN_MS;
  }
  const nextRegenMs = e >= max ? 0 : COMPANION_ENERGY.REGEN_MS - ((now - last) % COMPANION_ENERGY.REGEN_MS);
  return {
    energy: e,
    lastEnergyUpdate: new Date(last).toISOString(),
    nextRegenMs,
  };
}
