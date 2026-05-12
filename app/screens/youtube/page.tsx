import { getYouTubeData, type WeeklySnapshot, type VideoData } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

// Fonts — variables set on <body> by Next.js font loader in layout.tsx
const NUNITO = 'var(--font-nunito), Nunito, ui-sans-serif, sans-serif';
const ROBOTO  = 'var(--font-eink-sans), Roboto, ui-sans-serif, sans-serif';

// --- HELPERS ---

function formatFull(n: number): string {
  return n.toLocaleString('en-US');
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
}

function formatPublished(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return `${day} ${mon} ${d.getFullYear()}`;
}

// Weekly new-subscriber deltas for the bar chart
function computeDeltas(snapshots: WeeklySnapshot[]): { weekKey: string; delta: number }[] {
  const out: { weekKey: string; delta: number }[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    out.push({
      weekKey: snapshots[i].weekKey,
      delta: snapshots[i].subscriberCount - snapshots[i - 1].subscriberCount,
    });
  }
  return out;
}

// --- SHARED STYLE PIECES ---

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: ROBOTO,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: '#444',
  display: 'block',
  marginBottom: 4,
};

const RULE_STYLE: React.CSSProperties = {
  borderBottom: '1px solid #ddd',
};

// --- STAT BLOCK (col 1 + col 2 total views) ---

type StatSize = 'xl' | 'lg' | 'md';

const VALUE_FONT: Record<StatSize, React.CSSProperties> = {
  xl: { fontFamily: NUNITO, fontSize: 56, fontWeight: 900, letterSpacing: -1, lineHeight: 1 },
  lg: { fontFamily: NUNITO, fontSize: 52, fontWeight: 900, letterSpacing: -1, lineHeight: 1 },
  md: { fontFamily: NUNITO, fontSize: 40, fontWeight: 800, letterSpacing: -1, lineHeight: 1 },
};

function StatBlock({
  label,
  value,
  size,
  unit,
  sub,
  last = false,
}: {
  label: string;
  value: string;
  size: StatSize;
  unit?: string;
  sub?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: '10px 0 8px',
        ...(last ? {} : RULE_STYLE),
      }}
    >
      <span style={LABEL_STYLE}>{label}</span>
      <span style={{ ...VALUE_FONT[size], display: 'block' }}>
        {value}
        {unit && (
          <span style={{ fontFamily: NUNITO, fontSize: 13, color: '#777' }}> {unit}</span>
        )}
      </span>
      {sub && (
        <span style={{ fontFamily: ROBOTO, fontSize: 11, color: '#777', display: 'block', marginTop: 3 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// --- BAR CHART (CSS flexbox, no SVG) ---

function BarChart({ deltas }: { deltas: { weekKey: string; delta: number }[] }) {
  if (deltas.length === 0) return null;

  const maxDelta = Math.max(...deltas.map((d) => d.delta), 1);
  const currentWeekKey = deltas[deltas.length - 1]?.weekKey;

  return (
    <div
      style={{
        paddingTop: 10,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={LABEL_STYLE}>Weekly New Subs</div>

      {/* Bars container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          height: 100,
          flex: 1,
        }}
      >
        {deltas.map((d) => {
          const isCurrent = d.weekKey === currentWeekKey;
          const heightPct = Math.max(4, (d.delta / maxDelta) * 100);
          const weekNum = d.weekKey.split('-W')[1];

          return (
            <div
              key={d.weekKey}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <span
                style={{
                  fontFamily: ROBOTO,
                  fontSize: 9,
                  color: '#777',
                  marginBottom: 3,
                  lineHeight: 1,
                }}
              >
                {d.delta > 0 ? `+${d.delta}` : d.delta}
              </span>
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  background: isCurrent ? '#000' : '#ccc',
                }}
              />
              <span
                style={{
                  fontFamily: ROBOTO,
                  fontSize: 9,
                  color: isCurrent ? '#000' : '#777',
                  fontWeight: isCurrent ? 700 : 400,
                  marginTop: 4,
                  lineHeight: 1,
                }}
              >
                W{weekNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
  const videoStatStyle: React.CSSProperties = {
    padding: '8px 0',
    borderBottom: '1px solid #ccc',
  };

  return (
    <>
      <span
        style={{
          ...LABEL_STYLE,
          padding: '10px 0 6px',
          borderBottom: '1px solid #ccc',
          marginBottom: 0,
        }}
      >
        Latest Upload
      </span>

      <div
        style={{
          fontFamily: NUNITO,
          fontSize: 15,
          fontWeight: 800,
          color: '#000',
          lineHeight: 1.35,
          padding: '10px 0 8px',
          borderBottom: '1px solid #ccc',
        }}
      >
        {video.title}
      </div>

      <div style={videoStatStyle}>
        <span style={LABEL_STYLE}>Published</span>
        <span style={{ fontFamily: ROBOTO, fontSize: 13, fontWeight: 700, color: '#000' }}>
          {formatPublished(video.publishedAt)}
        </span>
      </div>

      <div style={videoStatStyle}>
        <span style={LABEL_STYLE}>Views</span>
        <span style={{ fontFamily: NUNITO, fontSize: 40, fontWeight: 900, color: '#000', lineHeight: 1, letterSpacing: -1 }}>
          {formatFull(video.viewCount)}
        </span>
      </div>

      <div style={{ padding: '8px 0', ...(rank ? { borderBottom: '1px solid #ccc' } : {}) }}>
        <span style={LABEL_STYLE}>Likes</span>
        <span style={{ fontFamily: NUNITO, fontSize: 40, fontWeight: 900, color: '#000', lineHeight: 1, letterSpacing: -1 }}>
          {formatFull(video.likeCount)}
        </span>
      </div>

      {rank && (
        <div>
          <span
            style={{
              display: 'inline-block',
              border: '1.5px solid #000',
              padding: '4px 10px',
              fontFamily: ROBOTO,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '1px',
              color: '#000',
              marginTop: 10,
            }}
          >
            RANK: {rank.rank} / {rank.total}
          </span>
        </div>
      )}
    </>
  );
}

// --- MAIN SCREEN ---

export default async function YoutubeScreen() {
  const data = await getYouTubeData();

  const rootStyle: React.CSSProperties = {
    width: 800,
    height: 480,
    background: '#ffffff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    WebkitFontSmoothing: 'none' as never,
  };

  const headerRow = (syncLabel: string) => (
    <div
      style={{
        height: 40,
        padding: '0 25px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #ddd',
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: NUNITO, fontSize: 16, fontWeight: 900, letterSpacing: '1px', color: '#000' }}>
        INKLESS
      </span>
      <span style={{ fontFamily: ROBOTO, fontSize: 11, color: '#777' }}>
        {syncLabel}
      </span>
    </div>
  );

  if (!data) {
    return (
      <div style={rootStyle}>
        {headerRow('YOUTUBE')}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: NUNITO, fontSize: 18, fontWeight: 900 }}>YOUTUBE DATA UNAVAILABLE</div>
          <div style={{ fontFamily: ROBOTO, fontSize: 11, color: '#777' }}>
            Check YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID environment variables.
          </div>
        </div>
      </div>
    );
  }

  const syncLabel = data.minutesSinceFetch === 0
    ? 'SYNC: JUST NOW'
    : `SYNC: ${data.minutesSinceFetch}M AGO`;

  const deltas = computeDeltas(data.weeklySnapshots);

  return (
    <div style={rootStyle}>
      {headerRow(syncLabel)}

      {/* ── Three columns ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Col 1: subscriber stats ── */}
        <div
          style={{
            width: 243,
            padding: '0 25px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderRight: '1px solid #ddd',
          }}
        >
          <StatBlock label="Subscribers"   value={formatFull(data.channelStats.subscriberCount)} size="xl" />
          {data.newSubscribersThisWeek !== null && (
            <StatBlock
              label="New This Week"
              value={(data.newSubscribersThisWeek >= 0 ? '+' : '') + formatFull(data.newSubscribersThisWeek)}
              size="xl"
            />
          )}
          {/* Analytics-only fields — omit gracefully when unavailable */}
          {/* Views (28D) and Watch Time would appear here with size="md" when available */}
        </div>

        {/* ── Col 2: total views + bar chart ── */}
        <div
          style={{
            width: 278,
            padding: '0 22px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderRight: '1px solid #ddd',
          }}
        >
          <StatBlock
            label="Total Views"
            value={formatShort(data.channelStats.viewCount)}
            size="lg"
            sub={`${formatFull(data.channelStats.viewCount)} lifetime`}
          />
          {deltas.length > 0 && <BarChart deltas={deltas} />}
        </div>

        {/* ── Col 3: latest video ── */}
        <div
          style={{
            flex: 1,
            background: '#e8e8e8',
            padding: '0 14px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {data.latestVideo ? (
            <VideoPanel video={data.latestVideo} rank={data.videoRank} />
          ) : (
            <div style={{ fontFamily: ROBOTO, fontSize: 11, color: '#777', marginTop: 14 }}>
              No videos found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
