const STATUSES = [
  "Saved",
  "Applied",
  "Screening",
  "Interview",
  "Take-home",
  "Final",
  "Offer",
  "Rejected",
  "Withdrawn",
  "No Response",
];

const SOURCES = ["Company Website", "SEEK", "LinkedIn", "Referral", "Recruiter", "Indeed", "Email", "Other"];
const CATEGORIES = [
  "Software Engineer",
  "Full-stack",
  "Backend",
  "Frontend",
  "Mobile",
  "Data Analyst",
  "Data Engineer",
  "Data AI",
  "ML / AI Engineer",
  "Business Analyst",
  "QA / Testing",
  "DevOps",
  "Cloud Engineer",
  "Cybersecurity",
  "Technical",
  "Technical Support",
  "Service Desk",
  "IT Support",
  "Product / Project",
  "Other",
];
const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Remote", "Hybrid"];
const STORAGE_KEY = "jobtrack.applications.v2";
const LEGACY_STORAGE_KEY = "jobtrack.applications.v1";
const SUPABASE_CONFIG_KEY = "jobtrack.supabase.config.v1";
const TABLE_NAME = "applications";
const PAGE_COPY = {
  applications: {
    eyebrow: "Application records",
    title: "Applications",
    description: "Review, filter, and update every role you are tracking.",
  },
  analytics: {
    eyebrow: "Search insights",
    title: "Analytics",
    description: "Understand your application outcomes, status mix, and search pace.",
  },
  admin: {
    eyebrow: "Administration",
    title: "User management",
    description: "Manage accounts and review each user's records separately.",
  },
};
const RUNTIME_CONFIG = window.JOBTRACK_CONFIG || {};
const ADMIN_EMAILS = (RUNTIME_CONFIG.adminEmails || ["steven5115115@gmail.com"]).map((email) =>
  String(email).toLowerCase(),
);
const DEFAULT_SUPABASE_CONFIG = {
  url: RUNTIME_CONFIG.supabaseUrl || "https://pexthgxqandoeesqbelb.supabase.co",
  anonKey: RUNTIME_CONFIG.supabaseAnonKey || "",
};

let applications = [];
let supabaseConfig = loadSupabaseConfig() || DEFAULT_SUPABASE_CONFIG;
let supabaseClient = null;
let currentUser = null;
let activeDataUserId = "";
let activeDataUserEmail = "";
let adminUsers = [];
let isSyncing = false;

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginNote: document.querySelector("#loginNote"),
  signUpBtn: document.querySelector("#signUpBtn"),
  navDropdown: document.querySelector("#navDropdown"),
  navMenuLabel: document.querySelector("#navMenuLabel"),
  pageEyebrow: document.querySelector("#pageEyebrow"),
  pageTitle: document.querySelector("#pageTitle"),
  pageDescription: document.querySelector("#pageDescription"),
  userChip: document.querySelector("#userChip"),
  rows: document.querySelector("#applicationRows"),
  resultCount: document.querySelector("#resultCount"),
  quickStats: document.querySelector("#quickStats"),
  statusFilter: document.querySelector("#statusFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  followFilter: document.querySelector("#followFilter"),
  searchInput: document.querySelector("#searchInput"),
  resetFiltersBtn: document.querySelector("#resetFiltersBtn"),
  avgProbability: document.querySelector("#avgProbability"),
  probabilityNote: document.querySelector("#probabilityNote"),
  statusChart: document.querySelector("#statusChart"),
  timelineChart: document.querySelector("#timelineChart"),
  drawer: document.querySelector("#drawer"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  form: document.querySelector("#applicationForm"),
  drawerTitle: document.querySelector("#drawerTitle"),
  deleteBtn: document.querySelector("#deleteBtn"),
  importJobUrlBtn: document.querySelector("#importJobUrlBtn"),
  urlImportNote: document.querySelector("#urlImportNote"),
  cvFileNote: document.querySelector("#cvFileNote"),
  clFileNote: document.querySelector("#clFileNote"),
  detailsModal: document.querySelector("#detailsModal"),
  detailsBackdrop: document.querySelector("#detailsBackdrop"),
  detailsTitle: document.querySelector("#detailsTitle"),
  detailsSubTitle: document.querySelector("#detailsSubTitle"),
  detailsJd: document.querySelector("#detailsJd"),
  detailsCl: document.querySelector("#detailsCl"),
  detailsCv: document.querySelector("#detailsCv"),
  detailsClFile: document.querySelector("#detailsClFile"),
  attentionCount: document.querySelector("#attentionCount"),
  activeCount: document.querySelector("#activeCount"),
  activeSummary: document.querySelector("#activeSummary"),
  interviewCount: document.querySelector("#interviewCount"),
  syncStatus: document.querySelector("#syncStatus"),
  syncModal: document.querySelector("#syncModal"),
  syncBackdrop: document.querySelector("#syncBackdrop"),
  syncForm: document.querySelector("#syncForm"),
  supabaseUrl: document.querySelector("#supabaseUrl"),
  supabaseAnonKey: document.querySelector("#supabaseAnonKey"),
  syncEmail: document.querySelector("#syncEmail"),
  syncFormNote: document.querySelector("#syncFormNote"),
  candidateProfileModal: document.querySelector("#candidateProfileModal"),
  candidateProfileBackdrop: document.querySelector("#candidateProfileBackdrop"),
  candidateProfileForm: document.querySelector("#candidateProfileForm"),
  candidateCvFile: document.querySelector("#candidateCvFile"),
  candidateCvNote: document.querySelector("#candidateCvNote"),
  candidateProfileText: document.querySelector("#candidateProfileText"),
  candidateProfileMessage: document.querySelector("#candidateProfileMessage"),
  uploadCandidateCvBtn: document.querySelector("#uploadCandidateCvBtn"),
  saveCandidateProfileBtn: document.querySelector("#saveCandidateProfileBtn"),
  agentSubmitBtn: document.querySelector("#agentSubmitBtn"),
  agentStatus: document.querySelector("#agentStatus"),
  agentResult: document.querySelector("#agentResult"),
  agentScore: document.querySelector("#agentScore"),
  agentRecommendation: document.querySelector("#agentRecommendation"),
  agentSummary: document.querySelector("#agentSummary"),
  agentStrengths: document.querySelector("#agentStrengths"),
  agentGaps: document.querySelector("#agentGaps"),
  agentQuestions: document.querySelector("#agentQuestions"),
  agentActions: document.querySelector("#agentActions"),
  agentCoverLetter: document.querySelector("#agentCoverLetter"),
  agentTrace: document.querySelector("#agentTrace"),
  agentModel: document.querySelector("#agentModel"),
  adminNav: document.querySelector("#adminNav"),
  adminPanel: document.querySelector("#adminPanel"),
  adminUserSelect: document.querySelector("#adminUserSelect"),
  adminRefreshBtn: document.querySelector("#adminRefreshBtn"),
  adminUserList: document.querySelector("#adminUserList"),
  adminViewingNote: document.querySelector("#adminViewingNote"),
  adminCreateUserForm: document.querySelector("#adminCreateUserForm"),
  adminNewUserEmail: document.querySelector("#adminNewUserEmail"),
  adminNewUserPassword: document.querySelector("#adminNewUserPassword"),
  adminCreateUserNote: document.querySelector("#adminCreateUserNote"),
};

function normalizeApplication(app) {
  return {
    id: app.id || crypto.randomUUID(),
    company: app.company || "",
    role: app.role || "",
    link: app.link || "",
    source: app.source || "Company Website",
    category: app.category || "Other",
    jobType: app.jobType || "Full-time",
    appliedDate: app.appliedDate || "",
    followUpDate: app.followUpDate || "",
    screenDate: app.screenDate || "",
    interviewDate: app.interviewDate || "",
    finalDate: app.finalDate || "",
    decisionDate: app.decisionDate || "",
    status: app.status || "Applied",
    jobDescription: app.jobDescription || "",
    coverLetter: app.coverLetter || "",
    clFileName: app.clFileName || "",
    clFileType: app.clFileType || "",
    clFileSize: app.clFileSize || 0,
    clStoragePath: app.clStoragePath || "",
    clFileData: app.clFileData || "",
    cvFileName: app.cvFileName || "",
    cvFileType: app.cvFileType || "",
    cvFileSize: app.cvFileSize || 0,
    cvStoragePath: app.cvStoragePath || "",
    cvFileData: app.cvFileData || "",
    notes: app.notes || "",
    updatedAt: app.updatedAt || new Date().toISOString(),
    isExample: app.isExample === true,
  };
}

function normalizeApplications(items) {
  return (items || []).map(normalizeApplication);
}

function applicationFromRow(row) {
  return normalizeApplication({
    id: row.id,
    ...row,
    ...row.payload,
  });
}

function rowFromApplication(app, userId) {
  return {
    id: app.id,
    user_id: userId,
    company: app.company || "",
    role: app.role || "",
    category: app.category || "Other",
    status: app.status || "Applied",
    applied_date: app.appliedDate || null,
    follow_up_date: app.followUpDate || null,
    payload: app,
    updated_at: app.updatedAt || new Date().toISOString(),
  };
}

function isExampleApplication(app) {
  return (
    app?.isExample === true ||
    (app?.link === "https://example.com/jobs" &&
      app?.notes === "Example row. Replace it with your real application.")
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start, end = new Date()) {
  const date = parseDate(start);
  if (!date) return 0;
  return Math.floor((end - date) / 86400000);
}

function daysUntil(value) {
  const date = parseDate(value);
  if (!date) return null;
  const now = parseDate(todayIso());
  return Math.ceil((date - now) / 86400000);
}

function cacheKeyForUser(userId) {
  return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY;
}

function isCurrentAdmin() {
  return Boolean(currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase()));
}

function loadApplicationsForUser(userId, userEmail = "") {
  try {
    const current = localStorage.getItem(cacheKeyForUser(userId));
    const canUseLegacy = userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());
    const legacy = canUseLegacy ? localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) : null;
    return normalizeApplications(JSON.parse(current || legacy) || []);
  } catch {
    return [];
  }
}

function saveApplications({ skipCloud = false } = {}) {
  if (activeDataUserId) {
    localStorage.setItem(cacheKeyForUser(activeDataUserId), JSON.stringify(withoutExamples(applications)));
  }
  if (!skipCloud) syncAllToBackend();
}

function loadSupabaseConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY));
    if (!config?.url || !config?.anonKey) {
      localStorage.removeItem(SUPABASE_CONFIG_KEY);
      return null;
    }
    return config;
  } catch {
    return null;
  }
}

function saveSupabaseConfig(config) {
  supabaseConfig = config || DEFAULT_SUPABASE_CONFIG;
  if (config?.url && config?.anonKey) {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
  }
}

function probabilityFor(app) {
  if (app.status === "Offer") return 100;
  if (app.status === "Rejected" || app.status === "Withdrawn") return 0;

  const stageScore = {
    Saved: 8,
    Applied: 20,
    Screening: 34,
    Interview: 52,
    "Take-home": 58,
    Final: 74,
    "No Response": 10,
  }[app.status] ?? 16;

  const historicalClosed = withoutExamples(applications).filter((item) =>
    ["Offer", "Rejected", "Withdrawn"].includes(item.status),
  );
  const offerRate =
    historicalClosed.length > 0
      ? historicalClosed.filter((item) => item.status === "Offer").length / historicalClosed.length
      : 0.28;
  const historyAdjustment = (offerRate - 0.28) * 18;

  let timingAdjustment = 0;
  const age = daysBetween(app.appliedDate);
  if (age <= 7) timingAdjustment += 5;
  if (age > 21 && ["Applied", "No Response"].includes(app.status)) timingAdjustment -= 8;
  if (app.screenDate) timingAdjustment += 4;
  if (app.interviewDate) timingAdjustment += 7;
  if (app.finalDate) timingAdjustment += 9;

  const followDays = daysUntil(app.followUpDate);
  if (followDays !== null && followDays < 0 && !["Offer", "Rejected", "Withdrawn"].includes(app.status)) {
    timingAdjustment -= 5;
  }

  return Math.max(0, Math.min(96, Math.round(stageScore + historyAdjustment + timingAdjustment)));
}

function filteredApplications() {
  const status = els.statusFilter.value;
  const source = els.sourceFilter.value;
  const category = els.categoryFilter.value;
  const follow = els.followFilter.value;
  const query = els.searchInput.value.trim().toLowerCase();

  return withoutExamples(applications).filter((app) => {
    const text = `${app.company} ${app.role} ${app.category} ${app.notes}`.toLowerCase();
    const due = daysUntil(app.followUpDate);
    const matchesFollow =
      follow === "all" ||
      (follow === "due" && due !== null && due <= 0) ||
      (follow === "week" && due !== null && due >= 0 && due <= 7) ||
      (follow === "stale" && isStaleApplication(app)) ||
      (follow === "none" && !app.followUpDate);
    return (
      (status === "all" || app.status === status) &&
      (source === "all" || app.source === source) &&
      (category === "all" || app.category === category) &&
      matchesFollow &&
      (!query || text.includes(query))
    );
  });
}

function statusClass(status) {
  return `status-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

function formatDate(value) {
  return value || "-";
}

function renderRows() {
  const items = filteredApplications().sort((a, b) => (b.appliedDate || "").localeCompare(a.appliedDate || ""));
  els.resultCount.textContent = `${items.length} shown`;
  if (items.length === 0) {
    els.rows.innerHTML = `<tr><td colspan="11" class="empty-state">No applications match this view.</td></tr>`;
    return;
  }

  els.rows.innerHTML = items
    .map((app) => {
      const probability = probabilityFor(app);
      const link = app.link
        ? `<a class="link-out" href="${escapeHtml(app.link)}" target="_blank" rel="noreferrer">Open</a>`
        : "-";
      return `
        <tr>
          <td class="actions-cell">
            <div class="row-actions">
              <button class="edit-btn edit-btn-primary" type="button" data-edit="${app.id}">Edit</button>
              <button class="edit-btn" type="button" data-view="${app.id}">View</button>
            </div>
          </td>
          <td class="company-cell">${escapeHtml(app.company)}<span>${escapeHtml(app.source || "No source")}</span></td>
          <td>${escapeHtml(app.role)}</td>
          <td>${escapeHtml(app.category || "Other")}</td>
          <td>${link}</td>
          <td>${formatDate(app.appliedDate)}</td>
          <td>${formatDate(app.followUpDate)}</td>
          <td><span class="status-pill ${statusClass(app.status)}">${escapeHtml(app.status)}</span></td>
          <td>${app.jobDescription ? `<button class="text-button" type="button" data-view="${app.id}">View JD</button>` : "-"}</td>
          <td>${materialTags(app)}</td>
          <td>
            <div class="probability-bar">
              <strong>${probability}%</strong>
              <div class="bar-track"><div class="bar-fill" style="width:${probability}%"></div></div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function materialTags(app) {
  const tags = [
    ["JD", Boolean(app.jobDescription)],
    ["CV", Boolean(app.cvStoragePath || app.cvFileData || app.cvFileName)],
    ["CL", Boolean(app.coverLetter || app.clStoragePath || app.clFileData || app.clFileName)],
  ];
  return `<div class="material-tags">${tags
    .map(([label, ready]) => `<span class="material-tag ${ready ? "ready" : ""}">${label}</span>`)
    .join("")}</div>`;
}

function renderStats() {
  const realApps = withoutExamples(applications);
  const open = realApps.filter((app) => !["Offer", "Rejected", "Withdrawn"].includes(app.status)).length;
  const interviews = realApps.filter((app) => ["Interview", "Take-home", "Final"].includes(app.status)).length;
  const offers = realApps.filter((app) => app.status === "Offer").length;
  const rejected = realApps.filter((app) => app.status === "Rejected").length;
  const closed = realApps.length - open;
  const stale = staleApplications();
  const dueNow = realApps.filter((app) => {
    const days = daysUntil(app.followUpDate);
    return days !== null && days <= 0 && !["Offer", "Rejected", "Withdrawn"].includes(app.status);
  }).length;
  els.quickStats.innerHTML = `
    <div class="stat-row"><span>Total</span><strong>${realApps.length}</strong></div>
    <div class="stat-row"><span>Open</span><strong>${open}</strong></div>
    <div class="stat-row"><span>Interviews</span><strong>${interviews}</strong></div>
    <div class="stat-row"><span>Offers</span><strong>${offers}</strong></div>
    <div class="stat-row"><span>Rejected</span><strong>${rejected}</strong></div>
  `;
  if (els.attentionCount) els.attentionCount.textContent = `${stale.length + dueNow}`;
  if (els.activeCount) els.activeCount.textContent = `${realApps.length}`;
  if (els.activeSummary) els.activeSummary.textContent = `${open} open / ${closed} closed or inactive.`;
  if (els.interviewCount) els.interviewCount.textContent = `${interviews}`;

  const active = realApps.filter((app) => !["Offer", "Rejected", "Withdrawn"].includes(app.status));
  const avg = active.length ? Math.round(active.reduce((sum, app) => sum + probabilityFor(app), 0) / active.length) : 0;
  els.avgProbability.textContent = `${avg}%`;
  els.probabilityNote.textContent = active.length
    ? `Average across ${active.length} active applications.`
    : "Add applications to start estimating.";
}

function renderStatusChart() {
  const realApps = withoutExamples(applications);
  const counts = STATUSES.map((status) => ({
    status,
    count: realApps.filter((app) => app.status === status).length,
  })).filter((item) => item.count > 0);
  const max = Math.max(1, ...counts.map((item) => item.count));
  els.statusChart.innerHTML =
    counts.length === 0
      ? `<p class="muted">No data yet.</p>`
      : counts
          .map(
            (item) => `
            <div class="chart-row">
              <span>${item.status}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div>
              <strong>${item.count}</strong>
            </div>
          `,
          )
          .join("");
}

function isStaleApplication(app) {
  if (!app.appliedDate || ["Offer", "Rejected", "Withdrawn"].includes(app.status)) return false;
  if (app.screenDate || app.interviewDate || app.finalDate || app.decisionDate) return false;
  return daysBetween(app.appliedDate) >= 30;
}

function staleApplications() {
  return withoutExamples(applications)
    .filter(isStaleApplication)
    .sort((a, b) => daysBetween(b.appliedDate) - daysBetween(a.appliedDate));
}

function renderTimeline() {
  const buckets = new Map();
  withoutExamples(applications).forEach((app) => {
    if (!app.appliedDate) return;
    const key = app.appliedDate.slice(0, 7);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  const entries = [...buckets.entries()].sort().slice(-6);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  els.timelineChart.innerHTML =
    entries.length === 0
      ? `<p class="muted">No timeline yet.</p>`
      : entries
          .map(([month, count]) => {
            const height = Math.max(16, (count / max) * 104);
            return `
              <div class="pace-item" title="${month}: ${count} applications">
                <strong>${count}</strong>
                <div class="month-bar" style="height:${height}px"></div>
                <span>${monthLabel(month)}</span>
              </div>
            `;
          })
          .join("");
}

function monthLabel(month) {
  const [year, rawMonth] = month.split("-");
  const date = new Date(Number(year), Number(rawMonth) - 1, 1);
  return date.toLocaleDateString("en", { month: "short" });
}

function renderFilters() {
  fillSelect(els.statusFilter, ["all", ...STATUSES], "all", (item) => (item === "all" ? "All statuses" : item));
  fillSelect(els.sourceFilter, ["all", ...SOURCES], "all", (item) => (item === "all" ? "All sources" : item));
  fillSelect(els.categoryFilter, ["all", ...CATEGORIES], "all", (item) => (item === "all" ? "All categories" : item));
  fillSelect(document.querySelector("#status"), STATUSES, "Applied");
  fillSelect(document.querySelector("#source"), SOURCES, "Company Website");
  fillSelect(document.querySelector("#category"), CATEGORIES, "Other");
  fillSelect(document.querySelector("#jobType"), JOB_TYPES, "Full-time");
}

function fillSelect(select, options, selected, labeler = (item) => item) {
  select.innerHTML = options.map((item) => `<option value="${item}">${labeler(item)}</option>`).join("");
  select.value = selected;
}

function renderAll() {
  renderRows();
  renderStats();
  renderStatusChart();
  renderTimeline();
  renderAdminUsers();
}

function setActiveNav(target) {
  const activeTarget = target === "admin" && !isCurrentAdmin() ? "applications" : target;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === activeTarget);
  });
  document.querySelectorAll(".page-view").forEach((page) => {
    page.classList.toggle("hidden", page.dataset.page !== activeTarget);
  });

  const copy = PAGE_COPY[activeTarget] || PAGE_COPY.applications;
  els.pageEyebrow.textContent = copy.eyebrow;
  els.pageTitle.textContent = copy.title;
  els.pageDescription.textContent = copy.description;
  els.navMenuLabel.textContent = copy.title;
  els.navDropdown.open = false;
  document.title = `${copy.title} | JobTrack`;
  window.scrollTo({ top: 0, behavior: "auto" });
  return activeTarget;
}

function resetFilters() {
  els.statusFilter.value = "all";
  els.sourceFilter.value = "all";
  els.categoryFilter.value = "all";
  els.followFilter.value = "all";
  els.searchInput.value = "";
  renderRows();
}

function handleNav(target) {
  const activeTarget = setActiveNav(target);
  if (activeTarget === "admin") loadAdminUsers();
  return activeTarget;
}

function restoreNavFromHash() {
  const rawTarget = location.hash.replace("#", "") || "applications";
  const legacyTarget = ["dashboard", "followups"].includes(rawTarget) ? "applications" : rawTarget;
  const target = legacyTarget === "adminPanel" ? "admin" : legacyTarget;
  if (["applications", "analytics", "admin"].includes(target)) {
    const activeTarget = handleNav(target);
    if (location.hash !== `#${activeTarget}`) history.replaceState(null, "", `#${activeTarget}`);
  } else {
    handleNav("applications");
    history.replaceState(null, "", "#applications");
  }
}

function openDrawer(app = null) {
  els.form.reset();
  document.querySelector("#recordId").value = app?.id || "";
  els.drawerTitle.textContent = app ? "Edit application" : "Add application";
  els.deleteBtn.classList.toggle("hidden", !app);

  const fields = [
    "company",
    "role",
    "link",
    "source",
    "category",
    "jobType",
    "appliedDate",
    "followUpDate",
    "screenDate",
    "interviewDate",
    "finalDate",
    "decisionDate",
    "status",
    "jobDescription",
    "coverLetter",
    "notes",
  ];
  fields.forEach((field) => {
    document.querySelector(`#${field}`).value = app?.[field] || "";
  });
  if (!app) {
    document.querySelector("#appliedDate").value = todayIso();
    document.querySelector("#status").value = "Applied";
    document.querySelector("#source").value = "Company Website";
    document.querySelector("#category").value = "Other";
    document.querySelector("#jobType").value = "Full-time";
  }
  updateCvNote(app);
  updateClNote(app);
  setUrlImportNote(
    isBrowserImporterReady()
      ? "Browser helper connected. SEEK and LinkedIn signed-in pages are supported."
      : "Paste a public job URL. SEEK may require the optional browser helper.",
    isBrowserImporterReady() ? "success" : "info",
  );
  resetAgentAnalysis();

  els.drawer.classList.remove("hidden");
  els.drawerBackdrop.classList.remove("hidden");
}

function updateCvNote(app) {
  const name = app?.cvFileName;
  const location = app?.cvStoragePath ? "cloud file" : app?.cvFileData ? "saved legacy file" : "saved file";
  els.cvFileNote.textContent = name
    ? `Saved CV: ${name} (${location}). Choose another file to replace it.`
    : "No CV saved for this application.";
}

function updateClNote(app) {
  const name = app?.clFileName;
  const location = app?.clStoragePath ? "cloud file" : app?.clFileData ? "saved legacy file" : "saved file";
  els.clFileNote.textContent = name
    ? `Saved CL file: ${name} (${location}). Choose another file to replace it.`
    : "No cover letter file saved for this application.";
}

function closeDrawer() {
  els.drawer.classList.add("hidden");
  els.drawerBackdrop.classList.add("hidden");
}

async function upsertApplication(event) {
  event.preventDefault();
  const id = document.querySelector("#recordId").value || crypto.randomUUID();
  const previous = applications.find((item) => item.id === id);
  const cvFile = document.querySelector("#cvFile").files[0];
  const clFile = document.querySelector("#clFile").files[0];
  let cvFields = {
    cvFileName: previous?.cvFileName || "",
    cvFileType: previous?.cvFileType || "",
    cvFileSize: previous?.cvFileSize || 0,
    cvStoragePath: previous?.cvStoragePath || "",
    cvFileData: previous?.cvFileData || "",
  };
  let clFields = {
    clFileName: previous?.clFileName || "",
    clFileType: previous?.clFileType || "",
    clFileSize: previous?.clFileSize || 0,
    clStoragePath: previous?.clStoragePath || "",
    clFileData: previous?.clFileData || "",
  };
  if (cvFile) {
    if (cvFile.size > 10 * 1024 * 1024) {
      alert("This CV is larger than 10 MB. Please upload a smaller PDF/DOC/DOCX/TXT file.");
      return;
    }
    try {
      updateSyncStatus("Uploading CV...");
      cvFields = await uploadMaterialFile(id, cvFile, previous?.cvStoragePath || "", "CV");
    } catch (error) {
      alert(`Could not upload CV: ${error.message}`);
      updateSyncStatus(`CV upload error: ${error.message}`);
      return;
    }
  }
  if (clFile) {
    if (clFile.size > 10 * 1024 * 1024) {
      alert("This cover letter file is larger than 10 MB. Please upload a smaller PDF/DOC/DOCX/TXT file.");
      return;
    }
    try {
      updateSyncStatus("Uploading cover letter file...");
      clFields = mapUploadedFile(await uploadMaterialFile(id, clFile, previous?.clStoragePath || "", "CL"), "cl");
    } catch (error) {
      alert(`Could not upload cover letter file: ${error.message}`);
      updateSyncStatus(`CL upload error: ${error.message}`);
      return;
    }
  }
  const app = normalizeApplication({
    id,
    company: document.querySelector("#company").value.trim(),
    role: document.querySelector("#role").value.trim(),
    link: document.querySelector("#link").value.trim(),
    source: document.querySelector("#source").value,
    category: document.querySelector("#category").value,
    jobType: document.querySelector("#jobType").value,
    appliedDate: document.querySelector("#appliedDate").value,
    followUpDate: document.querySelector("#followUpDate").value,
    screenDate: document.querySelector("#screenDate").value,
    interviewDate: document.querySelector("#interviewDate").value,
    finalDate: document.querySelector("#finalDate").value,
    decisionDate: document.querySelector("#decisionDate").value,
    status: document.querySelector("#status").value,
    jobDescription: document.querySelector("#jobDescription").value.trim(),
    coverLetter: document.querySelector("#coverLetter").value.trim(),
    ...clFields,
    ...cvFields,
    notes: document.querySelector("#notes").value.trim(),
    updatedAt: new Date().toISOString(),
  });
  const index = applications.findIndex((item) => item.id === id);
  if (index >= 0) applications[index] = app;
  else applications.unshift(app);
  saveApplications();
  closeDrawer();
  renderAll();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        cvFileName: file.name,
        cvFileType: file.type || "application/octet-stream",
        cvFileData: reader.result,
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadMaterialFile(appId, file, previousPath = "", label = "file") {
  const headers = await authHeaders(false);
  if (!headers) throw new Error("Your login session expired. Please sign in again, then retry the upload.");
  const formData = new FormData();
  formData.append("appId", appId);
  formData.append("file", file);
  formData.append("previousPath", previousPath);
  if (activeDataUserId) formData.append("userId", activeDataUserId);

  const response = await fetch("/api/cv", {
    method: "POST",
    headers,
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    currentUser = null;
    setAuthView(false);
    updateSyncStatus("Session expired. Please sign in again.");
  }
  if (!response.ok) throw new Error(payload.error || `Upload failed: ${response.status}`);

  return {
    cvFileName: payload.cvFileName,
    cvFileType: payload.cvFileType,
    cvFileSize: payload.cvFileSize || file.size,
    cvStoragePath: payload.cvStoragePath,
    cvFileData: "",
  };
}

function mapUploadedFile(uploaded, prefix) {
  return {
    [`${prefix}FileName`]: uploaded.cvFileName,
    [`${prefix}FileType`]: uploaded.cvFileType,
    [`${prefix}FileSize`]: uploaded.cvFileSize,
    [`${prefix}StoragePath`]: uploaded.cvStoragePath,
    [`${prefix}FileData`]: "",
  };
}

async function deleteCurrent() {
  const id = document.querySelector("#recordId").value;
  const previous = applications.find((app) => app.id === id);
  if (previous?.cvStoragePath) await deleteCvFile(previous.cvStoragePath);
  if (previous?.clStoragePath) await deleteCvFile(previous.clStoragePath);
  applications = applications.filter((app) => app.id !== id);
  saveApplications();
  deleteFromCloud(id);
  closeDrawer();
  renderAll();
}

function exportData() {
  const blob = new Blob([JSON.stringify(withoutExamples(applications), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobtrack-${todayIso()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      applications = normalizeApplications(parsed);
      saveApplications();
      renderAll();
    } catch {
      alert("Could not import this file. Please choose a JobTrack JSON export.");
    }
  };
  reader.readAsText(file);
}

function openDetails(app) {
  els.detailsTitle.textContent = app.company;
  els.detailsSubTitle.textContent = `${app.role} | ${app.category || "Other"} | ${app.status} | ${probabilityFor(app)}% probability`;
  els.detailsJd.textContent = app.jobDescription || "No job description saved yet.";
  els.detailsCl.textContent = app.coverLetter || "No cover letter text saved yet.";
  if (app.clStoragePath) {
    els.detailsClFile.innerHTML = `<button class="secondary" type="button" data-download-cl="${escapeHtml(app.id)}">Download ${escapeHtml(app.clFileName || "cover letter")}</button>`;
  } else if (app.clFileData) {
    els.detailsClFile.innerHTML = `<a class="secondary" href="${app.clFileData}" download="${escapeHtml(app.clFileName || "cover-letter")}">Download ${escapeHtml(app.clFileName || "cover letter")}</a>`;
  } else {
    els.detailsClFile.innerHTML = "";
  }
  if (app.cvStoragePath) {
    els.detailsCv.innerHTML = `<button class="primary" type="button" data-download-cv="${escapeHtml(app.id)}">Download ${escapeHtml(app.cvFileName || "CV")}</button>`;
  } else if (app.cvFileData) {
    els.detailsCv.innerHTML = `<a class="primary" href="${app.cvFileData}" download="${escapeHtml(app.cvFileName || "cv")}">Download ${escapeHtml(app.cvFileName || "CV")}</a>`;
  } else {
    els.detailsCv.innerHTML = `<p class="muted">No CV file saved yet.</p>`;
  }
  els.detailsModal.classList.remove("hidden");
  els.detailsBackdrop.classList.remove("hidden");
}

function closeDetails() {
  els.detailsModal.classList.add("hidden");
  els.detailsBackdrop.classList.add("hidden");
}

async function ensureSupabaseSdk() {
  if (window.supabase) return true;
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (window.supabase) return true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => resolve(Boolean(window.supabase));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function createSupabaseClient() {
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey || !window.supabase) return null;
  return window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
}

async function initSupabase() {
  supabaseConfig = loadSupabaseConfig() || DEFAULT_SUPABASE_CONFIG;
  await ensureSupabaseSdk();
  supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    updateSyncStatus("Supabase config missing");
    setAuthView(false);
    return;
  }

  updateSyncStatus("Backend configured");
  let initialSession = null;
  try {
    const { data } = await supabaseClient.auth.getSession();
    initialSession = data.session;
  } catch {
    updateSyncStatus("Session expired. Please sign in again.");
  }
  currentUser = initialSession?.user || null;
  if (currentUser) {
    setActiveDataUser(currentUser.id, currentUser.email || "Current user");
    setAuthView(true);
    restoreNavFromHash();
    updateSyncStatus(`Signed in: ${currentUser.email || "anonymous user"}`);
    if (isCurrentAdmin()) await loadAdminUsers();
    await loadFromBackend();
    await syncAllToBackend();
  } else {
    setAuthView(false);
    updateSyncStatus("Sign in to sync.");
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) setActiveDataUser(currentUser.id, currentUser.email || "Current user");
    setAuthView(Boolean(currentUser));
    if (currentUser) {
      restoreNavFromHash();
      updateSyncStatus(`Signed in: ${currentUser.email || "anonymous user"}`);
      if (isCurrentAdmin()) await loadAdminUsers();
      await loadFromBackend();
      await syncAllToBackend();
    } else {
      activeDataUserId = "";
      activeDataUserEmail = "";
      adminUsers = [];
      applications = [];
      renderAll();
      updateSyncStatus("Signed out");
    }
  });
}

function setActiveDataUser(userId, email) {
  activeDataUserId = userId || currentUser?.id || "";
  activeDataUserEmail = email || currentUser?.email || "";
  applications = loadApplicationsForUser(activeDataUserId, activeDataUserEmail);
  setAuthView(Boolean(currentUser));
  renderAll();
}

function setAuthView(isSignedIn) {
  els.loginScreen.classList.toggle("hidden", isSignedIn);
  els.appShell.classList.toggle("app-locked", !isSignedIn);
  els.userChip.textContent = activeDataUserEmail
    ? `${activeDataUserEmail}${activeDataUserId !== currentUser?.id ? " (viewing)" : ""}`
    : currentUser?.email || "Not signed in";
  els.adminNav?.classList.toggle("hidden", !isCurrentAdmin());
  els.adminPanel?.classList.toggle("hidden", !isCurrentAdmin());
}

function renderAdminUsers() {
  if (!els.adminUserSelect || !els.adminUserList) return;
  const users = adminUsers.length
    ? adminUsers
    : currentUser
      ? [
          {
            id: currentUser.id,
            email: currentUser.email || "Current user",
            applicationCount: withoutExamples(applications).length,
          },
        ]
      : [];

  els.adminUserSelect.innerHTML = users
    .map(
      (user) =>
        `<option value="${escapeHtml(user.id)}" ${user.id === activeDataUserId ? "selected" : ""}>${escapeHtml(user.email)} (${user.applicationCount || 0})</option>`,
    )
    .join("");

  els.adminUserList.innerHTML = users
    .map(
      (user) => `
        <button class="admin-user ${user.id === activeDataUserId ? "active" : ""}" type="button" data-user-id="${escapeHtml(user.id)}">
          <span>${escapeHtml(user.email)}</span>
          <strong>${user.applicationCount || 0} apps</strong>
        </button>
      `,
    )
    .join("");

  if (els.adminViewingNote) {
    els.adminViewingNote.textContent =
      activeDataUserId === currentUser?.id
        ? "Viewing your own application data."
        : `Viewing ${activeDataUserEmail || "selected user"} as admin.`;
  }
}

async function loadAdminUsers() {
  if (!isCurrentAdmin()) return;
  try {
    const data = await apiRequest("/api/admin/users");
    adminUsers = data.users || [];
    renderAdminUsers();
  } catch (error) {
    adminUsers = [];
    renderAdminUsers();
    updateSyncStatus(`Admin user list error: ${error.message}`);
  }
}

async function viewAdminUser(userId) {
  if (!isCurrentAdmin()) return;
  const user = adminUsers.find((item) => item.id === userId);
  setActiveDataUser(userId, user?.email || "Selected user");
  await loadFromBackend();
  renderAdminUsers();
}

async function createAdminUser(event) {
  event.preventDefault();
  if (!isCurrentAdmin()) return;
  const email = els.adminNewUserEmail.value.trim().toLowerCase();
  const password = els.adminNewUserPassword.value;
  if (!email || password.length < 6) {
    els.adminCreateUserNote.textContent = "Use a valid email and a password with at least 6 characters.";
    els.adminCreateUserNote.classList.add("warning");
    return;
  }
  els.adminCreateUserNote.textContent = "Creating user...";
  els.adminCreateUserNote.classList.remove("warning");
  try {
    const data = await apiRequest("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    els.adminCreateUserForm.reset();
    els.adminCreateUserNote.textContent = `Created ${data.user.email}. They can sign in now.`;
    await loadAdminUsers();
  } catch (error) {
    els.adminCreateUserNote.textContent = `Create user error: ${error.message}`;
    els.adminCreateUserNote.classList.add("warning");
  }
}

function updateSyncStatus(message) {
  els.syncStatus.textContent = message;
}

async function authHeaders(includeJson = true) {
  if (!supabaseClient) return null;
  let session;
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    session = data.session;
  } catch {
    currentUser = null;
    setAuthView(false);
    updateSyncStatus("Session expired. Please sign in again.");
    return null;
  }
  if (!session?.access_token) {
    currentUser = null;
    setAuthView(false);
    updateSyncStatus("Session expired. Please sign in again.");
    return null;
  }
  const headers = {
    Authorization: `Bearer ${session.access_token}`,
  };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

async function apiRequest(path, options = {}) {
  const headers = await authHeaders();
  if (!headers) throw new Error("Your login session expired. Please sign in again, then retry.");
  const response = await fetch(path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

function canUseDirectOwnData() {
  return Boolean(supabaseClient && currentUser && activeDataUserId === currentUser.id);
}

async function loadDirectOwnData() {
  if (!canUseDirectOwnData()) throw new Error("Direct data access is only available for your own account.");
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", currentUser.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(applicationFromRow);
}

async function syncDirectOwnData(realApps) {
  if (!canUseDirectOwnData()) throw new Error("Direct data sync is only available for your own account.");
  if (realApps.length === 0) return { saved: 0 };
  const rows = realApps.map((app) => rowFromApplication(app, currentUser.id));
  const { error } = await supabaseClient.from(TABLE_NAME).upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return { saved: rows.length };
}

async function deleteDirectOwnData(id) {
  if (!canUseDirectOwnData()) throw new Error("Direct delete is only available for your own account.");
  const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("user_id", currentUser.id).eq("id", id);
  if (error) throw error;
}

async function loadFromBackend() {
  if (!supabaseClient || !currentUser) return;
  updateSyncStatus("Loading backend data...");
  let data;
  let loadedCloudApps;
  try {
    const userQuery =
      isCurrentAdmin() && activeDataUserId && activeDataUserId !== currentUser.id
        ? `?userId=${encodeURIComponent(activeDataUserId)}`
        : "";
    data = await apiRequest(`/api/applications${userQuery}`);
    loadedCloudApps = normalizeApplications((data.applications || []).map(applicationFromRow));
  } catch (error) {
    if (!canUseDirectOwnData()) {
      updateSyncStatus(`Sync error: ${error.message}`);
      return;
    }
    try {
      loadedCloudApps = await loadDirectOwnData();
      updateSyncStatus("Loaded with direct Supabase access for local testing.");
    } catch (directError) {
      updateSyncStatus(`Sync error: ${directError.message}`);
      return;
    }
  }

  const cloudApps = withoutExamples(loadedCloudApps);
  await deleteExampleRowsFromBackend(loadedCloudApps.filter(isExampleApplication));
  const localApps = loadApplicationsForUser(activeDataUserId, activeDataUserEmail);
  applications = mergeApplications(localApps, cloudApps);
  saveApplications({ skipCloud: true });
  updateSyncStatus(`Synced ${withoutExamples(applications).length} apps for ${activeDataUserEmail || "this user"}`);
  renderAll();
}

function mergeApplications(localApps, cloudApps) {
  const map = new Map();
  [...withoutExamples(cloudApps), ...withoutExamples(localApps)].forEach((app) => {
    const existing = map.get(app.id);
    if (!existing || String(app.updatedAt || "") >= String(existing.updatedAt || "")) {
      map.set(app.id, app);
    }
  });
  return [...map.values()];
}

function withoutExamples(items) {
  return (items || []).filter((app) => !isExampleApplication(app));
}

async function deleteExampleRowsFromBackend(exampleApps) {
  if (!exampleApps.length) return;
  const userQuery =
    isCurrentAdmin() && activeDataUserId && activeDataUserId !== currentUser?.id
      ? `&userId=${encodeURIComponent(activeDataUserId)}`
      : "";
  await Promise.all(
    exampleApps.map((app) =>
      apiRequest(`/api/applications?id=${encodeURIComponent(app.id)}${userQuery}`, { method: "DELETE" }).catch(
        () => null,
      ),
    ),
  );
}

async function syncAllToBackend() {
  if (isSyncing || !supabaseClient || !currentUser) return;
  isSyncing = true;
  const realApps = withoutExamples(applications);
  try {
    await apiRequest("/api/applications", {
      method: "POST",
      body: JSON.stringify({ applications: realApps, userId: activeDataUserId || currentUser.id }),
    });
    updateSyncStatus(`Synced ${realApps.length} apps for ${activeDataUserEmail || "this user"}`);
  } catch (error) {
    if (!canUseDirectOwnData()) {
      updateSyncStatus(`Sync error: ${error.message}`);
    } else {
      try {
        await syncDirectOwnData(realApps);
        updateSyncStatus(`Synced ${realApps.length} apps with direct Supabase access.`);
      } catch (directError) {
        updateSyncStatus(`Sync error: ${directError.message}`);
      }
    }
  }
  isSyncing = false;
}

async function deleteFromCloud(id) {
  if (!supabaseClient || !currentUser) return;
  const userQuery =
    isCurrentAdmin() && activeDataUserId && activeDataUserId !== currentUser.id
      ? `&userId=${encodeURIComponent(activeDataUserId)}`
      : "";
  try {
    await apiRequest(`/api/applications?id=${encodeURIComponent(id)}${userQuery}`, { method: "DELETE" });
  } catch (error) {
    if (!canUseDirectOwnData()) {
      updateSyncStatus(`Delete sync error: ${error.message}`);
    } else {
      try {
        await deleteDirectOwnData(id);
      } catch (directError) {
        updateSyncStatus(`Delete sync error: ${directError.message}`);
      }
    }
  }
}

async function downloadCvFile(appId) {
  const app = applications.find((item) => item.id === appId);
  if (!app?.cvStoragePath) return;
  const userQuery =
    isCurrentAdmin() && activeDataUserId && activeDataUserId !== currentUser?.id
      ? `&userId=${encodeURIComponent(activeDataUserId)}`
      : "";
  try {
    const data = await apiRequest(
      `/api/cv?path=${encodeURIComponent(app.cvStoragePath)}&name=${encodeURIComponent(app.cvFileName || "cv")}${userQuery}`,
    );
    window.location.href = data.signedUrl;
  } catch (error) {
    alert(`Could not download CV: ${error.message}`);
  }
}

async function downloadClFile(appId) {
  const app = applications.find((item) => item.id === appId);
  if (!app?.clStoragePath) return;
  const userQuery =
    isCurrentAdmin() && activeDataUserId && activeDataUserId !== currentUser?.id
      ? `&userId=${encodeURIComponent(activeDataUserId)}`
      : "";
  try {
    const data = await apiRequest(
      `/api/cv?path=${encodeURIComponent(app.clStoragePath)}&name=${encodeURIComponent(app.clFileName || "cover-letter")}${userQuery}`,
    );
    window.location.href = data.signedUrl;
  } catch (error) {
    alert(`Could not download cover letter file: ${error.message}`);
  }
}

async function deleteCvFile(path) {
  if (!path || !supabaseClient || !currentUser) return;
  const userQuery =
    isCurrentAdmin() && activeDataUserId && activeDataUserId !== currentUser.id
      ? `&userId=${encodeURIComponent(activeDataUserId)}`
      : "";
  try {
    await apiRequest(`/api/cv?path=${encodeURIComponent(path)}${userQuery}`, { method: "DELETE" });
  } catch (error) {
    updateSyncStatus(`CV delete error: ${error.message}`);
  }
}

function openSyncModal() {
  els.supabaseUrl.value = supabaseConfig?.url || "";
  els.supabaseAnonKey.value = supabaseConfig?.anonKey || "";
  els.syncEmail.value = currentUser?.email || "";
  els.syncEmail.readOnly = true;
  els.syncFormNote.textContent = "This fullstack version uses deployment environment variables.";
  els.syncModal.classList.remove("hidden");
  els.syncBackdrop.classList.remove("hidden");
}

function closeSyncModal() {
  els.syncModal.classList.add("hidden");
  els.syncBackdrop.classList.add("hidden");
}

async function saveSyncSettings(event) {
  event.preventDefault();
  await ensureSupabaseSdk();
  supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    updateSyncStatus("Supabase config missing");
    return;
  }
  els.syncFormNote.textContent = `Connection ready for ${currentUser?.email || "signed-in user"}.`;
  els.syncFormNote.classList.remove("warning");
  updateSyncStatus("Backend connection refreshed.");
}

async function sendLoginLink(event) {
  event.preventDefault();
  if (!supabaseClient) {
    await initSupabase();
    if (!supabaseClient) {
      els.loginNote.textContent = "Supabase connection is not ready. Refresh the page once and try again.";
      els.loginNote.classList.add("warning");
      return;
    }
  }
  const email = els.loginEmail.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  if (!email || !password) {
    els.loginNote.textContent = "Enter your email and password.";
    els.loginNote.classList.add("warning");
    return;
  }
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    els.loginNote.textContent = `Auth error: ${error.message}`;
    els.loginNote.classList.add("warning");
    return;
  }
  els.loginNote.textContent = "Signed in. Loading your applications...";
  els.loginNote.classList.remove("warning");
}

async function signUp(event) {
  event.preventDefault();
  if (!supabaseClient) await initSupabase();
  if (!supabaseClient) {
    els.loginNote.textContent = "Supabase connection is not ready. Refresh the page once and try again.";
    els.loginNote.classList.add("warning");
    return;
  }
  const email = els.loginEmail.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  if (!email || password.length < 6) {
    els.loginNote.textContent = "Use an email and a password with at least 6 characters.";
    els.loginNote.classList.add("warning");
    return;
  }
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    const message = error.message || "";
    els.loginNote.textContent = /rate limit|too many/i.test(message)
      ? "Sign-up is temporarily rate limited by Supabase email. Wait about an hour, disable email confirmation in Supabase Auth, or ask an admin to create the user."
      : `Sign-up error: ${message}`;
    els.loginNote.classList.add("warning");
    return;
  }
  els.loginNote.textContent = data.session
    ? "Account created. Loading your tracker..."
    : "Account created. If email confirmation is enabled, check your inbox before signing in.";
  els.loginNote.classList.remove("warning");
}

async function signOut() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  activeDataUserId = "";
  activeDataUserEmail = "";
  adminUsers = [];
  applications = [];
  renderAll();
  setAuthView(false);
}

function normalizeSupabaseUrl(value) {
  if (!value) return "";
  if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(value)) {
    return value.replace(/\/$/, "");
  }
  const dashboardMatch = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i);
  if (dashboardMatch?.[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return "";
}

function clearSyncSettings() {
  closeSyncModal();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setCandidateProfileMessage(message, type = "info") {
  els.candidateProfileMessage.textContent = message;
  els.candidateProfileMessage.dataset.type = type;
  els.candidateProfileMessage.classList.remove("hidden");
}

function hideCandidateProfileMessage() {
  els.candidateProfileMessage.textContent = "";
  els.candidateProfileMessage.classList.add("hidden");
}

function renderCandidateProfile(profile) {
  if (!profile) {
    els.candidateCvNote.textContent = "No master CV loaded yet. Upload a PDF or text file to create one.";
    els.candidateCvNote.dataset.type = "";
    els.candidateProfileText.value = "";
    return;
  }
  const updated = new Date(profile.updatedAt).toLocaleString();
  els.candidateCvNote.textContent = `${profile.fileName} • ${Math.max(1, Math.round(profile.fileSize / 1024))} KB • updated ${updated}`;
  els.candidateCvNote.dataset.type = "success";
  els.candidateProfileText.value = profile.text || "";
}

async function openCandidateProfile() {
  els.candidateProfileModal.classList.remove("hidden");
  els.candidateProfileBackdrop.classList.remove("hidden");
  hideCandidateProfileMessage();
  setCandidateProfileMessage("Loading your saved candidate profile…");
  try {
    const payload = await apiRequest("/api/candidate-profile");
    renderCandidateProfile(payload.profile);
    hideCandidateProfileMessage();
  } catch (error) {
    setCandidateProfileMessage(error.message || "The candidate profile could not be loaded.", "error");
  }
}

function closeCandidateProfile() {
  els.candidateProfileModal.classList.add("hidden");
  els.candidateProfileBackdrop.classList.add("hidden");
}

async function uploadCandidateCv() {
  const [file] = els.candidateCvFile.files;
  if (!file) {
    setCandidateProfileMessage("Choose a PDF or text CV first.", "warning");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setCandidateProfileMessage("CV file must be 10 MB or smaller.", "warning");
    return;
  }

  els.uploadCandidateCvBtn.disabled = true;
  els.uploadCandidateCvBtn.textContent = "Extracting…";
  setCandidateProfileMessage("Uploading the private CV and extracting editable text…");
  try {
    const headers = await authHeaders(false);
    if (!headers) throw new Error("Your login session expired. Please sign in again, then retry.");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/candidate-profile", { method: "POST", headers, body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Upload failed: ${response.status}`);
    renderCandidateProfile(payload.profile);
    els.candidateCvFile.value = "";
    setCandidateProfileMessage("CV uploaded and extracted. Review the text below; edit it if needed, then save.", "success");
    resetAgentAnalysis();
  } catch (error) {
    setCandidateProfileMessage(error.message || "The CV could not be uploaded.", "error");
  } finally {
    els.uploadCandidateCvBtn.disabled = false;
    els.uploadCandidateCvBtn.textContent = "Upload & extract";
  }
}

async function saveCandidateProfile(event) {
  event.preventDefault();
  const text = els.candidateProfileText.value.trim();
  if (text.length < 80) {
    setCandidateProfileMessage("Keep at least 80 characters of CV evidence before saving.", "warning");
    return;
  }

  els.saveCandidateProfileBtn.disabled = true;
  els.saveCandidateProfileBtn.textContent = "Saving…";
  setCandidateProfileMessage("Saving the latest editable CV profile…");
  try {
    const payload = await apiRequest("/api/candidate-profile", {
      method: "PUT",
      body: JSON.stringify({ text }),
    });
    renderCandidateProfile(payload.profile);
    setCandidateProfileMessage("Candidate profile saved. New AI match analyses will use this version.", "success");
    resetAgentAnalysis();
  } catch (error) {
    setCandidateProfileMessage(error.message || "The candidate profile could not be saved.", "error");
  } finally {
    els.saveCandidateProfileBtn.disabled = false;
    els.saveCandidateProfileBtn.textContent = "Save profile";
  }
}

function setUrlImportNote(message, type = "info") {
  if (!els.urlImportNote) return;
  els.urlImportNote.textContent = message;
  els.urlImportNote.dataset.type = type;
}

function isBrowserImporterReady() {
  return document.documentElement.dataset.jobtrackImporter === "ready";
}

function isExtensionSourceUrl(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return (
      hostname === "seek.co.nz" ||
      hostname.endsWith(".seek.co.nz") ||
      hostname === "seek.com" ||
      hostname.endsWith(".seek.com") ||
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com")
    );
  } catch {
    return false;
  }
}

function requestBrowserImporter(url) {
  if (!isBrowserImporterReady()) {
    return Promise.reject(
      new Error("SEEK or LinkedIn blocked direct import. Install the optional JobTrack browser helper, reload this page, and retry."),
    );
  }

  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      reject(new Error("The browser helper timed out while opening the job page."));
    }, 35_000);

    function handleResponse(event) {
      if (event.source !== window || event.origin !== location.origin) return;
      const message = event.data;
      if (
        message?.source !== "jobtrack-extension" ||
        message.type !== "JOBTRACK_IMPORT_RESPONSE" ||
        message.requestId !== requestId
      ) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleResponse);
      if (message.ok && message.job) resolve(message.job);
      else reject(new Error(message.error || "The browser helper could not import this job."));
    }

    window.addEventListener("message", handleResponse);
    window.postMessage(
      { source: "jobtrack", type: "JOBTRACK_IMPORT_REQUEST", requestId, url },
      location.origin,
    );
  });
}

function applyImportedJob(job, linkInput) {
  resetAgentAnalysis();
  if (job.finalUrl) linkInput.value = job.finalUrl;
  if (job.company) document.querySelector("#company").value = job.company;
  if (job.title) document.querySelector("#role").value = job.title;
  if (job.jobDescription) document.querySelector("#jobDescription").value = job.jobDescription;
  if (CATEGORIES.includes(job.category)) document.querySelector("#category").value = job.category;
  if (SOURCES.includes(job.source)) document.querySelector("#source").value = job.source;

  const imported = [
    job.company && "company",
    job.title && "title",
    job.jobDescription && "job description",
    job.category && "category",
  ].filter(Boolean);
  const missing = [
    !job.company && "company",
    !job.title && "title",
    !job.jobDescription && "job description",
  ].filter(Boolean);

  if (missing.length) {
    setUrlImportNote(
      `Imported ${imported.join(", ")}. Could not detect ${missing.join(", ")}; please enter it manually. Review everything before saving.`,
      "warning",
    );
  } else {
    const via = job.source === "SEEK" || job.source === "LinkedIn" ? ` from ${job.source}` : "";
    setUrlImportNote(`Imported ${imported.join(", ")}${via}. Review the details before saving.`, "success");
  }
}

async function importJobUrl() {
  const linkInput = document.querySelector("#link");
  const url = linkInput.value.trim();
  if (!url) {
    setUrlImportNote("Paste a job URL first.", "warning");
    linkInput.focus();
    return;
  }

  els.importJobUrlBtn.disabled = true;
  els.importJobUrlBtn.textContent = "Importing…";
  setUrlImportNote("Opening the page and extracting job details…");

  try {
    let job;
    try {
      const response = await apiRequest("/api/job-import", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      job = response.job;
    } catch (serverError) {
      if (!isExtensionSourceUrl(url)) throw serverError;
      setUrlImportNote("Direct import was blocked. Using the signed-in browser helper…");
      job = await requestBrowserImporter(url);
    }

    applyImportedJob(job, linkInput);
  } catch (error) {
    setUrlImportNote(error.message || "The job page could not be imported.", "error");
  } finally {
    els.importJobUrlBtn.disabled = false;
    els.importJobUrlBtn.textContent = "Import details";
  }
}

function resetAgentAnalysis() {
  els.agentResult.classList.add("hidden");
  hideAgentStatus();
}

function showAgentStatus(message, type = "info") {
  els.agentStatus.textContent = message;
  els.agentStatus.dataset.type = type;
  els.agentStatus.classList.remove("hidden");
}

function hideAgentStatus() {
  els.agentStatus.classList.add("hidden");
  els.agentStatus.textContent = "";
}

function appendAgentListItem(list, title, body, badge = "") {
  const item = document.createElement("li");
  const heading = document.createElement("div");
  heading.className = "agent-list-heading";

  const strong = document.createElement("strong");
  strong.textContent = title;
  heading.append(strong);

  if (badge) {
    const tag = document.createElement("span");
    tag.className = `severity severity-${badge}`;
    tag.textContent = badge;
    heading.append(tag);
  }

  item.append(heading);
  if (body) {
    const paragraph = document.createElement("p");
    paragraph.textContent = body;
    item.append(paragraph);
  }
  list.append(item);
}

function renderSimpleAgentList(list, values) {
  list.replaceChildren();
  (values || []).forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  });
}

function renderAgentReport(payload) {
  const report = payload.report;
  if (!report) throw new Error("The agent returned no structured report.");

  const recommendationLabels = {
    strong_apply: "Strong apply",
    apply: "Apply",
    stretch: "Stretch",
    skip: "Skip",
  };

  els.agentScore.textContent = `${report.fitScore}%`;
  els.agentRecommendation.textContent = recommendationLabels[report.recommendation] || report.recommendation;
  els.agentRecommendation.dataset.level = report.recommendation;
  els.agentSummary.textContent = report.summary;
  els.agentCoverLetter.textContent = report.coverLetterAngle;

  els.agentStrengths.replaceChildren();
  (report.strengths || []).forEach((item) =>
    appendAgentListItem(els.agentStrengths, item.requirement, item.evidence),
  );

  els.agentGaps.replaceChildren();
  (report.gaps || []).forEach((item) =>
    appendAgentListItem(els.agentGaps, item.requirement, item.mitigation, item.severity),
  );

  renderSimpleAgentList(els.agentQuestions, report.interviewQuestions);
  renderSimpleAgentList(els.agentActions, report.nextActions);

  els.agentTrace.replaceChildren();
  (payload.trace || []).forEach((entry) => {
    const item = document.createElement("li");
    const labels = {
      retrieveCandidateEvidence: "Retrieved verified CV evidence",
      assessRequirementGaps: "Assessed requirement gaps",
    };
    item.textContent = `Step ${entry.step}: ${labels[entry.tool] || entry.tool} — ${entry.status}`;
    els.agentTrace.append(item);
  });
  const cvLabel = payload.candidateProfile?.fileName ? ` • CV: ${payload.candidateProfile.fileName}` : "";
  els.agentModel.textContent = `Model: ${payload.model || "configured server model"}${cvLabel}`;
  els.agentResult.classList.remove("hidden");
}

async function analyseJobMatch() {
  const company = document.querySelector("#company").value.trim();
  const role = document.querySelector("#role").value.trim();
  const jobDescription = document.querySelector("#jobDescription").value.trim();
  if (!company || !role) {
    showAgentStatus("Enter the company and role before analysing the match.", "warning");
    return;
  }
  if (jobDescription.length < 80) {
    showAgentStatus("Paste at least 80 characters of the job description so the agent has enough evidence to assess.", "warning");
    return;
  }

  els.agentSubmitBtn.disabled = true;
  els.agentSubmitBtn.textContent = "Agent working…";
  els.agentResult.classList.add("hidden");
  showAgentStatus("Retrieving CV evidence, assessing requirements, and preparing a structured recommendation…");

  try {
    const payload = await apiRequest("/api/job-match", {
      method: "POST",
      body: JSON.stringify({
        company,
        role,
        jobDescription,
      }),
    });
    renderAgentReport(payload);
    hideAgentStatus();
    els.agentResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    showAgentStatus(error.message || "The match analysis failed. Please try again.", "error");
  } finally {
    els.agentSubmitBtn.disabled = false;
    els.agentSubmitBtn.textContent = "Analyse match";
  }
}

document.querySelector("#openFormBtn").addEventListener("click", () => openDrawer());
els.importJobUrlBtn.addEventListener("click", importJobUrl);
els.loginForm.addEventListener("submit", sendLoginLink);
document.querySelector("#openCandidateProfileBtn").addEventListener("click", openCandidateProfile);
document.querySelector("#closeCandidateProfileBtn").addEventListener("click", closeCandidateProfile);
document.querySelector("#cancelCandidateProfileBtn").addEventListener("click", closeCandidateProfile);
els.candidateProfileBackdrop.addEventListener("click", closeCandidateProfile);
els.uploadCandidateCvBtn.addEventListener("click", uploadCandidateCv);
els.candidateProfileForm.addEventListener("submit", saveCandidateProfile);
els.agentSubmitBtn.addEventListener("click", analyseJobMatch);
["company", "role", "jobDescription"].forEach((field) => {
  document.querySelector(`#${field}`).addEventListener("input", () => {
    if (els.agentResult.classList.contains("hidden")) return;
    els.agentResult.classList.add("hidden");
    showAgentStatus("Role details changed. Analyse again to refresh the recommendation.", "warning");
  });
});
els.signUpBtn.addEventListener("click", signUp);
document.querySelector("#signOutBtn").addEventListener("click", signOut);
document.querySelector("#closeFormBtn").addEventListener("click", closeDrawer);
els.drawerBackdrop.addEventListener("click", closeDrawer);
els.form.addEventListener("submit", upsertApplication);
els.deleteBtn.addEventListener("click", deleteCurrent);
document.querySelector("#closeDetailsBtn").addEventListener("click", closeDetails);
els.detailsBackdrop.addEventListener("click", closeDetails);
els.detailsCv.addEventListener("click", (event) => {
  const button = event.target.closest("[data-download-cv]");
  if (button) downloadCvFile(button.dataset.downloadCv);
});
els.detailsClFile.addEventListener("click", (event) => {
  const button = event.target.closest("[data-download-cl]");
  if (button) downloadClFile(button.dataset.downloadCl);
});
document.querySelector("#openSyncBtn").addEventListener("click", openSyncModal);
document.querySelector("#closeSyncBtn").addEventListener("click", closeSyncModal);
document.querySelector("#clearSyncBtn").addEventListener("click", clearSyncSettings);
els.syncBackdrop.addEventListener("click", closeSyncModal);
els.syncForm.addEventListener("submit", saveSyncSettings);
document.querySelector("#exportBtn").addEventListener("click", exportData);
els.resetFiltersBtn.addEventListener("click", resetFilters);
els.adminRefreshBtn?.addEventListener("click", loadAdminUsers);
els.adminUserSelect?.addEventListener("change", (event) => {
  viewAdminUser(event.target.value);
});
els.adminUserList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-user-id]");
  if (button) viewAdminUser(button.dataset.userId);
});
els.adminCreateUserForm?.addEventListener("submit", createAdminUser);
document.querySelector("#importInput").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importData(file);
});

window.addEventListener("hashchange", restoreNavFromHash);
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    els.navDropdown.open = false;
  });
});

[els.statusFilter, els.sourceFilter, els.categoryFilter, els.followFilter, els.searchInput].forEach((input) => {
  input.addEventListener("input", renderRows);
  input.addEventListener("change", renderRows);
});

els.rows.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    const app = applications.find((item) => item.id === viewButton.dataset.view);
    if (app) openDetails(app);
    return;
  }
  const button = event.target.closest("[data-edit]");
  if (!button) return;
  const app = applications.find((item) => item.id === button.dataset.edit);
  if (app) openDrawer(app);
});

renderFilters();
renderAll();
restoreNavFromHash();
initSupabase();
registerServiceWorker();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
