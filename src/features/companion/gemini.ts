import { GEMINI_CONFIG, SPECIES, PERSONALITIES } from './config';
import type { CompanionProfile, StudyContext } from './types';

function classifyError(msg: string): { type: string; message: string } {
  if (/api.?key|API_KEY|401|UNAUTHENTICATED/i.test(msg))
    return { type: 'INVALID_KEY', message: 'Gemini API key looks invalid. Update it in Companion settings.' };
  if (/RESOURCE_EXHAUSTED|quota|rate.?limit|429/i.test(msg))
    return { type: 'RATE_LIMIT', message: 'Gemini rate limit or quota hit. Try again in a bit.' };
  if (/403|permission|forbidden/i.test(msg))
    return { type: 'PERMISSION', message: 'Gemini permission error. Check your API key access.' };
  if (/network|fetch|Failed to fetch/i.test(msg))
    return { type: 'NETWORK', message: 'Network error talking to Gemini.' };
  return { type: 'UNKNOWN', message: msg || 'Something went wrong with Gemini.' };
}

export async function generateCompanionReply(opts: {
  profile: CompanionProfile;
  apiKey: string;
  userPrompt: string;
  contextType: 'chat' | 'teach' | 'review';
  studyContext?: StudyContext | null;
  recentMessages?: { role: string; content: string }[];
}): Promise<string> {
  const { profile, apiKey, userPrompt, contextType, studyContext, recentMessages } = opts;
  const species = SPECIES[profile.species || 'fox'] || SPECIES.fox;
  const personality = PERSONALITIES[profile.personality || 'friendly'] || PERSONALITIES.friendly;
  const memories = (profile.memories || []).slice(-8);

  const system = `You are ${profile.name || 'Hosu'}, a ${species.name} (${species.emoji}).
Personality: ${personality.name} — ${personality.prompt}
Species voice: ${species.voice}

Rules:
- Speak in first person as ${profile.name || 'Hosu'} only. Never say you are an AI, model, or system.
- Warm, natural, short. Chat: 3–6 short sentences unless asked for more.
- Personality affects tone only — educational facts must stay accurate.
- FutureLPT is the source of truth for scores and performance. Do not invent percentages or stats.
- Markdown sparingly.

Mode: ${contextType}.
${studyContext ? `Study context: ${JSON.stringify(studyContext)}` : ''}
${memories.length ? `Memories: ${memories.join('; ')}` : ''}
${
    recentMessages?.length
      ? `Recent conversation:\n${recentMessages
          .slice(-12)
          .map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
          .join('\n')}`
      : ''
  }`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: GEMINI_CONFIG.TEMPERATURE,
          maxOutputTokens: GEMINI_CONFIG.MAX_OUTPUT_TOKENS,
        },
      }),
    });
  } catch (e) {
    throw classifyError(e instanceof Error ? e.message : 'network');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data) || res.statusText;
    throw classifyError(msg);
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
    '';
  if (!text.trim()) throw { type: 'EMPTY', message: 'Empty reply from Gemini.' };
  return text.trim();
}
