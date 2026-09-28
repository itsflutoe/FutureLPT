import { supabase } from '@/lib/supabase';
import { COMPANION_ENERGY } from './config';
import type { CompanionProfile, CompanionMessage } from './types';
import type { PersonalityId, SpeciesId } from './config';
import { calculateEnergy } from './energy';

function mapRow(row: Record<string, unknown>): CompanionProfile {
  const memories = Array.isArray(row.memories) ? (row.memories as string[]) : [];
  return {
    user_id: row.user_id as string,
    unlocked: !!row.unlocked,
    unlocked_at: (row.unlocked_at as string) || null,
    name: (row.name as string) || null,
    species: (row.species as SpeciesId) || null,
    gender: (row.gender as string) || null,
    personality: (row.personality as PersonalityId) || null,
    energy: Number(row.energy ?? COMPANION_ENERGY.MAX),
    max_energy: Number(row.max_energy ?? COMPANION_ENERGY.MAX),
    last_energy_update: (row.last_energy_update as string) || new Date().toISOString(),
    memories,
    gemini_api_key: (row.gemini_api_key as string) || null,
    hidden_on_dashboard: !!row.hidden_on_dashboard,
    mood: (row.mood as CompanionProfile['mood']) || 'waiting',
    created_at: (row.created_at as string) || '',
    updated_at: (row.updated_at as string) || '',
  };
}

export async function fetchCompanionProfile(userId: string): Promise<CompanionProfile | null> {
  const { data, error } = await supabase
    .from('companion_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const profile = mapRow(data);
  // Apply regen
  const calc = calculateEnergy(profile.energy, profile.max_energy, profile.last_energy_update);
  if (calc.energy !== profile.energy) {
    await supabase
      .from('companion_profiles')
      .update({ energy: calc.energy, last_energy_update: calc.lastEnergyUpdate })
      .eq('user_id', userId);
    profile.energy = calc.energy;
    profile.last_energy_update = calc.lastEnergyUpdate;
  }
  return profile;
}

export async function ensureCompanionRow(userId: string): Promise<CompanionProfile> {
  const existing = await fetchCompanionProfile(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('companion_profiles')
    .insert({
      user_id: userId,
      unlocked: false,
      energy: COMPANION_ENERGY.MAX,
      max_energy: COMPANION_ENERGY.MAX,
      last_energy_update: new Date().toISOString(),
      memories: [],
      mood: 'waiting',
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function unlockAndCreatePet(
  userId: string,
  pet: { name: string; species: SpeciesId; gender: string; personality: PersonalityId }
): Promise<CompanionProfile> {
  await ensureCompanionRow(userId);
  const { data, error } = await supabase
    .from('companion_profiles')
    .update({
      unlocked: true,
      unlocked_at: new Date().toISOString(),
      name: pet.name.trim() || 'Hosu',
      species: pet.species,
      gender: pet.gender,
      personality: pet.personality,
      mood: 'happy',
      energy: COMPANION_ENERGY.MAX,
      last_energy_update: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateCompanionProfile(
  userId: string,
  patch: Partial<CompanionProfile>
): Promise<CompanionProfile> {
  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  delete payload.user_id;
  delete payload.created_at;
  const { data, error } = await supabase
    .from('companion_profiles')
    .update(payload)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function fetchRecentMessages(userId: string, limit = 40): Promise<CompanionMessage[]> {
  const { data, error } = await supabase
    .from('companion_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data || []) as CompanionMessage[]).reverse();
}

export async function insertMessage(
  userId: string,
  role: 'user' | 'companion' | 'system',
  content: string,
  contextType = 'chat'
): Promise<void> {
  await supabase.from('companion_messages').insert({
    user_id: userId,
    role,
    content,
    context_type: contextType,
  });
}

export async function spendEnergy(userId: string, profile: CompanionProfile, cost: number) {
  const calc = calculateEnergy(profile.energy, profile.max_energy, profile.last_energy_update);
  if (calc.energy < cost) return { ok: false as const, energy: calc.energy };
  const next = calc.energy - cost;
  await supabase
    .from('companion_profiles')
    .update({ energy: next, last_energy_update: new Date().toISOString() })
    .eq('user_id', userId);
  return { ok: true as const, energy: next };
}

export async function pushMemory(userId: string, memories: string[], line: string) {
  const next = [...memories, line].slice(-20);
  await supabase.from('companion_profiles').update({ memories: next }).eq('user_id', userId);
  return next;
}
