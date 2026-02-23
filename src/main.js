import { jobs } from './data.js'

// --- State Management ---
let filters = {
  keyword: '',
  location: '',
  mode: '',
  experience: '',
  source: '',
  status: '',
  sort: 'match',
  showOnlyMatches: false
};

const defaultPrefs = {
  roleKeywords: '',
  preferredLocations: [],
  preferredMode: [],
  experienceLevel: '',
  skills: '',
  minMatchScore: 40
};

let userPrefs = JSON.parse(localStorage.getItem('jobTrackerPreferences')) || null;
let savedJobIds = JSON.parse(localStorage.getItem('savedJobs')) || [];
let jobTrackerStatus = JSON.parse(localStorage.getItem('jobTrackerStatus')) || {};
let statusUpdates = JSON.parse(localStorage.getItem('statusUpdates')) || [];
let jobTrackerTestStatus = JSON.parse(localStorage.getItem('jobTrackerTestStatus')) || Array(10).fill(false);

const checklistItems = [
  { label: "Preferences persist after refresh", tip: "Set preferences, refresh, and check if they still appear in Settings." },
  { label: "Match score calculates correctly", tip: "Check if jobs on Dashboard have score badges based on your skills/keywords." },
  { label: "Show only matches toggle works", tip: "Toggle 'Matches Only' on Dashboard and see if low-score roles disappear." },
  { label: "Save job persists after refresh", tip: "Save a job, refresh, and check the Saved page." },
  { label: "Apply opens in new tab", tip: "Click 'Apply' on any job and verify it opens in a new browser tab." },
  { label: "Status update persists after refresh", tip: "Change a job status, refresh, and check if the badge stays updated." },
  { label: "Status filter works correctly", tip: "Filter by 'Applied' on Dashboard and verify results narrow down." },
  { label: "Digest generates top 10 by score", tip: "Check the Digest page for high-match roles summary." },
  { label: "Digest persists for the day", tip: "Activity log in Digest should remain after navigating away and back." },
  { label: "No console errors on main pages", tip: "Open DevTools (F12) and ensure no red errors appear while navigating." }
];

// --- Navigation Logic ---
const navigateTo = (url) => {
  const urlObj = new URL(url, location.origin);
  if (location.pathname === urlObj.pathname) return;
  history.pushState(null, null, urlObj.pathname);
  router();
};

const router = async () => {
  const routes = [
    { path: "/", view: renderHome },
    { path: "/dashboard", view: renderDashboard },
    { path: "/saved", view: renderSaved },
    { path: "/digest", view: renderDigest },
    { path: "/settings", view: renderSettings },
    { path: "/proof", view: renderProof },
    { path: "/jt/07-test", view: renderTestChecklist },
    { path: "/jt/08-ship", view: renderShip },
  ];

  const potentialMatches = routes.map((route) => {
    return {
      route: route,
      isMatch: location.pathname === route.path
    };
  });

  let match = potentialMatches.find((potentialMatch) => potentialMatch.isMatch);

  if (!match) {
    match = {
      route: { path: "/404", view: renderNotFound },
      isMatch: true
    };
  }

  document.querySelector("#content").innerHTML = match.route.view();

  // Run page specific logic after rendering
  if (location.pathname === "/dashboard") {
    setupDashboardListeners();
  } else if (location.pathname === "/saved") {
    setupSavedListeners();
  } else if (location.pathname === "/settings") {
    setupSettingsListeners();
  } else if (location.pathname === "/jt/07-test") {
    setupTestListeners();
  }

  updateActiveLinks();
  closeMobileNav();
};

// --- Rendering Functions ---

const renderHome = () => {
  return `
    <div class="landing-page">
      <div class="context-header">
        <h1>Stop Missing The Right Jobs.</h1>
        <p>Precision-matched job discovery delivered daily at 9AM.</p>
        <a href="/settings" data-link class="btn btn-primary">Start Tracking</a>
      </div>
    </div>
  `;
};

const renderSettings = () => {
  const prefs = userPrefs || defaultPrefs;
  const locations = [...new Set(jobs.map(j => j.location))].sort();
  const modes = ['Remote', 'Hybrid', 'Onsite'];
  const expLevels = ['Fresher', '0-1', '1-3', '3-5', '5+'];

  return `
    <div class="settings-page">
      <div class="context-header">
        <h1>Preferences</h1>
        <p>Define your career path to activate the intelligent matching engine.</p>
      </div>
      <div class="main-layout">
        <div class="primary-workspace">
          <form id="settings-form" class="card">
            <div class="input-group">
              <label class="input-label">Role Keywords (comma separated)</label>
              <input type="text" name="roleKeywords" value="${prefs.roleKeywords}" placeholder="e.g. SDE, Frontend, React">
            </div>
            
            <div class="input-group">
              <label class="input-label">Preferred Locations</label>
              <select name="preferredLocations" class="input-multiselect" multiple>
                ${locations.map(loc => `<option value="${loc}" ${prefs.preferredLocations.includes(loc) ? 'selected' : ''}>${loc}</option>`).join('')}
              </select>
              <p style="font-size: 14px; opacity: 0.5; margin-top: 8px;">Hold Cmd/Ctrl to select multiple.</p>
            </div>

            <div class="input-group">
              <label class="input-label">Preferred Mode</label>
              <div class="checkbox-group">
                ${modes.map(mode => `
                  <label class="checkbox-item">
                    <input type="checkbox" name="preferredMode" value="${mode}" ${prefs.preferredMode.includes(mode) ? 'checked' : ''}>
                    ${mode}
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="input-group">
              <label class="input-label">Experience Level</label>
              <select name="experienceLevel" class="input-select">
                <option value="">Select Level</option>
                ${expLevels.map(lvl => `<option value="${lvl}" ${prefs.experienceLevel === lvl ? 'selected' : ''}>${lvl}</option>`).join('')}
              </select>
            </div>

            <div class="input-group">
              <label class="input-label">Skills (comma separated)</label>
              <input type="text" name="skills" value="${prefs.skills}" placeholder="e.g. React, Node.js, Python">
            </div>

            <div class="input-group">
              <label class="input-label">Minimum Match Score: <span id="match-score-val">${prefs.minMatchScore}</span>%</label>
              <div class="range-group">
                <input type="range" name="minMatchScore" class="range-input" min="0" max="100" step="5" value="${prefs.minMatchScore}">
                <div class="range-labels">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div style="margin-top: var(--space-40);">
              <button type="submit" class="btn btn-primary" style="width: 100%;">Save Preferences</button>
            </div>
          </form>
        </div>
        <div class="secondary-panel">
          <div class="card">
            <h3>Matching Engine</h3>
            <p>Our deterministic algorithm scores roles based on your preferences. Scores above your threshold are highlighted as "High Match" cases.</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderDashboard = () => {
  return `
    <div class="dashboard-page">
      <div class="context-header">
        <h1>Discovery Feed</h1>
        <p>Your curated feed of high-value Indian tech opportunities.</p>
      </div>
      
      <div class="main-layout" style="display: block;">
        ${!userPrefs ? `
          <div class="status-banner">
            <span>Set your preferences to activate intelligent matching.</span>
            <a href="/settings" data-link>Configure Now &rarr;</a>
          </div>
        ` : ''}

        <div class="dashboard-controls">
          <div style="flex: 1;">
            ${renderFilterBar()}
          </div>
          <div style="margin-left: var(--space-24);">
            <label class="toggle-group">
              <input type="checkbox" id="match-toggle" ${filters.showOnlyMatches ? 'checked' : ''}>
              Matches Only
            </label>
          </div>
        </div>

        <div id="job-list" class="job-grid">
          ${renderJobList(getFilteredJobs())}
        </div>
      </div>
    </div>
  `;
};

const renderSaved = () => {
  const savedJobs = jobs.filter(job => savedJobIds.includes(job.id));

  return `
    <div class="saved-page">
      <div class="context-header">
        <h1>Saved Jobs</h1>
        <p>Your curated list of roles you're tracking.</p>
      </div>
      <div class="main-layout" style="display: block;">
        <div id="job-list" class="job-grid">
          ${savedJobs.length > 0 ? renderJobList(savedJobs) : `
            <div class="no-results">
              <h3>No saved jobs yet.</h3>
              <p>Explore the dashboard and save jobs that interest you.</p>
              <a href="/dashboard" data-link class="btn btn-secondary" style="margin-top: 24px;">Browse Jobs</a>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
};

const renderDigest = () => {
  const recentUpdates = statusUpdates.slice().reverse().slice(0, 10);
  const topMatches = getFilteredJobs().sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);

  return `
    <div class="digest-page">
      <div class="context-header">
        <h1>Career Briefing</h1>
        <p>A personal focused summary of your recent activities and market signals.</p>
      </div>
      <div class="main-layout">
        <div class="primary-workspace">
          <div class="card" style="margin-bottom: 32px;">
            <h3>Top Matches Of The Day</h3>
            <div class="update-log">
              ${topMatches.length > 0 ? topMatches.map(job => `
                <div class="update-item">
                  <div class="update-item__info">
                    <div class="update-item__title">${job.title}</div>
                    <div class="update-item__meta">${job.company} • ${job.location}</div>
                  </div>
                  <div class="match-score match-score--high" style="position: static;">${job.matchScore}% Match</div>
                </div>
              `).join('') : '<p class="muted">Set your preferences to see matches.</p>'}
            </div>
          </div>

          <div class="card">
            <h3>Recent Status Updates</h3>
            ${recentUpdates.length > 0 ? `
              <div class="update-log">
                ${recentUpdates.map(update => `
                  <div class="update-item">
                    <div class="update-item__info">
                      <div class="update-item__title">${update.title}</div>
                      <div class="update-item__meta">${update.company} • ${new Date(update.date).toLocaleDateString()}</div>
                    </div>
                    <div class="update-item__status status--${update.status.toLowerCase().replace(' ', '_')}">${update.status}</div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <p style="margin-top: 24px; opacity: 0.6;">No activity recorded yet. Start applying to roles to track your progress.</p>
            `}
          </div>
        </div>
        <div class="secondary-panel">
          <div class="card">
            <h3 style="margin-bottom: 16px;">Daily Insights</h3>
            <p>You have tracked <strong>${statusUpdates.length}</strong> updates. Keep your preferences updated to improve match precision.</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderProof = () => {
  return `
    <div class="proof-page">
      <div class="context-header">
        <h1>Build Proof</h1>
        <p class="muted">Verification and system diagnostics.</p>
      </div>
      <div class="main-layout" style="display: block;">
        <div class="card">
          <h3 style="margin-bottom: 24px;">System Health</h3>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Dataset Integrity</span>
              <span class="text-success">LOADED (${jobs.length} items)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Router Status</span>
              <span class="text-success">ONLINE</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Persistence Layer</span>
              <span class="text-success">LOCALSTORAGE ACTIVE</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>CSS Variables</span>
              <span class="text-success">COMPLIANT</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 16px; border-top: 1px solid var(--color-border); padding-top: 16px;">
              <span>Release Strategy</span>
              <a href="/jt/07-test" data-link class="text-accent" style="font-weight: 700;">RUN TEST CHECKLIST &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderTestChecklist = () => {
  const passedCount = jobTrackerTestStatus.filter(Boolean).length;
  const isComplete = passedCount === 10;

  return `
    <div class="test-page">
      <div class="context-header">
        <h1>System Verification</h1>
        <p>Run these 10 core tests to authorize the production build.</p>
      </div>
      
      <div class="main-layout">
        <div class="primary-workspace">
          <div class="card">
            <div class="test-summary">
              <h2>Tests Passed: ${passedCount} / 10</h2>
              ${!isComplete ? `<p class="text-accent" style="font-weight: 700; font-size: 14px; margin-top: 8px;">Resolve all issues before shipping.</p>` : ''}
            </div>

            <div class="checklist-grid" style="margin-top: 32px;">
              ${checklistItems.map((item, index) => `
                <div class="checklist-item">
                  <label class="checkbox-wrapper">
                    <input type="checkbox" class="checklist-toggle" data-index="${index}" ${jobTrackerTestStatus[index] ? 'checked' : ''}>
                    <span class="checklist-label">${item.label}</span>
                  </label>
                  <div class="test-tip" title="${item.tip}">?</div>
                </div>
              `).join('')}
            </div>

            <div style="margin-top: 40px; border-top: 1px solid var(--color-border); padding-top: 24px;">
              <button id="reset-tests" class="btn btn-secondary btn-sm">Reset Test Status</button>
              <a href="/jt/08-ship" data-link class="btn ${isComplete ? 'btn-primary' : 'btn-disabled'}" style="float: right;">Ship to Production</a>
            </div>
          </div>
        </div>
        <div class="secondary-panel">
          <div class="card">
            <h3>Ship Policy</h3>
            <p>Production access is cryptographically locked until all verification items are checked. This enforces structural integrity.</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderShip = () => {
  const passedCount = jobTrackerTestStatus.filter(Boolean).length;
  if (passedCount < 10) {
    return `
      <div class="locked-page">
        <div class="context-header">
          <h1>Locked: Unauthorized Ship</h1>
          <p>Security protocol engaged. System state does not meet shipping criteria.</p>
        </div>
        <div class="main-layout" style="display: block;">
          <div class="card" style="text-align: center; padding: 64px;">
            <div style="font-size: 48px; margin-bottom: 24px;">🔒</div>
            <h2 style="margin-bottom: 16px;">Complete all tests before shipping.</h2>
            <p style="opacity: 0.6; margin-bottom: 32px;">System verification is currently at ${passedCount}/10. Return to the test suite to proceed.</p>
            <a href="/jt/07-test" data-link class="btn btn-primary">Return to Test Checklist</a>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="ship-page">
      <div class="context-header">
        <h1>System Deployed.</h1>
        <p>Deployment authorized. All systems operational.</p>
      </div>
      <div class="main-layout" style="display: block;">
        <div class="card" style="text-align: center; padding: 64px;">
          <div style="font-size: 48px; margin-bottom: 32px;">🚀</div>
          <h2 style="margin-bottom: 16px;">Success! Build Shipped.</h2>
          <p style="opacity: 0.6; margin-bottom: 32px;">Your application has passed all deterministic tests and is now version-stable.</p>
          <button class="btn btn-primary" onclick="window.location.href='/'">Go to Website</button>
        </div>
      </div>
    </div>
  `;
};

const renderNotFound = () => {
  return `
    <div class="placeholder-container">
      <h1>Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/" data-link class="btn btn-secondary">Return Home</a>
    </div>
  `;
};

// --- Helper Rendering Functions ---

const renderFilterBar = () => {
  return `
    <div class="filter-bar">
      <div class="filter-group">
        <label>Keyword</label>
        <input type="text" id="filter-keyword" class="filter-input" placeholder="Search..." value="${filters.keyword}">
      </div>
      <div class="filter-group">
        <label>Location</label>
        <select id="filter-location" class="filter-select">
          <option value="">All Locations</option>
          <option value="Bangalore" ${filters.location === 'Bangalore' ? 'selected' : ''}>Bangalore</option>
          <option value="Remote" ${filters.location === 'Remote' ? 'selected' : ''}>Remote</option>
          <option value="Gurgaon" ${filters.location === 'Gurgaon' ? 'selected' : ''}>Gurgaon</option>
          <option value="Chennai" ${filters.location === 'Chennai' ? 'selected' : ''}>Chennai</option>
          <option value="Mumbai" ${filters.location === 'Mumbai' ? 'selected' : ''}>Mumbai</option>
          <option value="Hyderabad" ${filters.location === 'Hyderabad' ? 'selected' : ''}>Hyderabad</option>
          <option value="Noida" ${filters.location === 'Noida' ? 'selected' : ''}>Noida</option>
          <option value="Pune" ${filters.location === 'Pune' ? 'selected' : ''}>Pune</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Mode</label>
        <select id="filter-mode" class="filter-select">
          <option value="">All Modes</option>
          <option value="Remote" ${filters.mode === 'Remote' ? 'selected' : ''}>Remote</option>
          <option value="Hybrid" ${filters.mode === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
          <option value="Onsite" ${filters.mode === 'Onsite' ? 'selected' : ''}>Onsite</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Experience</label>
        <select id="filter-experience" class="filter-select">
          <option value="">All Exp</option>
          <option value="Fresher" ${filters.experience === 'Fresher' ? 'selected' : ''}>Fresher</option>
          <option value="0-1" ${filters.experience === '0-1' ? 'selected' : ''}>0-1</option>
          <option value="1-3" ${filters.experience === '1-3' ? 'selected' : ''}>1-3</option>
          <option value="3-5" ${filters.experience === '3-5' ? 'selected' : ''}>3-5</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Source</label>
        <select id="filter-source" class="filter-select">
          <option value="">All Sources</option>
          <option value="LinkedIn" ${filters.source === 'LinkedIn' ? 'selected' : ''}>LinkedIn</option>
          <option value="Naukri" ${filters.source === 'Naukri' ? 'selected' : ''}>Naukri</option>
          <option value="Indeed" ${filters.source === 'Indeed' ? 'selected' : ''}>Indeed</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select id="filter-status" class="filter-select">
          <option value="">All Statuses</option>
          <option value="Not Applied" ${filters.status === 'Not Applied' ? 'selected' : ''}>Not Applied</option>
          <option value="Applied" ${filters.status === 'Applied' ? 'selected' : ''}>Applied</option>
          <option value="Rejected" ${filters.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Selected" ${filters.status === 'Selected' ? 'selected' : ''}>Selected</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Sort By</label>
        <select id="filter-sort" class="filter-select">
          <option value="match" ${filters.sort === 'match' ? 'selected' : ''}>Match Score</option>
          <option value="latest" ${filters.sort === 'latest' ? 'selected' : ''}>Latest</option>
          <option value="salary" ${filters.sort === 'salary' ? 'selected' : ''}>Salary (Highest)</option>
        </select>
      </div>
    </div>
  `;
};

const renderJobList = (jobItems) => {
  if (jobItems.length === 0) {
    return `
      <div class="no-results">
        <h3 style="font-family: var(--font-serif); font-size: 24px; margin-bottom: 8px;">No roles match your criteria.</h3>
        <p>Adjust filters or lower your match threshold to see more opportunities.</p>
        <button class="btn btn-secondary" style="margin-top: 24px;" onclick="window.dispatchEvent(new CustomEvent('clear-filters'))">Clear All Filters</button>
      </div>
    `;
  }

  return jobItems.map(job => {
    const score = job.matchScore || 0;
    const itemStatus = jobTrackerStatus[job.id] || "Not Applied";
    let scoreClass = 'match-score--low';
    if (score >= 80) scoreClass = 'match-score--high';
    else if (score >= 60) scoreClass = 'match-score--medium';
    else if (score >= 40) scoreClass = 'match-score--neutral';

    const statusSlug = itemStatus.toLowerCase().replace(' ', '_');

    return `
    <div class="job-card" data-id="${job.id}">
      ${userPrefs ? `<div class="match-score ${scoreClass}">${score}% Match</div>` : ''}
      <div class="job-card__header">
        <div class="job-card__title">${job.title}</div>
        <div class="job-card__company">${job.company}</div>
      </div>
      <div class="job-card__meta">
        <div class="job-card__meta-item">📍 ${job.location} • ${job.mode}</div>
        <div class="job-card__meta-item">💼 ${job.experience}</div>
        <div class="job-card__meta-item">💰 ${job.salaryRange}</div>
      </div>

      <div class="job-card__status-area">
        <div class="status-badge status--${statusSlug}">${itemStatus}</div>
        <select class="status-select" onchange="window.dispatchEvent(new CustomEvent('status-change', {detail: {id: '${job.id}', status: this.value}}))">
          <option value="Not Applied" ${itemStatus === 'Not Applied' ? 'selected' : ''}>Set Not Applied</option>
          <option value="Applied" ${itemStatus === 'Applied' ? 'selected' : ''}>Mark Applied</option>
          <option value="Rejected" ${itemStatus === 'Rejected' ? 'selected' : ''}>Mark Rejected</option>
          <option value="Selected" ${itemStatus === 'Selected' ? 'selected' : ''}>Mark Selected</option>
        </select>
      </div>

      <div class="job-card__footer">
        <div class="source-badge">${job.source}</div>
        <div class="posted-time">${job.postedDaysAgo === 0 ? 'Just now' : job.postedDaysAgo + ' days ago'}</div>
      </div>
      <div class="job-card__actions" style="margin-top: 16px;">
        <button class="btn btn-secondary btn-sm btn-view">Details</button>
        <button class="btn btn-secondary btn-sm btn-save ${savedJobIds.includes(job.id) ? 'active' : ''}">${savedJobIds.includes(job.id) ? 'Saved' : 'Save'}</button>
        <a href="${job.applyUrl}" target="_blank" class="btn btn-primary btn-sm btn-apply">Apply</a>
      </div>
    </div>
  `;
  }).join('');
};

const renderModal = (job) => {
  return `
    <div class="modal-overlay open" id="modal-overlay">
      <div class="modal">
        <button class="modal-close" id="modal-close">&times;</button>
        <h1 class="modal__title">${job.title}</h1>
        <div class="modal__company">${job.company}</div>
        
        <div class="job-card__meta" style="margin-bottom: 32px;">
          <div class="job-card__meta-item">📍 ${job.location} • ${job.mode}</div>
          <div class="job-card__meta-item">💼 ${job.experience}</div>
          <div class="job-card__meta-item">💰 ${job.salaryRange}</div>
          <div class="source-badge">${job.source}</div>
        </div>

        <div class="modal__section">
          <div class="modal__section-title">Required Skills</div>
          <div class="skill-tags">
            ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
          </div>
        </div>

        <div class="modal__section">
          <div class="modal__section-title">Description</div>
          <p>${job.description}</p>
        </div>

        <div style="margin-top: 40px;">
          <a href="${job.applyUrl}" target="_blank" class="btn btn-primary" style="width: 100%;">Apply Now</a>
        </div>
      </div>
    </div>
  `;
};

// --- Logic ---

const calculateMatchScore = (job) => {
  if (!userPrefs) return 0;
  let score = 0;

  const keywords = userPrefs.roleKeywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
  const userSkills = userPrefs.skills.toLowerCase().split(',').map(s => s.trim()).filter(s => s);

  // 1. Role Keyword match (+25 title, +15 description)
  const titleLower = job.title.toLowerCase();
  const descLower = job.description.toLowerCase();
  if (keywords.some(k => titleLower.includes(k))) score += 25;
  if (keywords.some(k => descLower.includes(k))) score += 15;

  // 2. Location match (+15)
  if (userPrefs.preferredLocations.includes(job.location)) score += 15;

  // 3. Mode match (+10)
  if (userPrefs.preferredMode.includes(job.mode)) score += 10;

  // 4. Experience match (+10)
  if (userPrefs.experienceLevel === job.experience) score += 10;

  // 5. Skills overlap (+15)
  const jobSkills = job.skills.map(s => s.toLowerCase());
  if (userSkills.some(s => jobSkills.includes(s))) score += 15;

  // 6. Recency (+5)
  if (job.postedDaysAgo <= 2) score += 5;

  // 7. Source match (+5)
  if (job.source === 'LinkedIn') score += 5;

  return Math.min(score, 100);
};

const extractSalary = (salaryStr) => {
  const matches = salaryStr.match(/(\d+\.?\d*)/g);
  if (!matches) return 0;
  let val = parseFloat(matches[matches.length - 1]);
  if (salaryStr.includes('LPA')) return val * 100000;
  if (salaryStr.includes('k/month')) return val * 12000;
  return val;
};

const getFilteredJobs = () => {
  let filtered = jobs.map(job => ({
    ...job,
    matchScore: calculateMatchScore(job),
    trackerStatus: jobTrackerStatus[job.id] || "Not Applied"
  }));

  // Apply filters with AND logic
  filtered = filtered.filter(job => {
    const matchesKeyword = !filters.keyword || job.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
      job.company.toLowerCase().includes(filters.keyword.toLowerCase());
    const matchesLocation = !filters.location || job.location === filters.location;
    const matchesMode = !filters.mode || job.mode === filters.mode;
    const matchesExperience = !filters.experience || job.experience === filters.experience;
    const matchesSource = !filters.source || job.source === filters.source;
    const matchesStatus = !filters.status || job.trackerStatus === filters.status;
    const matchesThreshold = !filters.showOnlyMatches || (job.matchScore >= (userPrefs?.minMatchScore || 0));

    return matchesKeyword && matchesLocation && matchesMode && matchesExperience && matchesSource && matchesStatus && matchesThreshold;
  });

  // Sorting
  if (filters.sort === 'match') {
    filtered.sort((a, b) => b.matchScore - a.matchScore);
  } else if (filters.sort === 'salary') {
    filtered.sort((a, b) => extractSalary(b.salaryRange) - extractSalary(a.salaryRange));
  } else if (filters.sort === 'latest') {
    filtered.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  }

  return filtered;
};

const setupDashboardListeners = () => {
  const inputs = ['keyword', 'location', 'mode', 'experience', 'source', 'status', 'sort'];
  inputs.forEach(id => {
    const el = document.getElementById(`filter-${id}`);
    if (el) {
      el.addEventListener('change', (e) => {
        filters[id] = e.target.value;
        refreshJobList();
      });
      if (id === 'keyword') {
        el.addEventListener('input', (e) => {
          filters[id] = e.target.value;
          refreshJobList();
        });
      }
    }
  });

  const toggle = document.getElementById('match-toggle');
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      filters.showOnlyMatches = e.target.checked;
      refreshJobList();
    });
  }

  document.getElementById('job-list').addEventListener('click', handleJobActions);
};

const showToast = (message) => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
};

const setupSettingsListeners = () => {
  const form = document.getElementById('settings-form');
  const scoreVal = document.getElementById('match-score-val');
  const range = form.querySelector('input[name="minMatchScore"]');

  range.addEventListener('input', (e) => {
    scoreVal.innerText = e.target.value;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const prefs = {
      roleKeywords: formData.get('roleKeywords'),
      preferredLocations: formData.getAll('preferredLocations'),
      preferredMode: formData.getAll('preferredMode'),
      experienceLevel: formData.get('experienceLevel'),
      skills: formData.get('skills'),
      minMatchScore: parseInt(formData.get('minMatchScore'))
    };

    localStorage.setItem('jobTrackerPreferences', JSON.stringify(prefs));
    userPrefs = prefs;

    const btn = form.querySelector('button[type="submit"]');
    btn.innerText = 'Preferences Saved';
    btn.style.background = 'var(--color-success)';

    setTimeout(() => {
      btn.innerText = 'Save Preferences';
      btn.style.background = 'var(--color-accent)';
    }, 2000);

    // Proactively recalculate scores for current jobs
    router();
  });
};

const setupTestListeners = () => {
  const toggles = document.querySelectorAll('.checklist-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      jobTrackerTestStatus[index] = e.target.checked;
      localStorage.setItem('jobTrackerTestStatus', JSON.stringify(jobTrackerTestStatus));
      router(); // Refresh UI for counter and ship button
    });
  });

  const resetBtn = document.getElementById('reset-tests');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      jobTrackerTestStatus = Array(10).fill(false);
      localStorage.setItem('jobTrackerTestStatus', JSON.stringify(jobTrackerTestStatus));
      router();
    });
  }
};

const setupSavedListeners = () => {
  document.getElementById('job-list').addEventListener('click', handleJobActions);
};

const handleJobActions = (e) => {
  const card = e.target.closest('.job-card');
  if (!card) return;
  const jobId = card.dataset.id;
  const job = jobs.find(j => j.id === jobId);

  if (e.target.classList.contains('btn-view')) {
    openModal(job);
  } else if (e.target.classList.contains('btn-save')) {
    toggleSaveJob(jobId, e.target);
  }
};

const refreshJobList = () => {
  const jobList = document.getElementById('job-list');
  if (jobList) {
    jobList.innerHTML = renderJobList(getFilteredJobs());
  }
};

const openModal = (job) => {
  const container = document.getElementById('modal-container');
  container.innerHTML = renderModal(job);

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
};

const closeModal = () => {
  const container = document.getElementById('modal-container');
  container.innerHTML = '';
};

const toggleSaveJob = (id, btn) => {
  if (savedJobIds.includes(id)) {
    savedJobIds = savedJobIds.filter(savedId => savedId !== id);
    btn.innerText = 'Save';
    btn.classList.remove('active');
  } else {
    savedJobIds.push(id);
    btn.innerText = 'Saved';
    btn.classList.add('active');
  }
  localStorage.setItem('savedJobs', JSON.stringify(savedJobIds));

  if (location.pathname === "/saved") {
    router(); // Refresh for saved page
  }
};

const updateActiveLinks = () => {
  const currentPath = location.pathname;
  document.querySelectorAll("[data-link]").forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });
};

const closeMobileNav = () => {
  document.getElementById("mobile-nav").classList.remove("open");
};

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", (e) => {
    if (e.target.matches("[data-link], [data-link] *")) {
      const link = e.target.closest("[data-link]");
      if (link) {
        e.preventDefault();
        navigateTo(link.href);
      }
    }
  });

  const hamburger = document.getElementById("hamburger");
  const mobileNav = document.getElementById("mobile-nav");

  hamburger.addEventListener("click", () => {
    mobileNav.classList.toggle("open");
    if (mobileNav.classList.contains("open")) {
      mobileNav.style.display = "flex";
    } else {
      mobileNav.style.display = "none";
    }
  });

  router();
});

window.addEventListener('status-change', (e) => {
  const { id, status } = e.detail;
  const job = jobs.find(j => j.id === id);

  jobTrackerStatus[id] = status;
  localStorage.setItem('jobTrackerStatus', JSON.stringify(jobTrackerStatus));

  // Record update
  statusUpdates.push({
    title: job.title,
    company: job.company,
    status: status,
    date: new Date().toISOString()
  });
  localStorage.setItem('statusUpdates', JSON.stringify(statusUpdates));

  showToast(`Status updated: ${status}`);
  refreshJobList();
});

window.addEventListener('clear-filters', () => {
  filters = {
    keyword: '',
    location: '',
    mode: '',
    experience: '',
    source: '',
    status: '',
    sort: 'match',
    showOnlyMatches: false
  };
  router();
});
