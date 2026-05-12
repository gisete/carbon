import { promises as fs } from 'fs';
import path from 'path';

const YOUTUBE_STATE_FILE = path.join(process.cwd(), 'data', 'youtube-state.json');

// --- TYPES ---

export interface WeeklySnapshot {
  weekKey: string;
  subscriberCount: number;
  recordedAt: number;
}

interface YouTubeState {
  weeklySnapshots: WeeklySnapshot[];
  lastFetchedAt: number;
}

export interface ChannelStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export interface VideoData {
  id: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
}

export interface YouTubeData {
  channelName: string;
  channelStats: ChannelStats;
  latestVideo: VideoData | null;
  videoRank: { rank: number; total: number } | null;
  weeklySnapshots: WeeklySnapshot[];
  newSubscribersThisWeek: number | null;
  minutesSinceFetch: number;
}

// --- HELPERS ---

function getWeekKey(): string {
  const now = new Date();
  const thursday = new Date(now);
  thursday.setDate(now.getDate() + (4 - (now.getDay() || 7)));
  const year = thursday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((thursday.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7
  );
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

async function readState(): Promise<YouTubeState> {
  try {
    const raw = await fs.readFile(YOUTUBE_STATE_FILE, 'utf-8');
    if (!raw.trim()) return { weeklySnapshots: [], lastFetchedAt: 0 };
    return JSON.parse(raw) as YouTubeState;
  } catch {
    return { weeklySnapshots: [], lastFetchedAt: 0 };
  }
}

async function writeState(state: YouTubeState): Promise<void> {
  const tmp = YOUTUBE_STATE_FILE + '.tmp';
  try {
    await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf-8');
    await fs.copyFile(tmp, YOUTUBE_STATE_FILE);
    await fs.unlink(tmp);
  } catch (err) {
    try { await fs.unlink(tmp); } catch { /* ignore */ }
    throw err;
  }
}

// --- API CALLS ---

async function fetchChannelData(): Promise<{ channelName: string; stats: ChannelStats } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return null;

  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  return {
    channelName: item.snippet?.title ?? 'YouTube Channel',
    stats: {
      subscriberCount: parseInt(item.statistics.subscriberCount ?? '0', 10),
      viewCount: parseInt(item.statistics.viewCount ?? '0', 10),
      videoCount: parseInt(item.statistics.videoCount ?? '0', 10),
    },
  };
}

async function fetchLatestVideo(): Promise<VideoData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return null;

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=1&type=video&key=${apiKey}`;
  const searchRes = await fetch(searchUrl, { next: { revalidate: 1800 } });
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const videoId = searchData.items?.[0]?.id?.videoId;
  if (!videoId) return null;

  const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${apiKey}`;
  const videoRes = await fetch(videoUrl, { next: { revalidate: 1800 } });
  if (!videoRes.ok) return null;
  const videoData = await videoRes.json();
  const video = videoData.items?.[0];
  if (!video) return null;

  return {
    id: videoId,
    title: video.snippet.title,
    publishedAt: video.snippet.publishedAt,
    viewCount: parseInt(video.statistics.viewCount ?? '0', 10),
    likeCount: parseInt(video.statistics.likeCount ?? '0', 10),
  };
}

async function fetchVideoRank(
  videoId: string,
  totalVideos: number
): Promise<{ rank: number; total: number } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return null;

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&maxResults=50&type=video&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) return null;
  const data = await res.json();
  const items: { id?: { videoId?: string } }[] = data.items ?? [];
  const idx = items.findIndex((item) => item.id?.videoId === videoId);
  if (idx === -1) return null;
  return { rank: idx + 1, total: totalVideos };
}

// --- MAIN EXPORT ---

export async function getYouTubeData(): Promise<YouTubeData | null> {
  try {
    const [channelResult, latestVideo] = await Promise.all([
      fetchChannelData(),
      fetchLatestVideo(),
    ]);

    if (!channelResult) return null;
    const { channelName, stats: channelStats } = channelResult;

    let videoRank: { rank: number; total: number } | null = null;
    if (latestVideo) {
      videoRank = await fetchVideoRank(latestVideo.id, channelStats.videoCount);
    }

    // Weekly snapshot management
    const state = await readState();
    const prevLastFetchedAt = state.lastFetchedAt;
    const currentWeekKey = getWeekKey();
    const now = Date.now();

    const existingIdx = state.weeklySnapshots.findIndex((s) => s.weekKey === currentWeekKey);
    let stateChanged = false;

    if (existingIdx >= 0) {
      if (state.weeklySnapshots[existingIdx].subscriberCount !== channelStats.subscriberCount) {
        state.weeklySnapshots[existingIdx].subscriberCount = channelStats.subscriberCount;
        state.weeklySnapshots[existingIdx].recordedAt = now;
        stateChanged = true;
      }
    } else {
      state.weeklySnapshots.push({
        weekKey: currentWeekKey,
        subscriberCount: channelStats.subscriberCount,
        recordedAt: now,
      });
      if (state.weeklySnapshots.length > 6) {
        state.weeklySnapshots = state.weeklySnapshots.slice(-6);
      }
      stateChanged = true;
    }

    if (stateChanged) {
      state.lastFetchedAt = now;
      await writeState(state);
    }

    // Weekly delta: current week vs most recent prior week
    let newSubscribersThisWeek: number | null = null;
    const currentSnapshot = state.weeklySnapshots.find((s) => s.weekKey === currentWeekKey);
    const priorSnapshots = state.weeklySnapshots
      .filter((s) => s.weekKey !== currentWeekKey)
      .sort((a, b) => b.weekKey.localeCompare(a.weekKey));

    if (currentSnapshot && priorSnapshots.length > 0) {
      newSubscribersThisWeek = currentSnapshot.subscriberCount - priorSnapshots[0].subscriberCount;
    }

    const minutesSinceFetch = prevLastFetchedAt
      ? Math.floor((now - prevLastFetchedAt) / 60000)
      : 0;

    return {
      channelName,
      channelStats,
      latestVideo,
      videoRank,
      weeklySnapshots: state.weeklySnapshots,
      newSubscribersThisWeek,
      minutesSinceFetch,
    };
  } catch (err) {
    console.error('[YouTube] Failed to fetch data:', err);
    return null;
  }
}
