import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import * as cheerio from "cheerio";

const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 15_000;

const genericSiteNames = new Set([
  "linkedin",
  "seek",
  "indeed",
  "glassdoor",
  "greenhouse",
  "lever",
  "workday",
  "summer of tech",
  "trade me jobs",
]);

const categoryRules: Array<{ category: string; keywords: string[] }> = [
  { category: "ML / AI Engineer", keywords: ["machine learning", "ml engineer", "ai engineer", "artificial intelligence", "llm", "generative ai", "computer vision", "nlp"] },
  { category: "Data AI", keywords: ["data & ai", "data and ai", "ai developer", "ai intern"] },
  { category: "Data Engineer", keywords: ["data engineer", "data pipeline", "etl", "data warehouse", "snowflake", "databricks"] },
  { category: "Data Analyst", keywords: ["data analyst", "business intelligence", "power bi", "tableau", "analytics intern"] },
  { category: "Full-stack", keywords: ["full stack", "full-stack", "fullstack"] },
  { category: "Mobile", keywords: ["mobile developer", "ios", "android", "swift", "kotlin", "react native", "flutter"] },
  { category: "Frontend", keywords: ["frontend", "front-end", "react", "vue", "angular", "ui engineer"] },
  { category: "Backend", keywords: ["backend", "back-end", "api developer", "server-side"] },
  { category: "DevOps", keywords: ["devops", "site reliability", "sre", "platform engineer", "ci/cd"] },
  { category: "Cloud Engineer", keywords: ["cloud engineer", "cloud infrastructure", "aws engineer", "azure engineer"] },
  { category: "Cybersecurity", keywords: ["cybersecurity", "cyber security", "security engineer", "soc analyst", "penetration test"] },
  { category: "QA / Testing", keywords: ["quality assurance", "qa engineer", "test engineer", "software tester", "test automation"] },
  { category: "Product / Project", keywords: ["product manager", "product owner", "project manager", "project coordinator", "scrum master"] },
  { category: "Business Analyst", keywords: ["business analyst", "systems analyst"] },
  { category: "Service Desk", keywords: ["service desk", "help desk", "helpdesk"] },
  { category: "IT Support", keywords: ["it support", "desktop support", "support technician"] },
  { category: "Technical Support", keywords: ["technical support", "support engineer", "application support"] },
  { category: "Software Engineer", keywords: ["software engineer", "software developer", "developer", "programmer", "engineering intern"] },
];

export class JobImportError extends Error {
  constructor(
    message: string,
    public readonly status = 422,
  ) {
    super(message);
    this.name = "JobImportError";
  }
}

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));

  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

async function validatePublicUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new JobImportError("Enter a valid job URL, including https://.", 400);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new JobImportError("Only http and https job URLs are supported.", 400);
  }
  if (url.username || url.password) {
    throw new JobImportError("URLs containing embedded usernames or passwords are not supported.", 400);
  }
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new JobImportError("Only standard web ports are supported.", 400);
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    throw new JobImportError("Private or local network URLs cannot be imported.", 400);
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new JobImportError("Private or local network URLs cannot be imported.", 400);
    }
  } else {
    let addresses;
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new JobImportError("The job website hostname could not be resolved.");
    }
    if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
      throw new JobImportError("Private or local network URLs cannot be imported.", 400);
    }
  }

  return url;
}

async function readLimitedHtml(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_HTML_BYTES) {
    throw new JobImportError("The job page is too large to import.", 413);
  }
  if (!response.body) throw new JobImportError("The job website returned an empty page.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new JobImportError("The job page is too large to import.", 413);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(bytes);
}

async function fetchJobPage(rawUrl: string) {
  let currentUrl = await validatePublicUrl(rawUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; JobTrackImporter/1.0; +https://jobtrack-fullstack-ashy.vercel.app/)",
        },
      });
    } catch {
      throw new JobImportError("The job website did not respond in time or blocked the request.");
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new JobImportError("The job website returned an invalid redirect.");
      currentUrl = await validatePublicUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new JobImportError(
        response.status === 401 || response.status === 403
          ? "This job page requires a login or blocks automated access. Paste the job description manually."
          : `The job website returned HTTP ${response.status}.`,
      );
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new JobImportError("The URL did not return an HTML job page.");
    }

    return { html: await readLimitedHtml(response), finalUrl: currentUrl.toString() };
  }

  throw new JobImportError("The job website redirected too many times.");
}

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToText(value: string) {
  const fragment = cheerio.load(`<main>${value}</main>`);
  fragment("br").replaceWith("\n");
  fragment("li").each((_, element) => {
    fragment(element).prepend("• ").append("\n");
  });
  fragment("p,div,section,article,h1,h2,h3,h4,h5,h6").each((_, element) => {
    fragment(element).append("\n");
  });
  fragment("script,style,noscript,svg,form,button,nav,header,footer,aside").remove();
  return normalizeText(fragment("main").text());
}

function valuesFromJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(valuesFromJsonLd);
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  return [item, ...valuesFromJsonLd(item["@graph"] || [])];
}

function findJobPosting($: cheerio.CheerioAPI) {
  const items: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      items.push(...valuesFromJsonLd(JSON.parse($(element).text())));
    } catch {
      // Many sites include optional malformed analytics JSON-LD. Ignore only that block.
    }
  });

  return items.find((item) => {
    const type = item["@type"];
    return Array.isArray(type) ? type.includes("JobPosting") : type === "JobPosting";
  });
}

function firstText($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = normalizeText($(selector).first().text());
    if (value) return value;
  }
  return "";
}

function metaContent($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = normalizeText($(selector).first().attr("content") || "");
    if (value) return value;
  }
  return "";
}

function cleanTitle(value: string) {
  return normalizeText(value)
    .replace(/\s+\|\s+(LinkedIn|SEEK|Indeed|Glassdoor|Greenhouse|Lever).*$/i, "")
    .replace(/\s+-\s+(SEEK|Indeed|Glassdoor|LinkedIn)$/i, "")
    .replace(/\s+job\s+in\s+.+$/i, "")
    .slice(0, 160);
}

function organizationName(value: unknown) {
  if (typeof value === "string") return normalizeText(value);
  if (value && typeof value === "object") {
    const name = (value as Record<string, unknown>).name;
    if (typeof name === "string") return normalizeText(name);
  }
  return "";
}

function extractDescription($: cheerio.CheerioAPI, structuredDescription: unknown) {
  const candidates: string[] = [];
  if (typeof structuredDescription === "string") {
    const structuredText = htmlToText(structuredDescription);
    if (structuredText.length >= 100) return structuredText.slice(0, 20_000);
    if (structuredText) candidates.push(structuredText);
  }

  const selectors = [
    '[data-automation="jobDescription"]',
    ".show-more-less-html__markup",
    ".description__text .show-more-less-html__markup",
    '[data-testid*="description" i]',
    "#job-description",
    ".job-description",
    '[class*="jobDescription"]',
    '[class*="job-description"]',
    '[id*="jobDescription"]',
    '[itemprop="description"]',
    "main article",
    "article",
    "main",
  ];

  for (const selector of selectors) {
    const selectorCandidates: string[] = [];
    $(selector).each((_, element) => {
      const clone = $(element).clone();
      clone.find("script,style,noscript,svg,form,button,nav,header,footer,aside").remove();
      const text = htmlToText(clone.html() || clone.text());
      if (text.length >= 200) selectorCandidates.push(text);
    });
    const bestForSelector = selectorCandidates.sort((a, b) => b.length - a.length)[0];
    if (bestForSelector) return bestForSelector.slice(0, 20_000);
  }

  return candidates.sort((a, b) => b.length - a.length)[0]?.slice(0, 20_000) || "";
}

export function classifyJob(title: string, description: string) {
  const normalizedTitle = title.toLowerCase();
  const normalizedDescription = description.toLowerCase();
  let best = { category: "Other", score: 0 };

  for (const rule of categoryRules) {
    const score = rule.keywords.reduce((total, keyword) => {
      const titleMatch = normalizedTitle.includes(keyword) ? 4 : 0;
      const descriptionMatch = normalizedDescription.includes(keyword) ? 1 : 0;
      return total + titleMatch + descriptionMatch;
    }, 0);
    if (score > best.score) best = { category: rule.category, score };
  }

  return best.category;
}

export function extractJobDetails(html: string, finalUrl: string) {
  const $ = cheerio.load(html);
  const jobPosting = findJobPosting($);
  const hostname = new URL(finalUrl).hostname.toLowerCase();
  const source = hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")
    ? "LinkedIn"
    : hostname === "seek.co.nz" || hostname.endsWith(".seek.co.nz")
      ? "SEEK"
      : "Company Website";

  const title = cleanTitle(
    (typeof jobPosting?.title === "string" && jobPosting.title) ||
      firstText($, ["h1", '[data-testid*="title" i]', '[class*="job-title"]']) ||
      metaContent($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      $("title").text(),
  );

  let company = organizationName(jobPosting?.hiringOrganization) ||
    firstText($, [
      '[data-automation="advertiser-name"]',
      "a.topcard__org-name-link",
      ".topcard__flavor a",
      ".top-card-layout__second-subline a",
      '[data-testid*="company" i]',
      '[itemprop="hiringOrganization"]',
      '[class*="companyName"]',
      '[class*="company-name"]',
    ]);
  if (!company) {
    const siteName = metaContent($, ['meta[property="og:site_name"]']);
    if (siteName && !genericSiteNames.has(siteName.toLowerCase())) company = siteName;
  }

  const jobDescription = extractDescription($, jobPosting?.description);
  if (!title && !jobDescription) {
    throw new JobImportError("No job details were found. The page may render with JavaScript or require a login.");
  }

  return {
    title,
    company: company.slice(0, 120),
    jobDescription,
    category: classifyJob(title, jobDescription),
    finalUrl,
    source,
  };
}

export async function importJobFromUrl(rawUrl: string) {
  const { html, finalUrl } = await fetchJobPage(rawUrl);
  return extractJobDetails(html, finalUrl);
}
