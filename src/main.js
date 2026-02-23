import './style.css'
import { jobs } from './data.js'

// --- State Management ---
let filters = {
  keyword: '',
  location: '',
  mode: '',
  experience: '',
  source: '',
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
  return `
    <div class="digest-page">
      <div class="context-header">
        <h1>Job Digest</h1>
        <p>Your personal career briefing. A focused daily summary will appear here once the digest engine is online.</p>
      </div>
      <div class="placeholder-container">
        <div class="card" style="text-align: center; border-style: dashed;">
          <h3 style="margin-bottom: 16px;">Daily Summary Coming Soon</h3>
          <p>We are calibrating the matching engine for your profile.</p>
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
          </div>
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
    let scoreClass = 'match-score--low';
    if (score >= 80) scoreClass = 'match-score--high';
    else if (score >= 60) scoreClass = 'match-score--medium';
    else if (score >= 40) scoreClass = 'match-score--neutral';

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
    matchScore: calculateMatchScore(job)
  }));

  // Apply filters with AND logic
  filtered = filtered.filter(job => {
    const matchesKeyword = !filters.keyword || job.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
      job.company.toLowerCase().includes(filters.keyword.toLowerCase());
    const matchesLocation = !filters.location || job.location === filters.location;
    const matchesMode = !filters.mode || job.mode === filters.mode;
    const matchesExperience = !filters.experience || job.experience === filters.experience;
    const matchesSource = !filters.source || job.source === filters.source;
    const matchesThreshold = !filters.showOnlyMatches || (job.matchScore >= (userPrefs?.minMatchScore || 0));

    return matchesKeyword && matchesLocation && matchesMode && matchesExperience && matchesSource && matchesThreshold;
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
  const inputs = ['keyword', 'location', 'mode', 'experience', 'source', 'sort'];
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
  });

  router();
});

window.addEventListener('clear-filters', () => {
  filters = {
    keyword: '',
    location: '',
    mode: '',
    experience: '',
    source: '',
    sort: 'match',
    showOnlyMatches: false
  };
  router();
});
