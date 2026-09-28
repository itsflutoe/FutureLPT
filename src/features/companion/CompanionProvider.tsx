import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isCompanionEnabled, COMPANION_ENERGY, type PersonalityId, type SpeciesId } from './config';
import type { CompanionProfile, CompanionMessage, StudyContext } from './types';
import {
  ensureCompanionRow,
  fetchCompanionProfile,
  fetchRecentMessages,
  insertMessage,
  unlockAndCreatePet,
  updateCompanionProfile,
  spendEnergy,
  pushMemory,
} from './api';
import { generateCompanionReply, petErrorMessage } from './gemini';
import { calculateEnergy } from './energy';

interface CompanionContextValue {
  enabled: boolean;
  ready: boolean;
  profile: CompanionProfile | null;
  messages: CompanionMessage[];
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  unlockPet: (pet: {
    name: string;
    species: SpeciesId;
    gender: string;
    personality: PersonalityId;
  }) => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  setHidden: (hidden: boolean) => Promise<void>;
  setMood: (mood: CompanionProfile['mood']) => Promise<void>;
  sendMessage: (
    text: string,
    contextType: 'chat' | 'teach' | 'review',
    studyContext?: StudyContext | null
  ) => Promise<string>;
  lastMissContext: StudyContext | null;
  setLastMissContext: (c: StudyContext | null) => void;
  discoveryOpen: boolean;
  setDiscoveryOpen: (v: boolean) => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

function errorToPetLine(e: unknown, name: string): string {
  if (typeof e === 'object' && e && 'type' in e) {
    const t = String((e as { type: string }).type);
    if (t) return petErrorMessage(t, name);
  }
  if (typeof e === 'object' && e && 'message' in e) {
    return String((e as { message: string }).message);
  }
  if (e instanceof Error) return e.message;
  return petErrorMessage('UNKNOWN', name);
}

export function CompanionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const enabled = isCompanionEnabled();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<CompanionProfile | null>(null);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastMissContext, setLastMissContext] = useState<StudyContext | null>(null);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !user) {
      setProfile(null);
      setReady(true);
      return;
    }
    try {
      let p = await fetchCompanionProfile(user.id);
      if (!p) p = await ensureCompanionRow(user.id);
      setProfile(p);
      if (p.unlocked) {
        const msgs = await fetchRecentMessages(user.id);
        setMessages(msgs);
      }
    } catch (e) {
      console.error(e);
      setError(petErrorMessage('UNKNOWN', 'Your companion'));
    } finally {
      setReady(true);
    }
  }, [enabled, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile?.unlocked) return;
    const id = setInterval(() => {
      setProfile((prev) => {
        if (!prev) return prev;
        const c = calculateEnergy(prev.energy, prev.max_energy, prev.last_energy_update);
        if (c.energy === prev.energy) return prev;
        return { ...prev, energy: c.energy, last_energy_update: c.lastEnergyUpdate };
      });
    }, 5000);
    return () => clearInterval(id);
  }, [profile?.unlocked]);

  const unlockPet = useCallback(
    async (pet: {
      name: string;
      species: SpeciesId;
      gender: string;
      personality: PersonalityId;
    }) => {
      if (!user) return;
      const p = await unlockAndCreatePet(user.id, pet);
      setProfile(p);
      setDiscoveryOpen(false);
      setLastMissContext(null);
    },
    [user]
  );

  const setApiKey = useCallback(
    async (key: string) => {
      if (!user) return;
      const p = await updateCompanionProfile(user.id, { gemini_api_key: key.trim() || null });
      setProfile(p);
    },
    [user]
  );

  const setHidden = useCallback(
    async (hidden: boolean) => {
      if (!user) return;
      const p = await updateCompanionProfile(user.id, { hidden_on_dashboard: hidden });
      setProfile(p);
    },
    [user]
  );

  const setMood = useCallback(
    async (mood: CompanionProfile['mood']) => {
      if (!user) return;
      const p = await updateCompanionProfile(user.id, { mood });
      setProfile(p);
    },
    [user]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      contextType: 'chat' | 'teach' | 'review',
      studyContext?: StudyContext | null
    ) => {
      if (!user || !profile) throw new Error('No companion');
      const petName = profile.name || 'Your companion';
      setError(null);
      setLoading(true);
      try {
        const key = profile.gemini_api_key?.trim();
        if (!key) {
          throw { type: 'MISSING_KEY', message: petErrorMessage('MISSING_KEY', petName) };
        }
        const spent = await spendEnergy(user.id, profile, COMPANION_ENERGY.COST);
        if (!spent.ok) {
          await updateCompanionProfile(user.id, { mood: 'low_energy' });
          setProfile((p) => (p ? { ...p, mood: 'low_energy', energy: spent.energy } : p));
          throw { type: 'NO_ENERGY', message: petErrorMessage('NO_ENERGY', petName) };
        }
        setProfile((p) => (p ? { ...p, energy: spent.energy, mood: 'thinking' } : p));

        await insertMessage(user.id, 'user', text, contextType);
        const reply = await generateCompanionReply({
          profile: { ...profile, energy: spent.energy },
          apiKey: key,
          userPrompt: text,
          contextType,
          studyContext,
          recentMessages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        });
        await insertMessage(user.id, 'companion', reply, contextType);

        let memLine = '';
        if (contextType === 'review' && studyContext?.topic)
          memLine = `Reviewed: ${studyContext.topic}`;
        else if (contextType === 'teach' && studyContext?.topic)
          memLine = `Taught: ${studyContext.topic}`;
        else if (text) memLine = `Chat: ${text.slice(0, 60)}`;

        let memories = profile.memories;
        if (memLine) memories = await pushMemory(user.id, profile.memories, memLine);

        await updateCompanionProfile(user.id, { mood: 'happy', memories });
        setProfile((p) => (p ? { ...p, energy: spent.energy, mood: 'happy', memories } : p));
        const msgs = await fetchRecentMessages(user.id);
        setMessages(msgs);
        return reply;
      } catch (e: unknown) {
        const line = errorToPetLine(e, petName);
        setError(line);
        // Show failure as a pet chat bubble (in character)
        try {
          await insertMessage(user.id, 'companion', line, contextType);
          const msgs = await fetchRecentMessages(user.id);
          setMessages(msgs);
        } catch {
          /* ignore */
        }
        const mood =
          typeof e === 'object' && e && 'type' in e && (e as { type: string }).type === 'NO_ENERGY'
            ? 'low_energy'
            : 'mad';
        void updateCompanionProfile(user.id, { mood }).catch(() => {});
        setProfile((p) => (p ? { ...p, mood } : p));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user, profile, messages]
  );

  const value = useMemo(
    () => ({
      enabled,
      ready,
      profile,
      messages,
      error,
      loading,
      refresh,
      unlockPet,
      setApiKey,
      setHidden,
      setMood,
      sendMessage,
      lastMissContext,
      setLastMissContext,
      discoveryOpen,
      setDiscoveryOpen,
    }),
    [
      enabled,
      ready,
      profile,
      messages,
      error,
      loading,
      refresh,
      unlockPet,
      setApiKey,
      setHidden,
      setMood,
      sendMessage,
      lastMissContext,
      discoveryOpen,
    ]
  );

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanion requires CompanionProvider');
  return ctx;
}
