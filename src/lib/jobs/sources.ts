export type Platform = "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters";
export type CompanySource = { platform: Platform; slug: string; name: string };

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  source: string;
};

const gh = "airbnb stripe figma discord dropbox coinbase robinhood reddit pinterest gitlab cloudflare databricks instacart lyft twitch asana duolingo airtable brex gusto okta datadog mongodb elastic samsara affirm squarespace zscaler".split(" ");
const lv = "palantir spotify binance kraken whoop zoox".split(" ");
const ab = "notion ramp linear openai vercel supabase deel posthog replit cursor elevenlabs perplexity".split(" ");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DEFAULT_COMPANIES: CompanySource[] = [
  ...gh.map((slug) => ({ platform: "greenhouse" as const, slug, name: cap(slug) })),
  ...lv.map((slug) => ({ platform: "lever" as const, slug, name: cap(slug) })),
  ...ab.map((slug) => ({ platform: "ashby" as const, slug, name: cap(slug) })),
];

/** Detect the hiring platform and company id from a career page link. */
export function parseCareerUrl(raw: string): CompanySource | null {
  let u: URL;
  try {
    u = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean);
  const qFor = u.searchParams.get("for");
  let platform: Platform | null = null;
  let slug: string | undefined;
  if (host.includes("greenhouse.io")) {
    platform = "greenhouse";
    slug = qFor ?? (seg[0] === "embed" ? undefined : seg[0]);
  } else if (host.includes("lever.co")) {
    platform = "lever";
    slug = seg[0];
  } else if (host.includes("ashbyhq.com")) {
    platform = "ashby";
    slug = seg[0];
  } else if (host.includes("workable.com")) {
    platform = "workable";
    slug = host.startsWith("apply.") ? seg[0] : host.split(".")[0];
  } else if (host.includes("smartrecruiters.com")) {
    platform = "smartrecruiters";
    slug = seg[0];
  }
  if (!platform || !slug) return null;
  return { platform, slug, name: cap(slug) };
}

export const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
