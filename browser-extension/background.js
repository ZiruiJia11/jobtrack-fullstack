const JOBTRACK_HOSTS = new Set([
  "jobtrack-fullstack-ashy.vercel.app",
  "jobtrack-fullstack.vercel.app",
  "localhost",
  "127.0.0.1",
]);

function isAllowedSender(sender) {
  try {
    return JOBTRACK_HOSTS.has(new URL(sender.tab?.url || sender.url || "").hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isAllowedJobUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "seek.co.nz" ||
      host.endsWith(".seek.co.nz") ||
      host === "seek.com" ||
      host.endsWith(".seek.com") ||
      host === "linkedin.com" ||
      host.endsWith(".linkedin.com")
    );
  } catch {
    return false;
  }
}

function classifyJob(title, description) {
  const textTitle = title.toLowerCase();
  const textDescription = description.toLowerCase();
  const rules = [
    ["ML / AI Engineer", ["machine learning", "ml engineer", "ai engineer", "artificial intelligence", "llm", "generative ai", "computer vision", "nlp"]],
    ["Data AI", ["data & ai", "data and ai", "ai developer", "ai intern"]],
    ["Data Engineer", ["data engineer", "data pipeline", "etl", "data warehouse", "snowflake", "databricks"]],
    ["Data Analyst", ["data analyst", "business intelligence", "power bi", "tableau", "analytics intern"]],
    ["Full-stack", ["full stack", "full-stack", "fullstack"]],
    ["Mobile", ["mobile developer", "ios", "android", "swift", "kotlin", "react native", "flutter"]],
    ["Frontend", ["frontend", "front-end", "react", "vue", "angular", "ui engineer"]],
    ["Backend", ["backend", "back-end", "api developer", "server-side"]],
    ["DevOps", ["devops", "site reliability", "sre", "platform engineer", "ci/cd"]],
    ["Cloud Engineer", ["cloud engineer", "cloud infrastructure", "aws engineer", "azure engineer"]],
    ["Cybersecurity", ["cybersecurity", "cyber security", "security engineer", "soc analyst", "penetration test"]],
    ["QA / Testing", ["quality assurance", "qa engineer", "test engineer", "software tester", "test automation"]],
    ["Product / Project", ["product manager", "product owner", "project manager", "project coordinator", "scrum master"]],
    ["Business Analyst", ["business analyst", "systems analyst"]],
    ["Service Desk", ["service desk", "help desk", "helpdesk"]],
    ["IT Support", ["it support", "desktop support", "support technician"]],
    ["Technical Support", ["technical support", "support engineer", "application support"]],
    ["Software Engineer", ["software engineer", "software developer", "developer", "programmer", "engineering intern"]],
  ];

  let bestCategory = "Other";
  let bestScore = 0;
  for (const [category, keywords] of rules) {
    const score = keywords.reduce(
      (total, keyword) => total + (textTitle.includes(keyword) ? 4 : 0) + (textDescription.includes(keyword) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }
  return bestCategory;
}

function waitForTabComplete(tabId, timeoutMs = 25_000) {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("The job page took too long to load."));
    }, timeoutMs);

    const finish = () => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") finish();
    };

    chrome.tabs.onUpdated.addListener(listener);
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete") finish();
    } catch (error) {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      reject(error);
    }
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function extractJobPage() {
  const normalize = (value = "") =>
    String(value)
      .replace(/\r/g, "")
      .replace(/[\t ]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const firstText = (selectors) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = normalize(element?.innerText || element?.textContent || "");
      if (value) return value;
    }
    return "";
  };

  const flattenStructuredData = (value) => {
    if (Array.isArray(value)) return value.flatMap(flattenStructuredData);
    if (!value || typeof value !== "object") return [];
    return [value, ...flattenStructuredData(value["@graph"] || [])];
  };

  const structuredItems = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((element) => {
    try {
      structuredItems.push(...flattenStructuredData(JSON.parse(element.textContent || "")));
    } catch {
      // Ignore malformed optional metadata blocks.
    }
  });

  const jobPosting = structuredItems.find((item) => {
    const type = item["@type"];
    return Array.isArray(type) ? type.includes("JobPosting") : type === "JobPosting";
  });

  const organizationName = (organization) => {
    if (typeof organization === "string") return normalize(organization);
    return organization && typeof organization.name === "string" ? normalize(organization.name) : "";
  };

  const structuredDescription = (() => {
    if (typeof jobPosting?.description !== "string") return "";
    const holder = document.createElement("div");
    holder.innerHTML = jobPosting.description;
    return normalize(holder.innerText || holder.textContent || "");
  })();

  const hostname = location.hostname.toLowerCase();
  const isLinkedIn = hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
  const isSeek =
    hostname === "seek.co.nz" ||
    hostname.endsWith(".seek.co.nz") ||
    hostname === "seek.com" ||
    hostname.endsWith(".seek.com");

  const title = normalize(
    (typeof jobPosting?.title === "string" && jobPosting.title) ||
      firstText(
        isLinkedIn
          ? ["h1.top-card-layout__title", ".job-details-jobs-unified-top-card__job-title h1", ".job-details-jobs-unified-top-card__job-title", "h1"]
          : ['[data-automation="job-detail-title"]', '[data-automation="job-detail-title"] h1', "h1"],
      ),
  )
    .replace(/\s+\|\s+(LinkedIn|SEEK).*$/i, "")
    .replace(/\s+-\s+(LinkedIn|SEEK)$/i, "")
    .slice(0, 160);

  const company = normalize(
    organizationName(jobPosting?.hiringOrganization) ||
      firstText(
        isLinkedIn
          ? [
              ".job-details-jobs-unified-top-card__company-name",
              ".job-details-jobs-unified-top-card__primary-description-container a",
              "a.topcard__org-name-link",
              ".topcard__flavor a",
            ]
          : [
              '[data-automation="advertiser-name"]',
              '[data-automation="job-detail-company"]',
              '[data-automation="job-detail-company"] a',
            ],
      ),
  ).slice(0, 120);

  const jobDescription = normalize(
    (structuredDescription.length >= 100 && structuredDescription) ||
      firstText(
        isLinkedIn
          ? [
              ".jobs-description__content",
              ".jobs-description-content__text",
              ".show-more-less-html__markup",
              "article.jobs-description__container",
            ]
          : [
              '[data-automation="jobAdDetails"]',
              '[data-automation="jobDescription"]',
              '[data-automation="job-detail-description"]',
            ],
      ),
  ).slice(0, 20_000);

  return {
    title,
    company,
    jobDescription,
    finalUrl: document.querySelector('link[rel="canonical"]')?.href || location.href,
    source: isLinkedIn ? "LinkedIn" : isSeek ? "SEEK" : "Unknown",
  };
}

async function extractFromTab(tabId) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractJobPage,
    });
    if (result?.title && result.jobDescription?.length >= 200) return result;
    await delay(1_000);
  }
  throw new Error("The logged-in page did not expose a complete job description. Open the role normally and confirm it is still available.");
}

async function importJob(rawUrl) {
  if (!isAllowedJobUrl(rawUrl)) throw new Error("The browser helper only supports SEEK and LinkedIn HTTPS job URLs.");

  let tabId;
  try {
    const tab = await chrome.tabs.create({ url: rawUrl, active: false });
    if (!tab.id) throw new Error("Chrome could not open the job page.");
    tabId = tab.id;
    await waitForTabComplete(tabId);

    const loadedTab = await chrome.tabs.get(tabId);
    if (!loadedTab.url || !isAllowedJobUrl(loadedTab.url)) {
      throw new Error("The job site redirected to a login or unsupported page. Sign in to the site in Chrome and retry.");
    }

    await delay(1_200);
    const job = await extractFromTab(tabId);
    return { ...job, category: classifyJob(job.title, job.jobDescription) };
  } finally {
    if (tabId) await chrome.tabs.remove(tabId).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isAllowedSender(sender)) return false;
  if (message?.type !== "JOBTRACK_IMPORT_REQUEST" || typeof message.url !== "string") return false;

  importJob(message.url)
    .then((job) => sendResponse({ ok: true, job }))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  return true;
});
