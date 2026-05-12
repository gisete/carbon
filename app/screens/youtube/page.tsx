import { getYouTubeData, type WeeklySnapshot, type VideoData } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

// JetBrains Mono via CSS variable set on <html> by Next.js font loader
const MONO = 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace';

// --- HELPERS ---

// Full comma-separated number: 12,847
function formatFull(n: number): string {
  return n.toLocaleString('en-US');
}

// Abbreviated for large totals: 1.2M, 42.5K
function formatShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
}

// "08 MAY 2026"
function formatPublished(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return `${day} ${mon} ${d.getFullYear()}`;
}

// --- SHARED PRIMITIVES ---

const RULE = (margin = '10px 0') => (
  <div style={{ height: 1, background: '#ddd', margin }} />
);

const LABEL = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.12em',
      color: '#777',
      textTransform: 'uppercase' as const,
      marginBottom: 4,
    }}
  >
    {children}
  </div>
);

// Stat block: label → value → rule (rule is after, matching the screenshot)
function StatBlock({
  label,
  value,
  suffix,
  size = 64,
}: {
  label: string;
  value: string;
  suffix?: string;
  size?: number;
}) {
  return (
    <div style={{ marginBottom: 0 }}>
      <LABEL>{label}</LABEL>
      <div
        style={{
          fontFamily: MONO,
          fontSize: size,
          fontWeight: 700,
          lineHeight: 1,
          color: '#000',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: size * 0.28, fontWeight: 700, color: '#000' }}>
            {suffix}
          </span>
        )}
      </div>
      {RULE()}
    </div>
  );
}

// --- BAR CHART (no value labels) ---

function BarChart({ snapshots }: { snapshots: WeeklySnapshot[] }) {
  if (snapshots.length < 1) return null;

  const CHART_W = 230;
  const CHART_H = 110;
  const LABEL_H = 20;
  const BAR_W = 26;
  const n = snapshots.length;
  const gap = (CHART_W - BAR_W * n) / (n + 1);

  const maxSubs = Math.max(...snapshots.map((s) => s.subscriberCount));
  const minSubs = Math.min(...snapshots.map((s) => s.subscriberCount));
  const range = maxSubs - minSubs || 1;
  const currentWeekKey = snapshots[snapshots.length - 1]?.weekKey;

  return (
    <svg width={CHART_W} height={CHART_H + LABEL_H} style={{ display: 'block' }}>
      {snapshots.map((snap, i) => {
        const x = gap + i * (BAR_W + gap);
        const barH = Math.max(8, ((snap.subscriberCount - minSubs) / range) * (CHART_H - 10));
        const y = CHART_H - barH;
        const isCurrent = snap.weekKey === currentWeekKey;
        const weekNum = snap.weekKey.split('-W')[1];

        return (
          <g key={snap.weekKey}>
            <rect x={x} y={y} width={BAR_W} height={barH} fill={isCurrent ? '#000' : '#ccc'} />
            <text
              x={x + BAR_W / 2}
              y={CHART_H + 14}
              fontSize="10"
              textAnchor="middle"
              fill={isCurrent ? '#000' : '#aaa'}
              fontWeight={isCurrent ? 'bold' : 'normal'}
              fontFamily={MONO}
            >
              W{weekNum}
            </text>
          </g>
        );
      })}
      <line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="#ddd" strokeWidth="1" />
    </svg>
  );
}

// --- VIDEO PANEL (col 3) ---

function VideoPanel({
  video,
  rank,
}: {
  video: VideoData;
  rank: { rank: number; total: number } | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <LABEL>Latest Upload</LABEL>
      {RULE('0 0 10px')}

      <div
        style={{
          fontFamily: MONO,
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.35,
          color: '#000',
          marginBottom: 10,
        }}
      >
        {video.title}
      </div>
      {RULE()}

      <LABEL>Published</LABEL>
      <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
        {formatPublished(video.publishedAt)}
      </div>
      {RULE()}

      <LABEL>Views</LABEL>
      <div style={{ fontFamily: MONO, fontSize: 46, fontWeight: 700, lineHeight: 1, marginBottom: 10 }}>
        {formatFull(video.viewCount)}
      </div>
      {RULE()}

      {rank && (
        <div
          style={{
            display: 'inline-block',
            border: '1.5px solid #000',
            padding: '5px 12px',
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            alignSelf: 'center',
            marginTop: 8,
          }}
        >
          RANK: {rank.rank} / {rank.total}
        </div>
      )}
    </div>
  );
}

// --- MAIN SCREEN ---

export default async function YoutubeScreen() {
  const data = await getYouTubeData();

  const headerRow = (syncLabel: string) => (
    <div
      style={{
        height: 40,
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, letterSpacing: '0.1em' }}>
        INKLESS
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: '#aaa', letterSpacing: '0.06em' }}>
        {syncLabel}
      </span>
    </div>
  );

  if (!data) {
    return (
      <div style={{ width: 800, height: 480, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {headerRow('YOUTUBE')}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: '0.06em' }}>
            YOUTUBE DATA UNAVAILABLE
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#aaa' }}>
            Check YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID environment variables.
          </div>
        </div>
        {RULE('0')}
      </div>
    );
  }

  const syncLabel = data.minutesSinceFetch === 0
    ? 'SYNC: JUST NOW'
    : `SYNC: ${data.minutesSinceFetch}M AGO`;

  return (
    <div
      style={{
        width: 800,
        height: 480,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#000',
      }}
    >
      {headerRow(syncLabel)}

      {/* ── Three columns ── */}
      <div style={{ height: 412, display: 'flex', flexShrink: 0 }}>

        {/* ── Col 1: key stats ── */}
        <div
          style={{
            width: 268,
            padding: '16px 16px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <StatBlock
            label="Subscribers"
            value={formatFull(data.channelStats.subscriberCount)}
            size={62}
          />
          {data.newSubscribersThisWeek !== null && (
            <StatBlock
              label="New This Week"
              value={(data.newSubscribersThisWeek >= 0 ? '+' : '') + formatFull(data.newSubscribersThisWeek)}
              size={62}
            />
          )}
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: '#ddd', flexShrink: 0 }} />

        {/* ── Col 2: total views + bar chart ── */}
        <div
          style={{
            flex: 1,
            padding: '16px 16px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <LABEL>Total Views</LABEL>
          <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>
            {formatShort(data.channelStats.viewCount)}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#aaa', marginBottom: 10 }}>
            {formatFull(data.channelStats.viewCount)} lifetime
          </div>
          {RULE()}

          {data.weeklySnapshots.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <LABEL>Weekly New Subs</LABEL>
              <div style={{ marginTop: 8 }}>
                <BarChart snapshots={data.weeklySnapshots} />
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: '#ddd', flexShrink: 0 }} />

        {/* ── Col 3: latest video ── */}
        <div
          style={{
            width: 240,
            padding: '16px 16px 16px 16px',
            background: '#f0f0f0',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {data.latestVideo ? (
            <VideoPanel video={data.latestVideo} rank={data.videoRank} />
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#aaa', marginTop: 8 }}>
              No videos found.
            </div>
          )}
        </div>
      </div>

      {/* Footer rule at y=452 */}
      <div style={{ height: 1, background: '#ddd', flexShrink: 0 }} />
    </div>
  );
}
