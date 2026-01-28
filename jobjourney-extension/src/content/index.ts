import { JOB_SITE_PATTERNS } from '../shared/constants';
import type { ScrapedJobData, JobSource, MessageResponse, AuthState } from '../shared/types';
import { LinkedInScraper } from './scrapers/linkedin';
import { IndeedScraper } from './scrapers/indeed';
import { GlassdoorScraper } from './scrapers/glassdoor';

// State
let currentJobData: ScrapedJobData | null = null;
let isAuthenticated = false;
let buttonState: 'idle' | 'loading' | 'success' | 'error' | 'duplicate' = 'idle';

// Detect which job site we're on
function detectJobSite(): JobSource | null {
  const url = window.location.href;

  for (const [site, patterns] of Object.entries(JOB_SITE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return site as JobSource;
      }
    }
  }

  return null;
}

// Get the appropriate scraper for the current site
function getScraper(site: JobSource) {
  switch (site) {
    case 'linkedin':
      return new LinkedInScraper();
    case 'indeed':
      return new IndeedScraper();
    case 'glassdoor':
      return new GlassdoorScraper();
    default:
      return null;
  }
}

// Scrape job data from the current page
function scrapeJob(): ScrapedJobData | null {
  const site = detectJobSite();
  if (!site) return null;

  const scraper = getScraper(site);
  if (!scraper) return null;

  try {
    return scraper.scrape();
  } catch (error) {
    console.error('JobJourney: Failed to scrape job:', error);
    return null;
  }
}

// Send message to background worker
function sendMessage<T>(type: string, payload?: unknown): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message || 'Failed to send message',
        });
      } else {
        resolve(response || { success: false, error: 'No response' });
      }
    });
  });
}

// Check authentication status
async function checkAuth(): Promise<boolean> {
  const response = await sendMessage<AuthState>('GET_AUTH_STATE');
  isAuthenticated = response.success && response.data?.isAuthenticated === true;
  return isAuthenticated;
}

// Check if job is a duplicate
async function checkDuplicate(jobData: ScrapedJobData): Promise<boolean> {
  const response = await sendMessage<{ isDuplicate: boolean }>('CHECK_DUPLICATE', {
    externalJobId: jobData.externalJobId,
    link: jobData.link,
  });
  return response.success && response.data?.isDuplicate === true;
}

// Save job via background worker
async function saveJob(jobData: ScrapedJobData): Promise<boolean> {
  const response = await sendMessage('SAVE_JOB', {
    company: jobData.company,
    role: jobData.role,
    location: jobData.location || '',
    salary: jobData.salary || '',
    link: jobData.link,
    description: jobData.description || '',
    source: jobData.source,
    externalJobId: jobData.externalJobId,
    dateApplied: new Date().toISOString().split('T')[0],
    status: 'INTERESTED',
  });
  return response.success;
}

// Update button UI based on state
function updateButtonState(button: HTMLElement) {
  const textSpan = button.querySelector('span');
  const svg = button.querySelector('svg');

  button.classList.remove('success', 'error', 'loading', 'duplicate');

  switch (buttonState) {
    case 'loading':
      button.classList.add('loading');
      if (textSpan) textSpan.textContent = 'Saving...';
      if (svg) {
        svg.innerHTML = `
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
          </circle>
        `;
      }
      break;

    case 'success':
      button.classList.add('success');
      if (textSpan) textSpan.textContent = 'Saved!';
      if (svg) {
        svg.innerHTML = `<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      break;

    case 'error':
      button.classList.add('error');
      if (textSpan) textSpan.textContent = 'Error - Click to retry';
      if (svg) {
        svg.innerHTML = `<path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      break;

    case 'duplicate':
      button.classList.add('duplicate');
      if (textSpan) textSpan.textContent = 'Already saved';
      if (svg) {
        svg.innerHTML = `<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      break;

    default:
      if (textSpan) textSpan.textContent = 'Save to JobJourney';
      if (svg) {
        svg.innerHTML = `<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
  }
}

// Handle save button click
async function handleSaveClick(button: HTMLElement) {
  if (buttonState === 'loading' || buttonState === 'success') return;

  // Check auth first
  if (!isAuthenticated) {
    const authed = await checkAuth();
    if (!authed) {
      // Show message to login via popup
      buttonState = 'error';
      updateButtonState(button);
      const textSpan = button.querySelector('span');
      if (textSpan) textSpan.textContent = 'Login via extension';
      return;
    }
  }

  // Scrape job data
  currentJobData = scrapeJob();
  if (!currentJobData) {
    buttonState = 'error';
    updateButtonState(button);
    const textSpan = button.querySelector('span');
    if (textSpan) textSpan.textContent = 'Could not read job';
    setTimeout(() => {
      buttonState = 'idle';
      updateButtonState(button);
    }, 3000);
    return;
  }

  // Set loading state
  buttonState = 'loading';
  updateButtonState(button);

  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicate(currentJobData);
    if (isDuplicate) {
      buttonState = 'duplicate';
      updateButtonState(button);
      return;
    }

    // Save the job
    const saved = await saveJob(currentJobData);
    if (saved) {
      buttonState = 'success';
      updateButtonState(button);
    } else {
      buttonState = 'error';
      updateButtonState(button);
      setTimeout(() => {
        buttonState = 'idle';
        updateButtonState(button);
      }, 3000);
    }
  } catch (error) {
    console.error('JobJourney: Save failed:', error);
    buttonState = 'error';
    updateButtonState(button);
    setTimeout(() => {
      buttonState = 'idle';
      updateButtonState(button);
    }, 3000);
  }
}

// Create and inject floating save button
function injectSaveButton() {
  // Remove existing button if any
  const existing = document.getElementById('jobjourney-save-btn');
  if (existing) {
    existing.remove();
  }

  const site = detectJobSite();
  if (!site) return;

  // Reset state for new page
  buttonState = 'idle';
  currentJobData = null;

  const button = document.createElement('button');
  button.id = 'jobjourney-save-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Save to JobJourney</span>
  `;
  button.title = 'Save this job to JobJourney';

  button.addEventListener('click', () => handleSaveClick(button));

  document.body.appendChild(button);

  // Check auth status in background
  checkAuth();

  // Pre-scrape job data
  setTimeout(() => {
    currentJobData = scrapeJob();
    if (currentJobData) {
      console.log('JobJourney: Scraped job data:', currentJobData.company, '-', currentJobData.role);
    }
  }, 1000);
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCRAPE_JOB') {
    // Re-scrape to get fresh data
    const data = scrapeJob();
    sendResponse({ success: !!data, data });
  }
  return true;
});

// Initialize on page load
function init() {
  const site = detectJobSite();
  if (site) {
    console.log(`JobJourney: Detected ${site} job page`);
    // Delay injection to let page content load
    setTimeout(injectSaveButton, 1500);
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-check on URL changes (for SPAs like LinkedIn)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Longer delay for SPA navigation
    setTimeout(init, 1500);
  }
});

observer.observe(document.body, { childList: true, subtree: true });
