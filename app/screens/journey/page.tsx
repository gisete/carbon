import { getJourneyPost } from '@/lib/journey';

export const dynamic = 'force-dynamic';

const ROBOTO = 'var(--font-eink-sans), Roboto, ui-sans-serif, sans-serif';

const Sep = () => (
  <div style={{ width: 1, height: 26, background: '#bbb', flexShrink: 0 }} />
);

export default async function JourneyScreen() {
  const post = await getJourneyPost();

  const screenStyle: React.CSSProperties = {
    width: 800,
    height: 480,
    background: '#ffffff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    WebkitFontSmoothing: 'none' as never,
  };

  // ── Single header bar ──
  // Segments: Title | DAY N | Location | X km today
  // Omit segments gracefully if data is missing
  const segStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 18px',
    height: '100%',
  };

  const header = (
    <div
      style={{
        height: 52,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #000',
        flexShrink: 0,
        gap: 0,
      }}
    >
      {/* Title */}
      <div style={{ ...segStyle, paddingLeft: 0 }}>
        <span style={{ fontFamily: ROBOTO, fontSize: 18, fontWeight: 900, color: '#000', letterSpacing: '0.5px' }}>
          Sophie&rsquo;s Journey
        </span>
      </div>

      {post && post.dayNumber !== null && (
        <>
          <Sep />
          <div style={segStyle}>
            <span style={{ fontFamily: ROBOTO, fontSize: 13, fontWeight: 700, color: '#555', marginRight: 7, letterSpacing: '1px' }}>
              DAY
            </span>
            <span style={{ fontFamily: ROBOTO, fontSize: 28, fontWeight: 900, color: '#000' }}>
              {post.dayNumber}
            </span>
          </div>
        </>
      )}

      {post && post.location !== null && (
        <>
          <Sep />
          <div style={segStyle}>
            <span style={{ fontFamily: ROBOTO, fontSize: 17, fontWeight: 700, color: '#000' }}>
              {post.location}
            </span>
          </div>
        </>
      )}

      {post && post.kmToday !== null && (
        <>
          <Sep />
          <div style={segStyle}>
            <span style={{ fontFamily: ROBOTO, fontSize: 15, fontWeight: 700, color: '#555' }}>
              {post.kmToday} km today
            </span>
          </div>
        </>
      )}
    </div>
  );

  if (!post) {
    return (
      <div style={screenStyle}>
        {header}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontFamily: ROBOTO, fontSize: 18, fontWeight: 900 }}>
            NO POST AVAILABLE
          </div>
          <div style={{ fontFamily: ROBOTO, fontSize: 13, color: '#777' }}>
            Check that the instaloader script has run.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={screenStyle}>
      {header}

      {/* ── Body text ── */}
      <div style={{ padding: '16px 20px 0 20px', flex: 1, overflow: 'hidden' }}>
        {post.paragraphs.map((para, i) => (
          <p
            key={i}
            style={{
              fontFamily: ROBOTO,
              fontSize: 17,
              lineHeight: '22px',
              color: '#000',
              marginBottom: i < post.paragraphs.length - 1 ? 16 : 0,
            }}
          >
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
