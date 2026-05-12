import { getYouTubeData, type WeeklySnapshot, type VideoData } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

// --- HELPERS ---

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function formatFullCount(n: number): string {
  return n.toLocaleString();
}

function formatPublished(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --- SUB-COMPONENTS ---

function BarChart({ snapshots }: { snapshots: WeeklySnapshot[] }) {
  if (snapshots.length < 1) return null;

  const CHART_W = 220;
  const CHART_H = 90;
  const LABEL_H = 24;
  const BAR_W = 24;
  const n = snapshots.length;
  const totalBarSpace = BAR_W * n;
  const totalGapSpace = CHART_W - totalBarSpace;
  const gap = totalGapSpace / (n + 1);

  const maxSubs = Math.max(...snapshots.map((s) => s.subscriberCount));
  const minSubs = Math.min(...snapshots.map((s) => s.subscriberCount));
  const range = maxSubs - minSubs || 1;
  const currentWeekKey = snapshots[snapshots.length - 1]?.weekKey;

  return (
    <svg
      width={CHART_W}
      height={CHART_H + LABEL_H}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {snapshots.map((snap, i) => {
        const x = gap + i * (BAR_W + gap);
        const barHeight = Math.max(6, ((snap.subscriberCount - minSubs) / range) * (CHART_H - 16));
        const y = CHART_H - barHeight;
        const isCurrent = snap.weekKey === currentWeekKey;
        const weekNum = snap.weekKey.split('-W')[1];

        return (
          <g key={snap.weekKey}>
            <rect
              x={x}
              y={y}
              width={BAR_W}
              height={barHeight}
              fill={isCurrent ? '#000' : '#ccc'}
            />
            <text
              x={x + BAR_W / 2}
              y={y - 3}
              fontSize="9"
              textAnchor="middle"
              fill="#555"
              fontFamily="Roboto, sans-serif"
            >
              {formatCount(snap.subscriberCount)}
            </text>
            <text
              x={x + BAR_W / 2}
              y={CHART_H + 14}
              fontSize="9"
              textAnchor="middle"
              fill={isCurrent ? '#000' : '#aaa'}
              fontWeight={isCurrent ? 'bold' : 'normal'}
              fontFamily="Roboto, sans-serif"
            >
              W{weekNum}
            </text>
          </g>
        );
      })}
      {/* Baseline */}
      <line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="#ddd" strokeWidth="1" />
    </svg>
  );
}

function StatBlock({
  label,
  value,
  valueFontSize = 56,
}: {
  label: string;
  value: string;
  valueFontSize?: number;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          borderBottom: '1px solid #ddd',
          paddingBottom: 4,
          marginBottom: 8,
          textTransform: 'uppercase' as const,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: valueFontSize, fontWeight: 700, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function VideoPanel({
  video,
  rank,
}: {
  video: VideoData;
  rank: { rank: number; total: number } | null;
}) {
  const divider = <div style={{ height: 1, background: '#ddd', margin: '10px 0' }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          borderBottom: '1px solid #ddd',
          paddingBottom: 4,
          marginBottom: 10,
        }}
      >
        Latest Upload
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: 2,
        }}
      >
        {video.title}
      </div>

      {divider}

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2, textTransform: 'uppercase' as const }}>
        Published
      </div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{formatPublished(video.publishedAt)}</div>

      {divider}

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' as const }}>
        Views
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
        {formatCount(video.viewCount)}
      </div>

      {divider}

      {rank && (
        <>
          <div
            style={{
              display: 'inline-block',
              border: '1.5px solid #000',
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              alignSelf: 'flex-start',
              textTransform: 'uppercase' as const,
            }}
          >
            Rank: {rank.rank} / {rank.total}
          </div>
        </>
      )}
    </div>
  );
}

// --- MAIN SCREEN ---

export default async function YoutubeScreen() {
  const data = await getYouTubeData();

  const rootStyle: React.CSSProperties = {
    width: 800,
    height: 480,
    background: '#fff',
    fontFamily: 'Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: '#000',
  };

  if (!data) {
    return (
      <div style={rootStyle}>
        {/* Header */}
        <div
          style={{
            height: 36,
            borderBottom: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.08em' }}>INKLESS</span>
          <span style={{ fontSize: 11, color: '#aaa' }}>YOUTUBE</span>
        </div>
        {/* Error body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.05em' }}>
            YOUTUBE DATA UNAVAILABLE
          </div>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            Check YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID environment variables.
          </div>
        </div>
        <div style={{ height: 1, background: '#ddd', flexShrink: 0 }} />
      </div>
    );
  }

  const syncLabel =
    data.minutesSinceFetch === 0 ? 'JUST NOW' : `${data.minutesSinceFetch}M AGO`;

  return (
    <div style={rootStyle}>
      {/* Header */}
      <div
        style={{
          height: 36,
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.08em' }}>INKLESS</span>
        <span style={{ fontSize: 11, color: '#aaa' }}>SYNC: {syncLabel}</span>
      </div>

      {/* Columns — 412px tall (36 header + 412 content + 1 footer = 449; remaining 31px below) */}
      <div style={{ height: 412, display: 'flex', flexShrink: 0 }}>

        {/* ── Column 1: Key stats ── */}
        <div
          style={{
            width: 265,
            padding: '18px 12px 16px 25px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <StatBlock
            label="Subscribers"
            value={formatCount(data.channelStats.subscriberCount)}
            valueFontSize={56}
          />
          {data.newSubscribersThisWeek !== null && (
            <StatBlock
              label="New This Week"
              value={
                (data.newSubscribersThisWeek >= 0 ? '+' : '') +
                formatCount(data.newSubscribersThisWeek)
              }
              valueFontSize={56}
            />
          )}
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: '#ddd', flexShrink: 0 }} />

        {/* ── Column 2: Total views + bar chart ── */}
        <div
          style={{
            flex: 1,
            padding: '18px 12px 16px 23px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Total views */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                borderBottom: '1px solid #ddd',
                paddingBottom: 4,
                marginBottom: 8,
                textTransform: 'uppercase' as const,
              }}
            >
              Total Views
            </div>
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>
              {formatCount(data.channelStats.viewCount)}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
              {formatFullCount(data.channelStats.viewCount)} lifetime
            </div>
          </div>

          {/* Bar chart */}
          {data.weeklySnapshots.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  marginBottom: 10,
                  textTransform: 'uppercase' as const,
                }}
              >
                Weekly Subscribers
              </div>
              <BarChart snapshots={data.weeklySnapshots} />
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: '#ddd', flexShrink: 0 }} />

        {/* ── Column 3: Latest video ── */}
        <div
          style={{
            width: 244,
            padding: '18px 20px 16px 12px',
            background: '#f5f5f5',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {data.latestVideo ? (
            <VideoPanel video={data.latestVideo} rank={data.videoRank} />
          ) : (
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>No videos found.</div>
          )}
        </div>
      </div>

      {/* Footer rule at y=448 */}
      <div style={{ height: 1, background: '#ddd', flexShrink: 0 }} />
    </div>
  );
}
