import { getJourneyPost } from '@/lib/journey';

export const dynamic = 'force-dynamic';

const IBM_MONO = 'var(--font-ibm-mono), "IBM Plex Mono", ui-monospace, monospace';
const ROBOTO   = 'var(--font-eink-sans), Roboto, ui-sans-serif, sans-serif';

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

  const header = (
    <div
      style={{
        padding: '0 20px',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #ddd',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: IBM_MONO,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1,
          color: '#000',
        }}
      >
        Sophie&rsquo;s Journey
      </span>
    </div>
  );

  if (!post) {
    return (
      <div style={screenStyle}>
        {header}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontFamily: IBM_MONO, fontSize: 18, fontWeight: 700 }}>
            NO POST AVAILABLE
          </div>
          <div style={{ fontFamily: IBM_MONO, fontSize: 13, color: '#777' }}>
            Check that the instaloader script has run.
          </div>
        </div>
      </div>
    );
  }

  const hasMetadata = post.dayNumber !== null || post.location !== null;

  return (
    <div style={screenStyle}>

      {/* ── Header ── */}
      {header}

      {/* ── Metadata row ── */}
      {hasMetadata && (
        <div
          style={{
            padding: '0 20px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #ddd',
            flexShrink: 0,
          }}
        >
          {post.dayNumber !== null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingRight: 16,
                borderRight: '1px solid #ddd',
                height: 40,
                marginRight: 16,
              }}
            >
              <span
                style={{
                  fontFamily: IBM_MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: '#777',
                  lineHeight: 1,
                  marginBottom: 2,
                  textTransform: 'uppercase',
                }}
              >
                DAY
              </span>
              <span
                style={{
                  fontFamily: IBM_MONO,
                  fontSize: 38,
                  fontWeight: 700,
                  color: '#000',
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                {post.dayNumber}
              </span>
            </div>
          )}

          {post.location !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span
                style={{
                  fontFamily: IBM_MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#000',
                  lineHeight: 1.2,
                }}
              >
                {post.location}
              </span>
              {post.kmToday !== null && (
                <span
                  style={{
                    fontFamily: IBM_MONO,
                    fontSize: 11,
                    color: '#777',
                    marginTop: 2,
                  }}
                >
                  Sweden &middot; {post.kmToday} km today
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Body text ── */}
      <div
        style={{
          padding: '18px 20px 0 20px',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {post.paragraphs.map((para, i) => (
          <p
            key={i}
            style={{
              fontFamily: ROBOTO,
              fontSize: 17,
              lineHeight: '21px',
              color: '#000',
              marginBottom: i < post.paragraphs.length - 1 ? 18 : 0,
            }}
          >
            {para}
          </p>
        ))}
      </div>

    </div>
  );
}
