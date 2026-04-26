import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ReviewSubmittedEvent } from './index.js';

const themeNames = ['acting', 'plot', 'visuals', 'soundtrack', 'pacing'] as const;
const themeValues = ['positive', 'negative', 'neutral', 'not_mentioned'] as const;

export type ThemeName = (typeof themeNames)[number];
export type ThemeValue = (typeof themeValues)[number];

export type ReviewAnalysis = {
  sentiment_score: number;
  themes: Record<ThemeName, ThemeValue>;
  spoiler_detected: boolean;
  summary: string;
};

type GenerateText = (prompt: string) => Promise<string>;

function buildPrompt(reviewText: string): string {
  return [
    'Analyze the following movie review and return only valid JSON.',
    'Do not include markdown fences, prose, or comments.',
    'The JSON shape must be:',
    '{',
    '  "sentiment_score": number from 0 to 10,',
    '  "themes": {',
    '    "acting": "positive" | "negative" | "neutral" | "not_mentioned",',
    '    "plot": "positive" | "negative" | "neutral" | "not_mentioned",',
    '    "visuals": "positive" | "negative" | "neutral" | "not_mentioned",',
    '    "soundtrack": "positive" | "negative" | "neutral" | "not_mentioned",',
    '    "pacing": "positive" | "negative" | "neutral" | "not_mentioned"',
    '  },',
    '  "spoiler_detected": boolean,',
    '  "summary": string under 100 characters',
    '}',
    '',
    `Review: ${reviewText}`,
  ].join('\n');
}

function stripMarkdownCodeFences(text: string): string {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fencedJson?.[1]?.trim() ?? trimmed;
}

function isThemeValue(value: unknown): value is ThemeValue {
  return typeof value === 'string' && themeValues.includes(value as ThemeValue);
}

function parseReviewAnalysis(text: string): ReviewAnalysis {
  const parsed = JSON.parse(stripMarkdownCodeFences(text)) as Partial<ReviewAnalysis>;

  if (
    typeof parsed.sentiment_score !== 'number' ||
    parsed.sentiment_score < 0 ||
    parsed.sentiment_score > 10
  ) {
    throw new Error('Invalid sentiment_score');
  }

  if (typeof parsed.themes !== 'object' || parsed.themes === null) {
    throw new Error('Invalid themes');
  }

  const themes = parsed.themes as Partial<Record<ThemeName, unknown>>;
  for (const theme of themeNames) {
    if (!isThemeValue(themes[theme])) {
      throw new Error(`Invalid theme value for ${theme}`);
    }
  }

  if (typeof parsed.spoiler_detected !== 'boolean') {
    throw new Error('Invalid spoiler_detected');
  }

  if (typeof parsed.summary !== 'string' || parsed.summary.length > 100) {
    throw new Error('Invalid summary');
  }

  return {
    sentiment_score: parsed.sentiment_score,
    themes: themes as Record<ThemeName, ThemeValue>,
    spoiler_detected: parsed.spoiler_detected,
    summary: parsed.summary,
  };
}

export async function analyzeReviewWithRetries(
  event: ReviewSubmittedEvent,
  generateText: GenerateText,
): Promise<ReviewAnalysis> {
  const prompt = buildPrompt(event.text);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const responseText = await generateText(prompt);
      return parseReviewAnalysis(responseText);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Gemini returned invalid review analysis after 3 attempts: ${String(lastError)}`);
}

export async function analyzeReviewWithGemini(event: ReviewSubmittedEvent): Promise<ReviewAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  });

  return analyzeReviewWithRetries(event, async (prompt) => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}
