import Script from "next/script";

const pageMarkup = String.raw`
  <section class="login-screen" id="loginScreen">
    <div class="login-card">
      <div class="brand login-brand">
        <div class="brand-mark">J</div>
        <span>JobTrack</span>
      </div>
      <h1>Sign in to your tracker</h1>
      <p>Use your saved email and password. Your applications are saved through the JobTrack backend.</p>
      <form id="loginForm" class="login-form">
        <label>Email<input id="loginEmail" type="email" value="steven5115115@gmail.com" readonly required /></label>
        <label>Password<input id="loginPassword" type="password" placeholder="Enter app password" required /></label>
        <button class="primary" type="submit">Sign in</button>
      </form>
      <div class="file-note" id="loginNote">Use the password you set for this Supabase user.</div>
    </div>
  </section>

  <div class="app-shell app-locked" id="appShell">
    <aside class="sidebar" aria-label="App navigation">
      <div class="brand">
        <div class="brand-mark">J</div>
        <span>JobTrack</span>
      </div>
      <nav class="nav-list">
        <a class="nav-item active" href="#dashboard">Dashboard</a>
        <a class="nav-item" href="#applications">Applications</a>
        <a class="nav-item" href="#followups">Follow-ups</a>
        <a class="nav-item" href="#analytics">Analytics</a>
      </nav>
      <div class="quick-stats" id="quickStats"></div>
      <div class="sync-card">
        <div class="sync-title">Cloud sync</div>
        <div id="syncStatus">Backend not connected</div>
        <button class="secondary full" id="openSyncBtn" type="button">Connection info</button>
      </div>
      <button class="secondary full" id="exportBtn" type="button">Export data</button>
    </aside>

    <main class="main" id="dashboard">
      <header class="topbar">
        <div>
          <h1>Job search command center</h1>
          <p>Plan the next action, keep materials close, and spot quiet applications before they disappear.</p>
        </div>
        <div class="topbar-actions">
          <span class="user-chip" id="userChip">Not signed in</span>
          <label class="import-btn">
            Import
            <input id="importInput" type="file" accept="application/json" hidden />
          </label>
          <button class="secondary" id="seedBtn" type="button">Load examples</button>
          <button class="secondary" id="signOutBtn" type="button">Sign out</button>
          <button class="primary" id="openFormBtn" type="button">+ Add application</button>
        </div>
      </header>

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
      </section>

      <section class="action-board" aria-label="Application action summary">
        <div class="action-card action-card-primary">
          <div>
            <span class="action-label">Needs attention</span>
            <strong id="attentionCount">0</strong>
          </div>
          <p>Follow-ups due now or applications quiet for 30+ days.</p>
        </div>
        <div class="action-card">
          <span class="action-label">Active pipeline</span>
          <strong id="activeCount">0</strong>
          <p>Open roles still worth tracking.</p>
        </div>
        <div class="action-card">
          <span class="action-label">Interview motion</span>
          <strong id="interviewCount">0</strong>
          <p>Screening, interview, take-home, or final.</p>
        </div>
      </section>

      <div class="content-grid">
        <section class="table-panel" id="applications">
          <div class="panel-head">
            <h2>Application pipeline</h2>
            <span id="resultCount"></span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
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
                  <th></th>
                </tr>
              </thead>
              <tbody id="applicationRows"></tbody>
            </table>
          </div>
        </section>

        <aside class="insights" id="analytics">
          <section class="card probability-card">
            <div class="card-title">Success probability</div>
            <div class="probability-number" id="avgProbability">0%</div>
            <p id="probabilityNote">Add applications to start estimating.</p>
          </section>
          <section class="card">
            <div class="card-title">Applications by status</div>
            <div class="status-chart" id="statusChart"></div>
          </section>
          <section class="card" id="followups">
            <div class="card-title row-between">Follow-ups due soon <span id="dueCount"></span></div>
            <ul class="due-list" id="dueList"></ul>
          </section>
          <section class="card stale-card" id="staleApplications">
            <div class="card-title row-between">30+ days quiet <span id="staleCount"></span></div>
            <p class="muted">Applications with no clear progress for a month. Good candidates for a follow-up, refresh, or archive.</p>
            <ul class="due-list stale-list" id="staleList"></ul>
          </section>
          <section class="card">
            <div class="card-title">Application pace</div>
            <div class="mini-chart" id="timelineChart" aria-label="Applications over time"></div>
            <p class="muted">Applications submitted by month. Use it to see whether your weekly search rhythm is staying steady.</p>
          </section>
        </aside>
      </div>
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
      <label>Company *<input id="company" required placeholder="e.g. Google" /></label>
      <label>Role *<input id="role" required placeholder="e.g. Software Engineer" /></label>
      <label>Job link<input id="link" type="url" placeholder="https://" /></label>
      <div class="two-col">
        <label>Source<select id="source"></select></label>
        <label>Category<select id="category"></select></label>
      </div>
      <div class="two-col">
        <label>Job type<select id="jobType"></select></label>
        <label>Status<select id="status"></select></label>
      </div>
      <div class="two-col">
        <label>Applied date *<input id="appliedDate" type="date" required /></label>
        <label>Follow-up date<input id="followUpDate" type="date" /></label>
      </div>
      <div class="two-col">
        <label>Screen date<input id="screenDate" type="date" /></label>
        <label>Interview date<input id="interviewDate" type="date" /></label>
      </div>
      <div class="two-col">
        <label>Final date<input id="finalDate" type="date" /></label>
        <label>Decision date<input id="decisionDate" type="date" /></label>
      </div>
      <label>Job description<textarea id="jobDescription" rows="6" placeholder="Paste the JD here so you can review it later..."></textarea></label>
      <label>CV file<input id="cvFile" type="file" accept=".pdf,.doc,.docx,.txt" /></label>
      <div class="file-note" id="cvFileNote">No CV saved for this application.</div>
      <label>Cover letter text<textarea id="coverLetter" rows="6" placeholder="Paste or draft your CL text here..."></textarea></label>
      <label>Cover letter file<input id="clFile" type="file" accept=".pdf,.doc,.docx,.txt" /></label>
      <div class="file-note" id="clFileNote">No cover letter file saved for this application.</div>
      <label>Notes<textarea id="notes" rows="4" placeholder="Contact, salary range, next action..."></textarea></label>
      <div class="drawer-actions">
        <button class="secondary" id="deleteBtn" type="button">Delete</button>
        <button class="primary" type="submit">Save</button>
      </div>
    </form>
  </aside>

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
      <p><code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>JOBTRACK_LOGIN_EMAIL</code>.</p>
      <p>The service role key must stay server-side only. Do not put it in GitHub.</p>
    </div>
    <form id="syncForm" class="sync-form">
      <label>Supabase Project URL<input id="supabaseUrl" type="url" readonly /></label>
      <label>Anon public key<textarea id="supabaseAnonKey" rows="4" readonly></textarea></label>
      <label>Login email<input id="syncEmail" type="email" readonly /></label>
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
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pexthgxqandoeesqbelb.supabase.co",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey,
    loginEmail: process.env.JOBTRACK_LOGIN_EMAIL || "steven5115115@gmail.com",
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
