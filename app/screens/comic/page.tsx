import React from 'react';
import Parser from 'rss-parser';

export const revalidate = 3600; // Cache for 1 hour

interface ComicData {
  imageUrl: string;
  caption: string;
}

/**
 * Strips HTML and cleans up the caption text.
 */
function extractCaption(html: string | undefined, title: string | undefined): string {
    if (!html) return '';

    // 1. Remove HTML tags
    let text = html.replace(/<[^>]*>?/gm, '');

    // 2. Decode basic HTML entities
    text = text.replace(/&nbsp;/g, ' ').replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"');
    text = text.trim();

    // 3. Remove "Drawing by..." credit
    if (text.includes("Drawing by")) {
        text = text.split("Drawing by")[0].trim();
    }

    // 4. Remove the Title if it appears at the start
    if (title && text.startsWith(title)) {
        text = text.substring(title.length).trim();
    }

    // 5. Remove generic "Daily Cartoon" prefix
    text = text.replace(/^Daily Cartoon:.*?(–|-|:)\s*/i, '');

    // 6. Cleanup leading/trailing punctuation/whitespace
    text = text.replace(/^(–|-|:)\s+/, '').trim();

    return text;
}

async function getNewYorkerCartoon(): Promise<ComicData | null> {
  try {
    const parser = new Parser({
        customFields: {
          item: ['media:content', 'media:thumbnail', 'content:encoded', 'description'],
        },
    });

    const feed = await parser.parseURL('https://www.newyorker.com/feed/cartoons/daily-cartoon');
    const latest = feed.items[0];

    if (!latest) {
        console.error("[Comic] No items found in feed");
        return null;
    }

    // --- IMAGE EXTRACTION FROM RSS ---
    let imageUrl = '';

    // Strategy 1: Check media:content
    // @ts-ignore
    if (latest['media:content'] && latest['media:content']['$'] && latest['media:content']['$']['url']) {
        // @ts-ignore
        imageUrl = latest['media:content']['$']['url'];
    }

    // Strategy 2: Check media:thumbnail
    // @ts-ignore
    if (!imageUrl && latest['media:thumbnail'] && latest['media:thumbnail']['$'] && latest['media:thumbnail']['$']['url']) {
        // @ts-ignore
        imageUrl = latest['media:thumbnail']['$']['url'];
    }

    // Strategy 3: Check content (HTML Regex)
    if (!imageUrl && latest.content) {
        const match = latest.content.match(/src="([^"]+)"/);
        if (match && match[1]) imageUrl = match[1];
    }

    // Strategy 4: Check description (HTML Regex)
    if (!imageUrl && latest.description) {
        const match = latest.description.match(/src="([^"]+)"/);
        if (match && match[1]) imageUrl = match[1];
    }

    // --- CAPTION EXTRACTION FROM PAGE ---
    let caption = '';

    if (latest.link) {
        try {
            const pageResponse = await fetch(latest.link);
            const pageHtml = await pageResponse.text();

            // Look for caption in various HTML patterns
            const captionPatterns = [
                /<figcaption[^>]*>(.*?)<\/figcaption>/s,
                /<div[^>]*class="[^"]*caption[^"]*"[^>]*>(.*?)<\/div>/s,
                /<p[^>]*class="[^"]*caption[^"]*"[^>]*>(.*?)<\/p>/s,
                /"([^"]{10,200})"/,
            ];

            for (const pattern of captionPatterns) {
                const match = pageHtml.match(pattern);
                if (match && match[1]) {
                    const extracted = extractCaption(match[1], latest.title);
                    if (extracted && extracted.length > 5) {
                        caption = extracted;
                        break;
                    }
                }
            }

            // Fallback: Look for alt text
            if (!caption) {
                const altMatch = pageHtml.match(/<img[^>]+alt="([^"]+)"/);
                if (altMatch && altMatch[1] && altMatch[1] !== 'Cartoon' && altMatch[1].length > 5) {
                    caption = altMatch[1];
                }
            }
        } catch (error) {
            console.error("[Comic] Failed to fetch page for caption:", error);
        }
    }

    // Fallback: Extract from URL slug
    if (!caption && latest.link) {
        const slugMatch = latest.link.match(/daily-cartoon\/[^\/]+\-(.+)$/);
        if (slugMatch && slugMatch[1]) {
            caption = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    // Filter out useless captions
    if (caption === 'The New Yorker' || caption === 'Cartoon' || caption.includes('A drawing that riffs')) {
        caption = '';
    }

    console.log(`[Comic] Image URL: ${imageUrl}`);
    console.log(`[Comic] Caption: "${caption}"`);

    return {
      imageUrl: imageUrl,
      caption: caption
    };
  } catch (error) {
    console.error("[Comic] Failed to fetch:", error);
    return null;
  }
}

export default async function ComicPage() {
  const comic = await getNewYorkerCartoon();

  if (!comic || !comic.imageUrl) {
    return (
      <div className="bg-pure-white h-[480px] w-[800px] flex flex-col items-center justify-center p-8">
        <h1 className="font-chareink text-4xl mb-4 text-charcoal">Comic Unavailable</h1>
        <p className="font-mono text-charcoal">Image not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-pure-white h-[480px] w-[800px] relative overflow-hidden flex flex-col p-6">
      {/* Image Area */}
      <div className="flex-1 relative w-full flex items-center justify-center min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={comic.imageUrl}
            alt="New Yorker Cartoon"
            className="max-h-full max-w-full object-contain filter grayscale contrast-125"
          />
      </div>

      {/* Caption Area */}
      {comic.caption && (
        <div className="mt-4 text-center w-full shrink-0">
          <p className="font-chareink text-xl leading-tight text-charcoal italic">
            {comic.caption}
          </p>
        </div>
      )}
    </div>
  );
}
