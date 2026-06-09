import { getYouTubeData, type WeeklySnapshot, type VideoData } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

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

// --- MAIN SCREEN ---

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default async function YoutubeScreen() {
  const data = await getYouTubeData();

  const root: React.CSSProperties = {
    width: 800,
    height: 480,
    background: '#fff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: FONT,
  };

  const header = (syncLabel?: string) => (
    <div style={{
      height: 42,
      borderBottom: '2px solid #000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 22px',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Inkless
      </span>
      {syncLabel && (
        <span style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {syncLabel}
        </span>
      )}
    </div>
  );

  if (!data) {
    return (
      <div style={root}>
        {header()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>YOUTUBE DATA UNAVAILABLE</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#777' }}>
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
  const maxDelta = deltas.length > 0 ? Math.max(...deltas.map((d) => d.delta), 1) : 1;
  const currentWeekKey = deltas[deltas.length - 1]?.weekKey;

  const newSubs = data.newSubscribersThisWeek;
  const newSubsDisplay = newSubs !== null
    ? (newSubs >= 0 ? '+' : '') + formatFull(newSubs)
    : '—';

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: 4,
  };

  return (
    <div style={root}>
      {header(syncLabel)}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

        {/* Column 1 — subscriber stats */}
        <div style={{ width: 210, borderRight: '2px solid #aaa', padding: '18px 20px', flexShrink: 0 }}>

          {/* Subscribers */}
          <div style={{ borderBottom: '1.5px solid #ccc', paddingBottom: 16, marginBottom: 16 }}>
            <div style={labelStyle}>Subscribers</div>
            <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1, color: '#000', letterSpacing: '-2px' }}>
              {formatFull(data.channelStats.subscriberCount)}
            </div>
          </div>

          {/* New This Week */}
          <div>
            <div style={labelStyle}>New This Week</div>
            <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1, color: '#000', letterSpacing: '-2px' }}>
              {newSubsDisplay}
            </div>
          </div>

        </div>

        {/* Column 2 — total views + bar chart */}
        <div style={{ flex: 1, borderRight: '2px solid #aaa', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>

          {/* Total Views */}
          <div style={{ borderBottom: '1.5px solid #ccc', paddingBottom: 12, marginBottom: 12 }}>
            <div style={labelStyle}>Total Views</div>
            <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-2px', lineHeight: 1, color: '#000' }}>
              {formatShort(data.channelStats.viewCount)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginTop: 3 }}>
              {formatFull(data.channelStats.viewCount)} lifetime
            </div>
          </div>

          {/* Bar chart */}
          {deltas.length > 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...labelStyle, marginBottom: 12 }}>Weekly New Subs</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                {deltas.map((d) => {
                  const isCurrent = d.weekKey === currentWeekKey;
                  const heightPct = Math.max(6, (d.delta / maxDelta) * 100);
                  const weekNum = d.weekKey.split('-W')[1];
                  return (
                    <div
                      key={d.weekKey}
                      style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#000', marginBottom: 4 }}>
                        {d.delta > 0 ? `+${d.delta}` : d.delta}
                      </div>
                      <div style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        background: isCurrent ? '#000' : '#999',
                        borderRadius: '2px 2px 0 0',
                      }} />
                      <div style={{
                        fontSize: 12,
                        fontWeight: isCurrent ? 900 : 800,
                        color: isCurrent ? '#000' : '#555',
                        marginTop: 5,
                        textTransform: 'uppercase',
                      }}>
                        W{weekNum}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Column 3 — latest video */}
        <div style={{ width: 260, background: '#e8e8e8', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

          {data.latestVideo ? (
            <>
              {/* Row 1 — title */}
              <div style={{ borderBottom: '1.5px solid #ccc', padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                  Latest Upload
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#000', lineHeight: 1.3 }}>
                  {data.latestVideo.title}
                </div>
              </div>

              {/* Row 2 — published */}
              <div style={{ borderBottom: '1.5px solid #ccc', padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                  Published
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#000' }}>
                  {formatPublished(data.latestVideo.publishedAt)}
                </div>
              </div>

              {/* Row 3 — views */}
              <div style={{ borderBottom: '1.5px solid #ccc', padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                  Views
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, color: '#000', lineHeight: 1, letterSpacing: '-1px' }}>
                  {formatFull(data.latestVideo.viewCount)}
                </div>
              </div>

              {/* Row 4 — likes */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                  Likes
                </div>
                <div style={{ fontSize: 34, fontWeight: 900, color: '#000', lineHeight: 1, letterSpacing: '-1px' }}>
                  {formatFull(data.latestVideo.likeCount)}
                </div>
                {data.videoRank && (
                  <div style={{
                    display: 'inline-block',
                    border: '2.5px solid #000',
                    padding: '4px 12px',
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: '#000',
                    marginTop: 8,
                  }}>
                    RANK: {data.videoRank.rank} / {data.videoRank.total}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#777', padding: '18px 16px' }}>
              No videos found.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
