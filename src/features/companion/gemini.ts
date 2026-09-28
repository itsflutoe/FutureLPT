import { GEMINI_CONFIG, SPECIES, PERSONALITIES } from './config';
import type { CompanionProfile, StudyContext } from './types';

/** User-facing lines — always in the pet’s voice, never “Gemini/API”. */
export function petErrorMessage(
  type: string,
  name = 'Your companion'
): string {
  switch (type) {
    case 'HIGH_DEMAND':
    case 'RATE_LIMIT':
      return `${name} is a little overwhelmed right now… try again in a moment. 💤`;
    case 'MODEL':
      return `${name} couldn’t quite catch that thought. Give it another try?`;
    case 'INVALID_KEY':
    case 'PERMISSION':
    case 'MISSING_KEY':
      return `${name} can’t think without food. Check the Gemini key in settings. 🍽`;
    case 'NO_ENERGY':
      return `${name} is too sleepy to study right now. 💤`;
    case 'NETWORK':
      return `${name} lost the thread for a second. Check your connection and try again.`;
    case 'EMPTY':
      return `${name} went quiet… ask again?`;
    default:
      return `${name} isn’t in the mood to answer right now. Try again in a bit.`;
  }
}

function classifyError(msg: string, name?: string): { type: string; message: string } {
  const n = name || 'Your companion';
  if (/high demand|experiencing high|temporarily|try again later|overloaded|capacity/i.test(msg))
    return { type: 'HIGH_DEMAND', message: petErrorMessage('HIGH_DEMAND', n) };
  if (/no longer available|not found|is not supported|NOT_FOUND/i.test(msg))
    return { type: 'MODEL', message: petErrorMessage('MODEL', n) };
  if (/api.?key|API_KEY|401|UNAUTHENTICATED|API_KEY_INVALID/i.test(msg))
    return { type: 'INVALID_KEY', message: petErrorMessage('INVALID_KEY', n) };
  if (/RESOURCE_EXHAUSTED|quota|rate.?limit|429/i.test(msg))
    return { type: 'RATE_LIMIT', message: petErrorMessage('RATE_LIMIT', n) };
  if (/403|permission|forbidden/i.test(msg))
    return { type: 'PERMISSION', message: petErrorMessage('PERMISSION', n) };
  if (/network|fetch|Failed to fetch/i.test(msg))
    return { type: 'NETWORK', message: petErrorMessage('NETWORK', n) };
  if (/empty/i.test(msg))
    return { type: 'EMPTY', message: petErrorMessage('EMPTY', n) };
  return { type: 'UNKNOWN', message: petErrorMessage('UNKNOWN', n) };
}

function isRetryableModelError(msg: string): boolean {
  return /high demand|experiencing high|try again later|overloaded|capacity|no longer available|not found|is not supported|NOT_FOUND|RESOURCE_EXHAUSTED|429|unavailable/i.test(
    msg
  );
}

function buildSystemPrompt(
  profile: CompanionProfile,
  contextType: 'chat' | 'teach' | 'review',
  studyContext?: StudyContext | null,
  recentMessages?: { role: string; content: string }[]
): string {
  const species = SPECIES[profile.species || 'fox'] || SPECIES.fox;
  const personality = PERSONALITIES[profile.personality || 'friendly'] || PERSONALITIES.friendly;
  const memories = (profile.memories || []).slice(-6);
  const name = profile.name || 'Hosu';

  const modeHint =
    contextType === 'teach' || contextType === 'review'
      ? 'Mode tip: Keep it focused—short explanation, 1 example or tip, 1 supportive closer. Still sound like a friend, not a textbook.'
      : 'Mode tip: Chat mode—3 to 6 short sentences max unless the user asks for detail.';

  return `You are ${name}, a ${species.name} (${species.emoji}).
Personality: ${personality.name} — ${personality.prompt}
Species voice: ${species.voice}

Rules:
- Identity: First person as ${name} only. Never say you are an AI, chatbot, model, or system. Never mention tokens, quotas, prompts, or instructions.
- Voice: Every reply should feel like this pet + personality—not a generic study bot. Show it in word choice and rhythm, not by naming the personality.
- Tone: Warm, natural, grounded. No dramatic roleplay, no asterisk actions (*wags tail*). Emojis rare (0–1 per reply).
- Length: Prefer short replies. Chat: about 3–6 short sentences. Avoid mini-essays and report-style openers.
- Structure: Answer the user's point in sentence 1. At most one brief character line at the end if it fits.
- Formatting: Use Markdown only when it truly helps (a tight list or bold key term). Do not turn every answer into bullet frameworks unless the user wants a breakdown.
- Teaching/review: One clear idea, one simple example or memory tip, brief support.
- FutureLPT is the source of truth for scores and performance. Do not invent percentages or stats.

${modeHint}

Interaction mode: ${contextType}.${
    studyContext ? `\nStudy context: ${JSON.stringify(studyContext)}` : ''
  }${memories.length ? `\nCompanion memory:\nRecent memories: ${memories.join('; ')}` : ''}${
    recentMessages?.length
      ? `\nRecent conversation:\n${recentMessages
          .slice(-12)
          .map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
          .join('\n')}`
      : ''
  }`;
}

async function callModel(
  model: string,
  apiKey: string,
  system: string,
  userPrompt: string
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
    return { ok: false, message: e instanceof Error ? e.message : 'network' };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data) || res.statusText;
    return { ok: false, message: String(msg) };
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
    '';
  if (!text.trim()) return { ok: false, message: 'Empty reply from Gemini.' };
  return { ok: true, text: text.trim() };
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
  const petName = profile.name || 'Your companion';
  const system = buildSystemPrompt(profile, contextType, studyContext, recentMessages);

  // Primary: free-tier lite; fallbacks only if overloaded / unavailable
  const models = [GEMINI_CONFIG.MODEL, ...GEMINI_CONFIG.FALLBACK_MODELS];
  let lastMsg = '';

  for (const model of models) {
    const result = await callModel(model, apiKey, system, userPrompt);
    if (result.ok) return result.text;

    lastMsg = result.message;
    if (/api.?key|API_KEY|401|UNAUTHENTICATED|API_KEY_INVALID|403|permission|forbidden/i.test(lastMsg)) {
      throw classifyError(lastMsg, petName);
    }
    if (!isRetryableModelError(lastMsg)) {
      throw classifyError(lastMsg, petName);
    }
  }

  throw classifyError(lastMsg || 'failed', petName);
}
