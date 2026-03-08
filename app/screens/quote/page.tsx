import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface Quote {
  text: string;
  author: string;
}

function getQuoteFontSize(text: string): string {
  const len = text.length;
  if (len < 80)  return "text-5xl";
  if (len < 140) return "text-4xl";
  if (len < 220) return "text-3xl";
  return "text-2xl";
}

export default async function QuoteScreen() {
  const quotesPath = path.join(process.cwd(), "data", "quotes.json");
  const quotesRaw = await fs.readFile(quotesPath, "utf-8");
  const quotes: Quote[] = JSON.parse(quotesRaw);

  const now = new Date();
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  const quote = quotes[dayOfYear % quotes.length];

  return (
    <div className="w-[800px] h-[480px] bg-white relative overflow-hidden flex items-center justify-center">
      {/* Corner brackets */}
      <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-black" />
      <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-black" />
      <div className="absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 border-black" />
      <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-black" />

      {/* Content block */}
      <div className="flex flex-col items-center w-[560px]">
        {/* Quote text */}
        <p
          className={`font-eink-serif italic text-center text-black leading-snug ${getQuoteFontSize(quote.text)}`}
        >
          &ldquo;{quote.text}&rdquo;
        </p>

        {/* Divider with diamond */}
        <div className="relative w-full flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black" />
          </div>
          <span className="relative bg-white px-3 text-black text-sm leading-none select-none">
            ◆
          </span>
        </div>

        {/* Author */}
        <p
          className="font-mono uppercase text-center text-black"
          style={{ fontSize: "13px", letterSpacing: "0.3em" }}
        >
          {quote.author}
        </p>
      </div>
    </div>
  );
}
