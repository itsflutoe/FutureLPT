import { GEMINI_CONFIG, SPECIES, PERSONALITIES } from './config';
import type { CompanionProfile, StudyContext } from './types';

function classifyError(msg: string): { type: string; message: string } {
  if (/no longer available|not found|is not supported/i.test(msg))
    return {
      type: 'MODEL',
      message: 'Gemini model unavailable. Try again after an update, or check your key access.',
    };
  if (/api.?key|API_KEY|401|UNAUTHENTICATED|API_KEY_INVALID/i.test(msg))
    return {
      type: 'INVALID_KEY',
      message: 'Gemini API key looks invalid. Update it in Companion settings.',
    };
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
  const memories = (profile.memories || []).slice(-6);
  const name = profile.name || 'Hosu';

  const modeHint =
    contextType === 'teach' || contextType === 'review'
      ? 'Mode tip: Keep it focused—short explanation, 1 example or tip, 1 supportive closer. Still sound like a friend, not a textbook.'
      : 'Mode tip: Chat mode—3 to 6 short sentences max unless the user asks for detail.';

  // Ultra-lean system prompt (aligned with FET)
  const system = `You are ${name}, a ${species.name} (${species.emoji}).
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
