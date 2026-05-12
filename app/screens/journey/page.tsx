import { getJourneyPost, wordWrap } from '@/lib/journey';

export const dynamic = 'force-dynamic';

const MONO = 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace';
const BODY_FONT = 'Roboto, ui-sans-serif, sans-serif';

// Body layout constants
const FONT_SIZE = 17;
const LINE_HEIGHT = 22;
const PARA_GAP = 26;
const BODY_BOTTOM = 456;
const MAX_CHARS_PER_LINE = 72;

// --- MAIN SCREEN ---

export default async function JourneyScreen() {
  const post = await getJourneyPost();

  const header = (
    <div
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #ddd',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#000',
        }}
      >
        Sophie&rsquo;s Journey
      </span>
    </div>
  );

  if (!post) {
    return (
      <div
        style={{
          width: 800,
          height: 480,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
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
          <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>
            NO POST AVAILABLE
          </div>
          <div style={{ fontFamily: MONO, fontSize: 13, color: '#777' }}>
            Check that the instaloader script has run.
          </div>
        </div>
      </div>
    );
  }

  const hasMetadata = post.dayNumber !== null || post.location !== null;

  // Pre-wrap body paragraphs and truncate to fit the screen
  type RenderedLine = { text: string; isFirstOfPara: boolean };
  const renderedLines: RenderedLine[] = [];
  // BODY_TOP is dynamic: 40 (header) + (hasMetadata ? 54 : 0) (metadata) + 12 (top padding)
  const metaHeight = hasMetadata ? 54 : 0;
  const bodyTopOffset = 40 + metaHeight + 12; // px from top of screen
  let yOffset = 0;
  let overflowed = false;

  for (let pi = 0; pi < post.paragraphs.length && !overflowed; pi++) {
    if (pi > 0) yOffset += PARA_GAP;
    const lines = wordWrap(post.paragraphs[pi], MAX_CHARS_PER_LINE);
    for (let li = 0; li < lines.length && !overflowed; li++) {
      const absY = bodyTopOffset + yOffset + LINE_HEIGHT;
      if (absY > BODY_BOTTOM) { overflowed = true; break; }
      renderedLines.push({ text: lines[li], isFirstOfPara: li === 0 && pi > 0 });
      yOffset += LINE_HEIGHT;
    }
  }

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
      {/* ── Header ── */}
      {header}

      {/* ── Metadata row ── */}
      {hasMetadata && (
        <div
          style={{
            height: 54,
            borderBottom: '1px solid #ddd',
            display: 'flex',
            alignItems: 'stretch',
            flexShrink: 0,
          }}
        >
          {post.dayNumber !== null && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingLeft: 20,
                  paddingRight: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.3em',
                    color: '#777',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    marginBottom: 5,
                  }}
                >
                  DAY
                </span>
                <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                  {post.dayNumber}
                </span>
              </div>
              <div style={{ width: 1, background: '#ddd', margin: '10px 0', flexShrink: 0 }} />
            </>
          )}

          {post.location !== null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingLeft: 16,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {post.location}
              </span>
              {post.kmToday !== null && (
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#777', lineHeight: 1 }}>
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
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {(() => {
          const els: React.ReactNode[] = [];
          let y = 12;

          for (let i = 0; i < renderedLines.length; i++) {
            const line = renderedLines[i];
            if (line.isFirstOfPara) y += PARA_GAP;
            els.push(
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: y,
                  left: 20,
                  right: 20,
                  fontFamily: BODY_FONT,
                  fontSize: FONT_SIZE,
                  lineHeight: `${LINE_HEIGHT}px`,
                  color: '#000',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {line.text}
              </div>
            );
            y += LINE_HEIGHT;
          }

          return els;
        })()}
      </div>
    </div>
  );
}
