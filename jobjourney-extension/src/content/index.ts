import { JOB_SITE_PATTERNS } from '../shared/constants';
import type { ScrapedJobData, JobSource } from '../shared/types';
import { LinkedInScraper } from './scrapers/linkedin';
import { IndeedScraper } from './scrapers/indeed';
import { GlassdoorScraper } from './scrapers/glassdoor';

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
    console.error('Failed to scrape job:', error);
    return null;
  }
}

// Inject floating save button
function injectSaveButton() {
  // Check if button already exists
  if (document.getElementById('jobjourney-save-btn')) return;

  const site = detectJobSite();
  if (!site) return;

  const button = document.createElement('button');
  button.id = 'jobjourney-save-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Save to JobJourney</span>
  `;
  button.title = 'Save this job to JobJourney';

  button.addEventListener('click', async () => {
    // Open extension popup (this will trigger scraping and show the form)
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  });

  document.body.appendChild(button);
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCRAPE_JOB') {
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
    injectSaveButton();
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
    setTimeout(init, 500); // Small delay for page content to load
  }
});

observer.observe(document.body, { childList: true, subtree: true });
