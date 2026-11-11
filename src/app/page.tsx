import Script from "next/script";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

const pageMarkup = String.raw`
  <section class="login-screen" id="loginScreen">
    <div class="login-card">
      <div class="brand login-brand">
        <div class="brand-mark">J</div>
        <span>JobTrack</span>
      </div>
      <h1>Sign in to your tracker</h1>
      <p>Use your email and password. Each account gets its own private application tracker.</p>
      <form id="loginForm" class="login-form">
        <label>Email<input id="loginEmail" type="email" placeholder="you@example.com" autocomplete="email" required /></label>
        <label>Password<input id="loginPassword" type="password" placeholder="Enter app password" required /></label>
        <div class="login-actions">
          <button class="primary" type="submit">Sign in</button>
          <button class="secondary" id="signUpBtn" type="button">Create account</button>
        </div>
      </form>
      <div class="file-note" id="loginNote">New users can create an account. Admin access is controlled by server settings.</div>
      <section class="demo-login" aria-label="Showcase account">
        <div class="demo-login-title"><strong>Explore the showcase</strong><span class="demo-tag">Demo</span></div>
        <p>A shared workspace with fictional jobs and a sample CV.</p>
        <button class="secondary full" id="demoLoginBtn" type="button">Try the demo</button>
        <details class="demo-credentials"><summary>Demo login details</summary><dl><dt>Email</dt><dd id="demoEmail"></dd><dt>Password</dt><dd id="demoPassword"></dd></dl></details>
      </section>
    </div>
  </section>

  <div class="app-shell app-locked" id="appShell">
    <aside class="sidebar" aria-label="App navigation">
      <div class="brand">
        <div class="brand-mark">J</div>
        <span>JobTrack</span>
      </div>
      <details class="nav-dropdown" id="navDropdown">
        <summary>
          <span id="navMenuLabel">Applications</span>
          <span class="nav-chevron" aria-hidden="true"></span>
        </summary>
        <div class="nav-dropdown-panel">
          <nav class="nav-list">
            <a class="nav-item active" href="#applications" data-nav="applications">Applications</a>
            <a class="nav-item" href="#analytics" data-nav="analytics">Analytics</a>
            <a class="nav-item hidden" href="#admin" data-nav="admin" id="adminNav">Admin</a>
          </nav>
          <div class="quick-stats" id="quickStats"></div>
          <div class="sync-card">
            <div class="sync-title">Cloud sync</div>
            <div id="syncStatus">Not connected</div>
          </div>
          <button class="secondary full" id="openCandidateProfileBtn" type="button">Candidate CV profile</button>
        </div>
      </details>
    </aside>

    <main class="main" id="mainContent">
      <header class="topbar">
        <div>
          <span class="eyebrow" id="pageEyebrow">Application records</span>
          <h1 id="pageTitle">Applications</h1>
          <p id="pageDescription">Review, filter, and update every role you are tracking.</p>
        </div>
        <div class="topbar-actions">
          <details class="account-menu" id="accountMenu">
            <summary aria-label="Account menu"><span class="user-chip" id="userChip">Not signed in</span><span class="nav-chevron" aria-hidden="true"></span></summary>
            <div class="account-menu-panel" role="menu">
              <label class="menu-item" role="menuitem">
                Import from JSON
                <input id="importInput" type="file" accept="application/json" hidden />
              </label>
              <button class="menu-item" id="exportBtn" type="button" role="menuitem">Export data</button>
              <button class="menu-item hidden" id="openSyncBtn" type="button" role="menuitem">Connection info</button>
              <button class="menu-item menu-item-danger" id="signOutBtn" type="button" role="menuitem">Sign out</button>
            </div>
          </details>
          <button class="primary" id="openFormBtn" type="button">+ Add application</button>
        </div>
      </header>

      <section class="demo-banner hidden" id="demoBanner" aria-label="Demo workspace">
        <div><strong>Demo workspace</strong><p>Fictional data in a shared account. Please use sample information only.</p></div>
        <button class="secondary" id="openDemoSampleBtn" type="button">View sample match</button>
      </section>
      <section class="page-view" data-page="applications" id="applicationsPage">
        <section class="action-board" aria-label="Application action summary">
          <div class="action-card action-card-primary">
            <div>
              <span class="action-label">Needs attention</span>
              <strong id="attentionCount">0</strong>
            </div>
            <p>Follow-ups due now or applications quiet for 30+ days.</p>
          </div>
          <div class="action-card">
            <span class="action-label">Tracked applications</span>
            <strong id="activeCount">0</strong>
            <p id="activeSummary">Applications saved in JobTrack.</p>
          </div>
          <div class="action-card">
            <span class="action-label">Interview motion</span>
            <strong id="interviewCount">0</strong>
            <p>Screening, interview, take-home, or final.</p>
          </div>
        </section>
        <section class="toolbar" aria-label="Filters">
          <label>Status<select id="statusFilter"><option value="all">All statuses</option></select></label>
          <label>Source<select id="sourceFilter"><option value="all">All sources</option></select></label>
          <label>Category<select id="categoryFilter"><option value="all">All categories</option></select></label>
          <label>
            Follow-up
            <select id="followFilter">
              <option value="all">All dates</option>
              <option value="due">Due now</option>
              <option value="week">Next 7 days</option>
              <option value="stale">30+ days quiet</option>
              <option value="none">No follow-up</option>
            </select>
          </label>
          <label class="search-field">Search<input id="searchInput" type="search" placeholder="Company, role, notes..." /></label>
          <button class="secondary compact" id="resetFiltersBtn" type="button">Reset</button>
        </section>

        <section class="table-panel" id="applications">
          <div class="panel-head">
            <h2>Application pipeline</h2>
            <div class="panel-head-actions">
              <span id="resultCount"></span>
              <div class="view-toggle" role="group" aria-label="Pipeline view">
                <button type="button" class="view-toggle-btn active" data-view-mode="table" aria-pressed="true">Table</button>
                <button type="button" class="view-toggle-btn" data-view-mode="board" aria-pressed="false">Board</button>
              </div>
            </div>
          </div>
          <div class="board hidden" id="boardView" aria-label="Applications board"></div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Actions</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Category</th>
                  <th>Link</th>
                  <th>Applied</th>
                  <th>Follow-up</th>
                  <th>Status</th>
                  <th>JD</th>
                  <th>Materials</th>
                  <th>Probability</th>
                </tr>
              </thead>
              <tbody id="applicationRows"></tbody>
            </table>
          </div>
        </section>
      </section>

      <section class="page-view hidden" data-page="analytics" id="analyticsPage">
        <div class="analytics-grid" id="analytics">
          <section class="card probability-card">
            <div class="card-title">Success probability</div>
            <div class="probability-number" id="avgProbability">0%</div>
            <p id="probabilityNote">Add applications to start estimating.</p>
          </section>
          <section class="card">
            <div class="card-title">Applications by status</div>
            <div class="status-chart" id="statusChart"></div>
          </section>
          <section class="card analytics-wide">
            <div class="card-title">Application pace</div>
            <div class="mini-chart" id="timelineChart" aria-label="Applications over time"></div>
            <p class="muted">Applications submitted by month. Use it to see whether your weekly search rhythm is staying steady.</p>
          </section>
        </div>
      </section>

      <section class="page-view hidden" data-page="admin" id="adminPage">
        <section class="admin-panel hidden" id="adminPanel" aria-label="Admin user management">
          <div>
            <span class="eyebrow">Admin</span>
            <h2>User data console</h2>
            <p class="muted" id="adminViewingNote">View a user's application records without mixing their data with yours.</p>
          </div>
          <div class="admin-controls">
            <label>User<select id="adminUserSelect"></select></label>
            <button class="secondary compact" id="adminRefreshBtn" type="button">Refresh users</button>
          </div>
          <form class="admin-create-form" id="adminCreateUserForm">
            <label>New user email<input id="adminNewUserEmail" type="email" placeholder="newuser@example.com" /></label>
            <label>Temporary password<input id="adminNewUserPassword" type="password" placeholder="At least 6 characters" /></label>
            <button class="primary compact" type="submit">Create user</button>
            <div class="file-note" id="adminCreateUserNote">Created users can sign in immediately with this password.</div>
          </form>
          <div class="admin-user-list" id="adminUserList"></div>
        </section>
      </section>
    </main>
  </div>

  <div class="drawer-backdrop hidden" id="drawerBackdrop"></div>
  <aside class="drawer application-modal hidden" aria-label="Add or edit application" id="drawer">
    <div class="drawer-head">
      <h2 id="drawerTitle">Add application</h2>
      <button class="icon-button" id="closeFormBtn" type="button" aria-label="Close">&times;</button>
    </div>
    <form id="applicationForm">
      <input id="recordId" type="hidden" />
      <div class="url-import-block form-full">
        <label>
          Job link
          <div class="url-import-row">
            <input id="link" type="url" placeholder="Paste a job URL to fill in the details" />
            <button class="secondary" id="importJobUrlBtn" type="button">Import details</button>
          </div>
        </label>
        <div class="file-note" id="urlImportNote">Paste a public job URL to fill company, role, JD, and category.</div>
      </div>
      <label>Company *<input id="company" required placeholder="e.g. Xero" /></label>
      <label>Role *<input id="role" required placeholder="e.g. Software Engineer" /></label>
      <div class="form-row-3 form-full">
        <label>Status<select id="status"></select></label>
        <label>Applied date<input id="appliedDate" type="date" /></label>
        <label>Follow-up date<input id="followUpDate" type="date" /></label>
      </div>
      <details class="form-section form-full" id="sectionDetails">
        <summary><span class="form-section-title">Details</span><span class="form-section-hint" id="sectionDetailsHint"></span></summary>
        <div class="form-section-body">
          <label>Source<select id="source"></select></label>
          <label>Category<select id="category"></select></label>
          <label>Job type<select id="jobType"></select></label>
          <details class="form-more form-full" id="stageDates">
            <summary>Stage dates <span class="muted">Filled in automatically when the status changes</span></summary>
            <div class="form-section-body">
              <label>Screen date<input id="screenDate" type="date" /></label>
              <label>Interview date<input id="interviewDate" type="date" /></label>
              <label>Final date<input id="finalDate" type="date" /></label>
              <label>Decision date<input id="decisionDate" type="date" /></label>
            </div>
          </details>
        </div>
      </details>
      <details class="form-section form-full" id="sectionJob">
        <summary><span class="form-section-title">Job description &amp; AI match</span><span class="form-section-hint" id="sectionJobHint"></span></summary>
        <div class="form-section-body">
          <label class="form-full">Job description<textarea id="jobDescription" rows="6" placeholder="Paste the JD here so you can review it later..."></textarea></label>
          <section class="agent-panel application-agent" aria-labelledby="agentTitle">
            <div class="agent-panel-head">
              <div>
                <span class="eyebrow">Analyse before recording</span>
                <h2 id="agentTitle">AI match check</h2>
                <p>Compare the company, role, and JD above with your verified CV evidence before saving this application.</p>
              </div>
              <span class="agent-badge">OpenAI + AI SDK</span>
            </div>
            <div class="agent-form-actions">
              <p class="muted">Analysis does not save or change this record. Review the result, then choose whether to save.</p>
              <div class="agent-action-buttons">
                <button class="secondary hidden" id="sampleMatchBtn" type="button">View sample analysis</button>
                <button class="secondary" id="agentSubmitBtn" type="button">Analyse match</button>
              </div>
            </div>
            <p class="file-note" id="agentUsage">Live AI: 2 analyses per account per day. Resets at midnight New Zealand time.</p>
            <div class="agent-status hidden" id="agentStatus" role="status" aria-live="polite"></div>
            <div class="agent-result hidden" id="agentResult" aria-live="polite">
              <div class="agent-score-card">
                <div>
                  <span class="action-label">Evidence-based fit</span>
                  <strong id="agentScore">—</strong>
                </div>
                <span class="agent-recommendation" id="agentRecommendation"></span>
              </div>
              <div class="agent-summary" id="agentSummary"></div>
              <div class="agent-result-grid">
                <section>
                  <h3>Verified strengths</h3>
                  <ul class="agent-list" id="agentStrengths"></ul>
                </section>
                <section>
                  <h3>Gaps and mitigations</h3>
                  <ul class="agent-list" id="agentGaps"></ul>
                </section>
                <section>
                  <h3>Likely interview questions</h3>
                  <ul class="agent-list" id="agentQuestions"></ul>
                </section>
                <section>
                  <h3>Next actions</h3>
                  <ul class="agent-list" id="agentActions"></ul>
                </section>
              </div>
              <section class="agent-angle">
                <h3>Cover-letter angle</h3>
                <p id="agentCoverLetter"></p>
              </section>
              <details class="agent-trace">
                <summary>Agent tool trace</summary>
                <ol id="agentTrace"></ol>
                <p class="muted" id="agentModel"></p>
              </details>
            </div>
          </section>
        </div>
      </details>
      <details class="form-section form-full" id="sectionDocs">
        <summary><span class="form-section-title">Documents &amp; notes</span><span class="form-section-hint" id="sectionDocsHint"></span></summary>
        <div class="form-section-body">
          <label class="form-full">CV file<input id="cvFile" type="file" accept=".pdf,.doc,.docx,.txt" /></label>
          <div class="file-note form-full" id="cvFileNote">No CV saved for this application.</div>
          <label class="form-full">Cover letter text<textarea id="coverLetter" rows="6" placeholder="Paste or draft your CL text here..."></textarea></label>
          <label class="form-full">Cover letter file<input id="clFile" type="file" accept=".pdf,.doc,.docx,.txt" /></label>
          <div class="file-note form-full" id="clFileNote">No cover letter file saved for this application.</div>
          <label class="form-full">Notes<textarea id="notes" rows="4" placeholder="Contact, salary range, next action..."></textarea></label>
        </div>
      </details>
      <div class="drawer-actions form-full">
        <button class="text-danger" id="deleteBtn" type="button">Delete</button>
        <div class="drawer-actions-main">
          <button class="secondary" id="cancelFormBtn" type="button">Cancel</button>
          <button class="primary" type="submit">Save</button>
        </div>
      </div>
    </form>
  </aside>

  <div class="modal-backdrop hidden" id="candidateProfileBackdrop"></div>
  <section class="details-modal candidate-profile-modal hidden" id="candidateProfileModal" aria-labelledby="candidateProfileTitle">
    <div class="drawer-head">
      <div>
        <span class="eyebrow">Evidence source for AI matching</span>
        <h2 id="candidateProfileTitle">Candidate CV profile</h2>
      </div>
      <button class="icon-button" id="closeCandidateProfileBtn" type="button" aria-label="Close">&times;</button>
    </div>
    <p class="muted candidate-profile-intro">Upload your master CV as a PDF or text file. JobTrack extracts the content into an editable profile, and every future AI match reads the latest saved version.</p>
    <div class="candidate-upload-row">
      <label>Master CV<input id="candidateCvFile" type="file" accept=".pdf,.txt,application/pdf,text/plain" /></label>
      <button class="secondary" id="uploadCandidateCvBtn" type="button">Upload &amp; extract</button>
    </div>
    <div class="file-note" id="candidateCvNote">No master CV loaded yet.</div>
    <form class="candidate-profile-form" id="candidateProfileForm">
      <label>
        Editable CV evidence
        <textarea id="candidateProfileText" rows="18" minlength="80" maxlength="50000" required placeholder="Upload a CV to extract its text, then review and edit it here..."></textarea>
      </label>
      <div class="agent-status hidden" id="candidateProfileMessage" role="status" aria-live="polite"></div>
      <div class="drawer-actions">
        <button class="secondary" id="cancelCandidateProfileBtn" type="button">Close</button>
        <button class="primary" id="saveCandidateProfileBtn" type="submit">Save profile</button>
      </div>
    </form>
  </section>

  <div class="modal-backdrop hidden" id="detailsBackdrop"></div>
  <section class="details-modal hidden" id="detailsModal" aria-label="Application details">
    <div class="drawer-head">
      <div>
        <h2 id="detailsTitle">Application details</h2>
        <p class="muted" id="detailsSubTitle"></p>
      </div>
      <button class="icon-button" id="closeDetailsBtn" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="detail-section">
      <h3>Status history</h3>
      <ol class="status-timeline" id="detailsHistory"></ol>
    </div>
    <div class="detail-section">
      <h3>Job description</h3>
      <div class="detail-text" id="detailsJd"></div>
    </div>
    <div class="detail-section">
      <h3>Cover letter</h3>
      <div class="detail-text" id="detailsCl"></div>
      <div id="detailsClFile"></div>
    </div>
    <div class="detail-section">
      <h3>Saved CV</h3>
      <div id="detailsCv"></div>
    </div>
  </section>

  <div class="modal-backdrop hidden" id="syncBackdrop"></div>
  <section class="details-modal hidden" id="syncModal" aria-label="Backend connection">
    <div class="drawer-head">
      <div>
        <h2>Backend connection</h2>
        <p class="muted">This version saves through the Next.js API, then into Supabase.</p>
      </div>
      <button class="icon-button" id="closeSyncBtn" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="sync-help">
      <p>For deployment, set these environment variables in Vercel or Render:</p>
      <p><code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>JOBTRACK_ADMIN_EMAILS</code>.</p>
      <p>The service role key must stay server-side only. Admin emails are comma-separated.</p>
    </div>
    <form id="syncForm" class="sync-form">
      <label>Supabase Project URL<input id="supabaseUrl" type="url" readonly /></label>
      <label>Anon public key<textarea id="supabaseAnonKey" rows="4" readonly></textarea></label>
      <label>Signed-in email<input id="syncEmail" type="email" readonly /></label>
      <div class="file-note" id="syncFormNote">Connection is controlled by deployment environment variables.</div>
      <div class="drawer-actions">
        <button class="secondary" id="clearSyncBtn" type="button">Close</button>
        <button class="primary" type="submit">Refresh connection</button>
      </div>
    </form>
  </section>
`;

const defaultAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleHRoZ3hxYW5kb2Vlc3FiZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjA4MjgsImV4cCI6MjA5NzY5NjgyOH0.lm6SBJ6Ks-R7v2Ad5s5nbSZ6OFQcowCpm73u18izfXg";

export default function Home() {
  const publicConfig = {
    demoEmail: DEMO_EMAIL,
    demoPassword: DEMO_PASSWORD,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pexthgxqandoeesqbelb.supabase.co",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey,
    adminEmails: (process.env.JOBTRACK_ADMIN_EMAILS || process.env.JOBTRACK_LOGIN_EMAIL || "steven5115115@gmail.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  };

  return (
    <>
      <Script
        id="jobtrack-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.JOBTRACK_CONFIG = ${JSON.stringify(publicConfig)};`,
        }}
      />
      <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" strategy="beforeInteractive" />
      <div dangerouslySetInnerHTML={{ __html: pageMarkup }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
