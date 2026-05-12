import { promises as fs } from 'fs';
import path from 'path';

const JOURNEY_FILE = path.join(process.cwd(), 'data', 'journey-post.json');

// --- TYPES ---

interface JourneyPostRaw {
  fetchedAt: string;
  raw: string;
  translated?: string;
  username: string;
}

export interface JourneyPost {
  fetchedAt: string;
  username: string;
  dayNumber: number | null;
  location: string | null;
  kmToday: string | null;
  paragraphs: string[];
}

// --- FILE I/O ---

async function readPost(): Promise<JourneyPostRaw | null> {
  try {
    const raw = await fs.readFile(JOURNEY_FILE, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as JourneyPostRaw;
  } catch {
    return null;
  }
}

async function writePost(post: JourneyPostRaw): Promise<void> {
  const tmp = JOURNEY_FILE + '.tmp';
  try {
    await fs.writeFile(tmp, JSON.stringify(post, null, 2), 'utf-8');
    await fs.copyFile(tmp, JOURNEY_FILE);
    await fs.unlink(tmp);
  } catch (err) {
    try { await fs.unlink(tmp); } catch { /* ignore */ }
    throw err;
  }
}

// --- TRANSLATION ---

async function translateText(swedishText: string): Promise<string | null> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [swedishText],
        source_lang: 'SV',
        target_lang: 'EN-GB',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.translations?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// --- PARSING ---

// "Day {N}. {Location}, {km} km" — best-effort, null fields on no-match
function parseFirstLine(line: string): {
  dayNumber: number | null;
  location: string | null;
  kmToday: string | null;
} {
  // Match: Day 1. Smygehuk - Byn, 24 km
  const match = line.match(/^Day\s+(\d+)\.\s+(.+),\s+([\d.,]+)\s+km\s*$/i);
  if (!match) return { dayNumber: null, location: null, kmToday: null };
  return {
    dayNumber: parseInt(match[1], 10),
    location: match[2].trim(),
    kmToday: match[3].trim(),
  };
}

function cleanBody(text: string): string[] {
  // Strip hashtags and URLs
  const cleaned = text
    .replace(/#\S+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();

  // Split into paragraphs on blank lines, collapse internal whitespace
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return paragraphs;
}

// --- WORD WRAP ---

export function wordWrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!word) continue;
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// --- MAIN EXPORT ---

export async function getJourneyPost(): Promise<JourneyPost | null> {
  const post = await readPost();
  if (!post) return null;

  // Translate if needed
  let translated = post.translated ?? null;
  if (!translated && post.raw) {
    translated = await translateText(post.raw);
    if (translated) {
      await writePost({ ...post, translated });
    }
  }

  const text = translated ?? post.raw;
  const lines = text.split('\n');
  const firstLine = lines[0] ?? '';
  const { dayNumber, location, kmToday } = parseFirstLine(firstLine);

  // Body: everything after line 1
  const bodyText = lines.slice(1).join('\n');
  const paragraphs = cleanBody(bodyText);

  return {
    fetchedAt: post.fetchedAt,
    username: post.username,
    dayNumber,
    location,
    kmToday,
    paragraphs,
  };
}
