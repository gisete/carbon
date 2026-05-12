import { getJourneyPost, wordWrap } from '@/lib/journey';

export const dynamic = 'force-dynamic';

// Body layout constants
const FONT_SIZE = 17;
const LINE_HEIGHT = 21;
const PARA_GAP = 28;
const BODY_TOP = 100;
const BODY_BOTTOM = 460;
const MAX_CHARS_PER_LINE = 72; // ~760px at 17px Roboto

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
          fontFamily: 'Roboto, sans-serif',
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
      <div
        style={{
          width: 800,
          height: 480,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Roboto, sans-serif',
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
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>
            NO POST AVAILABLE
          </div>
          <div style={{ fontSize: 13, color: '#777' }}>
            Check that the instaloader script has run.
          </div>
        </div>
      </div>
    );
  }

  const hasMetadata = post.dayNumber !== null || post.location !== null;

  // Pre-wrap body paragraphs and truncate to fit
  type RenderedLine = { text: string; isFirstOfPara: boolean };
  const renderedLines: RenderedLine[] = [];
  let currentY = BODY_TOP;
  let overflowed = false;

  for (let pi = 0; pi < post.paragraphs.length && !overflowed; pi++) {
    const isFirst = pi === 0;
    const paraTopY = isFirst ? currentY : currentY + PARA_GAP;

    const lines = wordWrap(post.paragraphs[pi], MAX_CHARS_PER_LINE);

    for (let li = 0; li < lines.length && !overflowed; li++) {
      const lineY = (li === 0 ? paraTopY : currentY) + LINE_HEIGHT;
      if (lineY > BODY_BOTTOM) {
        overflowed = true;
        break;
      }
      renderedLines.push({ text: lines[li], isFirstOfPara: li === 0 && !isFirst });
      currentY = lineY;
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
        fontFamily: 'Roboto, sans-serif',
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
            padding: '0 0',
          }}
        >
          {/* Day number block */}
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
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 3,
                    color: '#777',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  DAY
                </span>
                <span style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>
                  {post.dayNumber}
                </span>
              </div>
              {/* Vertical divider */}
              <div
                style={{
                  width: 1,
                  background: '#ddd',
                  margin: '8px 0',
                  flexShrink: 0,
                }}
              />
            </>
          )}

          {/* Location block */}
          {post.location !== null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingLeft: 14,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, marginBottom: 5 }}>
                {post.location}
              </span>
              {post.kmToday !== null && (
                <span style={{ fontSize: 11, color: '#777', lineHeight: 1 }}>
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
          padding: '0 20px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {(() => {
          const els: React.ReactNode[] = [];
          let yOffset = 8; // small top padding within body area

          for (let i = 0; i < renderedLines.length; i++) {
            const line = renderedLines[i];
            if (line.isFirstOfPara) {
              yOffset += PARA_GAP;
            }
            els.push(
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: yOffset,
                  left: 20,
                  right: 20,
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
            yOffset += LINE_HEIGHT;
          }

          return els;
        })()}
      </div>
    </div>
  );
}
