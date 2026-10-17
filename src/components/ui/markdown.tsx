import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { safeHref } from "@/lib/cms/schema";

/**
 * Minimal, safe markdown for CMS copy: ## and ### headings, paragraphs, "-" and "1." lists,
 * **bold**, *italic* and [links](/path). Output is React elements only — raw HTML is never
 * rendered, and links are limited to site paths, http(s), mailto and tel.
 */
export function Markdown({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text?.trim()) return null;
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const h = /^(#{2,3})\s+(.*)$/.exec(lines[0]);
        if (h && lines.length === 1) {
          const Tag = h[1].length === 2 ? "h2" : "h3";
          return <Tag key={i}>{inline(h[2])}</Tag>;
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={i} className="list-decimal pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** **bold**, *italic* and [label](href). */
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++}>{inline(m[1])}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k++}>{inline(m[2])}</em>);
    else {
      const href = safeHref(m[4]);
      if (!href) out.push(m[3]);
      else if (href.startsWith("/") && !href.startsWith("//")) out.push(<Link key={k++} href={href}>{m[3]}</Link>);
      else
        out.push(
          <a key={k++} href={href} {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {m[3]}
          </a>,
        );
    }
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
