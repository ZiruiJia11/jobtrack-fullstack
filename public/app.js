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

const SOURCES = ["Company Website", "LinkedIn", "Referral", "Recruiter", "Indeed", "Email", "Other"];
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
const RUNTIME_CONFIG = window.JOBTRACK_CONFIG || {};
const LOGIN_EMAIL = RUNTIME_CONFIG.loginEmail || "steven5115115@gmail.com";
const DEFAULT_SUPABASE_CONFIG = {
  url: RUNTIME_CONFIG.supabaseUrl || "https://pexthgxqandoeesqbelb.supabase.co",
  anonKey: RUNTIME_CONFIG.supabaseAnonKey || "",
};

const sampleApplications = [
  sample("Canva", "Product Designer", "Data AI", "Interview", "Company Website", "2026-06-08", "2026-06-24"),
  sample("Xero", "Frontend Developer", "Frontend", "Applied", "LinkedIn", "2026-06-15", "2026-06-25"),
  sample("Atlassian", "Software Engineer", "Backend", "Final", "Referral", "2026-05-28", "2026-06-23"),
  sample("Shopify", "Developer", "Other", "Rejected", "Company Website", "2026-05-18", ""),
  sample("Datadog", "Product Analyst", "Data AI", "Screening", "Recruiter", "2026-06-01", "2026-06-27"),
];

let applications = loadApplications();
let supabaseConfig = loadSupabaseConfig() || DEFAULT_SUPABASE_CONFIG;
let supabaseClient = null;
let currentUser = null;
let isSyncing = false;

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginNote: document.querySelector("#loginNote"),
  userChip: document.querySelector("#userChip"),
  rows: document.querySelector("#applicationRows"),
  resultCount: document.querySelector("#resultCount"),
  quickStats: document.querySelector("#quickStats"),
  statusFilter: document.querySelector("#statusFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  followFilter: document.querySelector("#followFilter"),
  searchInput: document.querySelector("#searchInput"),
  avgProbability: document.querySelector("#avgProbability"),
  probabilityNote: document.querySelector("#probabilityNote"),
  statusChart: document.querySelector("#statusChart"),
  dueList: document.querySelector("#dueList"),
  dueCount: document.querySelector("#dueCount"),
  timelineChart: document.querySelector("#timelineChart"),
  drawer: document.querySelector("#drawer"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  form: document.querySelector("#applicationForm"),
  drawerTitle: document.querySelector("#drawerTitle"),
  deleteBtn: document.querySelector("#deleteBtn"),
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
  interviewCount: document.querySelector("#interviewCount"),
  staleCount: document.querySelector("#staleCount"),
  staleList: document.querySelector("#staleList"),
  syncStatus: document.querySelector("#syncStatus"),
  syncModal: document.querySelector("#syncModal"),
  syncBackdrop: document.querySelector("#syncBackdrop"),
  syncForm: document.querySelector("#syncForm"),
  supabaseUrl: document.querySelector("#supabaseUrl"),
  supabaseAnonKey: document.querySelector("#supabaseAnonKey"),
  syncEmail: document.querySelector("#syncEmail"),
  syncFormNote: document.querySelector("#syncFormNote"),
};

function sample(company, role, category, status, source, appliedDate, followUpDate) {
  return normalizeApplication({
    id: crypto.randomUUID(),
    company,
    role,
    link: "https://example.com/jobs",
    source,
    category,
    jobType: "Full-time",
    appliedDate,
    followUpDate,
    screenDate: status === "Applied" || status === "Rejected" ? "" : "2026-06-12",
    interviewDate: ["Interview", "Final"].includes(status) ? "2026-06-20" : "",
    finalDate: status === "Final" ? "2026-06-22" : "",
    decisionDate: status === "Rejected" ? "2026-06-03" : "",
    status,
    jobDescription: `${role} role with responsibilities worth saving for interview prep.`,
    coverLetter: status === "Final" ? "Thank you for the conversation. I enjoyed learning more about the team." : "",
    notes: "Example row. Replace it with your real application.",
  });
}

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
  };
}

function normalizeApplications(items) {
  return (items || []).map(normalizeApplication);
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

function loadApplications() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    return normalizeApplications(JSON.parse(current || legacy) || sampleApplications);
  } catch {
    return normalizeApplications(sampleApplications);
  }
}

function saveApplications({ skipCloud = false } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  if (!skipCloud) syncAllToBackend();
}

function loadSupabaseConfig() {
  try {
    return JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY));
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

  const historicalClosed = applications.filter((item) => ["Offer", "Rejected", "Withdrawn"].includes(item.status));
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

  return applications.filter((app) => {
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
          <td>
            <div class="row-actions">
              <button class="edit-btn" type="button" data-view="${app.id}">View</button>
              <button class="edit-btn" type="button" data-edit="${app.id}">Edit</button>
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
  const open = applications.filter((app) => !["Offer", "Rejected", "Withdrawn"].includes(app.status)).length;
  const interviews = applications.filter((app) => ["Interview", "Take-home", "Final"].includes(app.status)).length;
  const offers = applications.filter((app) => app.status === "Offer").length;
  const rejected = applications.filter((app) => app.status === "Rejected").length;
  const stale = staleApplications();
  const dueNow = applications.filter((app) => {
    const days = daysUntil(app.followUpDate);
    return days !== null && days <= 0 && !["Offer", "Rejected", "Withdrawn"].includes(app.status);
  }).length;
  els.quickStats.innerHTML = `
    <div class="stat-row"><span>Total</span><strong>${applications.length}</strong></div>
    <div class="stat-row"><span>Open</span><strong>${open}</strong></div>
    <div class="stat-row"><span>Interviews</span><strong>${interviews}</strong></div>
    <div class="stat-row"><span>Offers</span><strong>${offers}</strong></div>
    <div class="stat-row"><span>Rejected</span><strong>${rejected}</strong></div>
  `;
  if (els.attentionCount) els.attentionCount.textContent = `${stale.length + dueNow}`;
  if (els.activeCount) els.activeCount.textContent = `${open}`;
  if (els.interviewCount) els.interviewCount.textContent = `${interviews}`;

  const active = applications.filter((app) => !["Offer", "Rejected", "Withdrawn"].includes(app.status));
  const avg = active.length ? Math.round(active.reduce((sum, app) => sum + probabilityFor(app), 0) / active.length) : 0;
  els.avgProbability.textContent = `${avg}%`;
  els.probabilityNote.textContent = active.length
    ? `Average across ${active.length} active applications.`
    : "Add applications to start estimating.";
}

function renderStatusChart() {
  const counts = STATUSES.map((status) => ({
    status,
    count: applications.filter((app) => app.status === status).length,
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

function renderDueList() {
  const due = applications
    .filter((app) => {
      const days = daysUntil(app.followUpDate);
      return days !== null && days <= 7 && !["Offer", "Rejected", "Withdrawn"].includes(app.status);
    })
    .sort((a, b) => (a.followUpDate || "").localeCompare(b.followUpDate || ""))
    .slice(0, 6);
  els.dueCount.textContent = `${due.length}`;
  els.dueList.innerHTML =
    due.length === 0
      ? `<li class="muted">No follow-ups due in the next 7 days.</li>`
      : due
          .map(
            (app) => `
            <li>
              <span>${escapeHtml(app.company)} - ${escapeHtml(app.role)}</span>
              <span class="due-date">${formatDate(app.followUpDate)}</span>
            </li>
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
  return applications
    .filter(isStaleApplication)
    .sort((a, b) => daysBetween(b.appliedDate) - daysBetween(a.appliedDate));
}

function renderStaleList() {
  if (!els.staleList || !els.staleCount) return;
  const allStale = staleApplications();
  const stale = allStale.slice(0, 6);
  els.staleCount.textContent = `${allStale.length}`;
  els.staleList.innerHTML =
    stale.length === 0
      ? `<li class="muted">No applications have gone quiet for 30+ days.</li>`
      : stale
          .map((app) => {
            const age = daysBetween(app.appliedDate);
            return `
              <li>
                <span>${escapeHtml(app.company)} - ${escapeHtml(app.role)}<small>${age} days since applied</small></span>
                <button class="text-button" type="button" data-edit="${app.id}">Plan follow-up</button>
              </li>
            `;
          })
          .join("");
}

function renderTimeline() {
  const buckets = new Map();
  applications.forEach((app) => {
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
  renderDueList();
  renderStaleList();
  renderTimeline();
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
  if (!headers) throw new Error("Please sign in first.");
  const formData = new FormData();
  formData.append("appId", appId);
  formData.append("file", file);
  formData.append("previousPath", previousPath);

  const response = await fetch("/api/cv", {
    method: "POST",
    headers,
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
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
  const blob = new Blob([JSON.stringify(applications, null, 2)], { type: "application/json" });
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

function createSupabaseClient() {
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey || !window.supabase) return null;
  return window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
}

async function initSupabase() {
  supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    updateSyncStatus("Backend env missing");
    setAuthView(false);
    return;
  }

  updateSyncStatus("Backend configured");
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  if (currentUser) {
    setAuthView(true);
    updateSyncStatus(`Signed in: ${currentUser.email || "anonymous user"}`);
    await loadFromBackend();
    await syncAllToBackend();
  } else {
    setAuthView(false);
    updateSyncStatus("Sign in to sync.");
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    setAuthView(Boolean(currentUser));
    if (currentUser) {
      updateSyncStatus(`Signed in: ${currentUser.email || "anonymous user"}`);
      await loadFromBackend();
      await syncAllToBackend();
    } else {
      updateSyncStatus("Signed out");
    }
  });
}

function setAuthView(isSignedIn) {
  els.loginScreen.classList.toggle("hidden", isSignedIn);
  els.appShell.classList.toggle("app-locked", !isSignedIn);
  els.userChip.textContent = currentUser?.email || "Not signed in";
}

function updateSyncStatus(message) {
  els.syncStatus.textContent = message;
}

async function authHeaders(includeJson = true) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) return null;
  const headers = {
    Authorization: `Bearer ${data.session.access_token}`,
  };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

async function apiRequest(path, options = {}) {
  const headers = await authHeaders();
  if (!headers) throw new Error("Please sign in first.");
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

async function loadFromBackend() {
  if (!supabaseClient || !currentUser) return;
  updateSyncStatus("Loading backend data...");
  let data;
  try {
    data = await apiRequest("/api/applications");
  } catch (error) {
    updateSyncStatus(`Sync error: ${error.message}`);
    return;
  }

  const cloudApps = normalizeApplications(
    (data.applications || []).map((row) => ({
      id: row.id,
      ...row,
      ...row.payload,
    })),
  );
  applications = mergeApplications(applications, cloudApps);
  saveApplications({ skipCloud: true });
  updateSyncStatus(`Synced ${applications.length} apps`);
  renderAll();
}

function mergeApplications(localApps, cloudApps) {
  const map = new Map();
  [...cloudApps, ...localApps].forEach((app) => {
    const existing = map.get(app.id);
    if (!existing || String(app.updatedAt || "") >= String(existing.updatedAt || "")) {
      map.set(app.id, app);
    }
  });
  return [...map.values()];
}

async function syncAllToBackend() {
  if (isSyncing || !supabaseClient || !currentUser) return;
  isSyncing = true;
  try {
    await apiRequest("/api/applications", {
      method: "POST",
      body: JSON.stringify({ applications }),
    });
    updateSyncStatus(`Synced ${applications.length} apps`);
  } catch (error) {
    updateSyncStatus(`Sync error: ${error.message}`);
  }
  isSyncing = false;
}

async function deleteFromCloud(id) {
  if (!supabaseClient || !currentUser) return;
  try {
    await apiRequest(`/api/applications?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    updateSyncStatus(`Delete sync error: ${error.message}`);
  }
}

async function downloadCvFile(appId) {
  const app = applications.find((item) => item.id === appId);
  if (!app?.cvStoragePath) return;
  try {
    const data = await apiRequest(
      `/api/cv?path=${encodeURIComponent(app.cvStoragePath)}&name=${encodeURIComponent(app.cvFileName || "cv")}`,
    );
    window.location.href = data.signedUrl;
  } catch (error) {
    alert(`Could not download CV: ${error.message}`);
  }
}

async function downloadClFile(appId) {
  const app = applications.find((item) => item.id === appId);
  if (!app?.clStoragePath) return;
  try {
    const data = await apiRequest(
      `/api/cv?path=${encodeURIComponent(app.clStoragePath)}&name=${encodeURIComponent(app.clFileName || "cover-letter")}`,
    );
    window.location.href = data.signedUrl;
  } catch (error) {
    alert(`Could not download cover letter file: ${error.message}`);
  }
}

async function deleteCvFile(path) {
  if (!path || !supabaseClient || !currentUser) return;
  try {
    await apiRequest(`/api/cv?path=${encodeURIComponent(path)}`, { method: "DELETE" });
  } catch (error) {
    updateSyncStatus(`CV delete error: ${error.message}`);
  }
}

function openSyncModal() {
  els.supabaseUrl.value = supabaseConfig?.url || "";
  els.supabaseAnonKey.value = supabaseConfig?.anonKey || "";
  els.syncEmail.value = LOGIN_EMAIL;
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
  supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    updateSyncStatus("Backend env missing");
    return;
  }
  els.syncFormNote.textContent = `Connection ready for ${LOGIN_EMAIL}.`;
  els.syncFormNote.classList.remove("warning");
  updateSyncStatus("Backend connection refreshed.");
}

async function sendLoginLink(event) {
  event.preventDefault();
  if (!supabaseClient) {
    els.loginNote.textContent = "Supabase is not configured. Open sync setup first.";
    els.loginNote.classList.add("warning");
    return;
  }
  const email = LOGIN_EMAIL;
  const password = els.loginPassword.value;
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

async function signOut() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
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

document.querySelector("#openFormBtn").addEventListener("click", () => openDrawer());
els.loginForm.addEventListener("submit", sendLoginLink);
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
if (els.staleList) {
  els.staleList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit]");
    if (!button) return;
    const app = applications.find((item) => item.id === button.dataset.edit);
    if (app) openDrawer(app);
  });
}
document.querySelector("#openSyncBtn").addEventListener("click", openSyncModal);
document.querySelector("#closeSyncBtn").addEventListener("click", closeSyncModal);
document.querySelector("#clearSyncBtn").addEventListener("click", clearSyncSettings);
els.syncBackdrop.addEventListener("click", closeSyncModal);
els.syncForm.addEventListener("submit", saveSyncSettings);
document.querySelector("#exportBtn").addEventListener("click", exportData);
document.querySelector("#seedBtn").addEventListener("click", () => {
  applications = sampleApplications.map((app) => normalizeApplication({ ...app, id: crypto.randomUUID() }));
  saveApplications();
  renderAll();
});
document.querySelector("#importInput").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importData(file);
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
initSupabase();
