import { BaseScraper } from './base';
import type { ScrapedJobData, JobSource } from '../../shared/types';

export class LinkedInScraper extends BaseScraper {
  source: JobSource = 'linkedin';

  scrape(): ScrapedJobData | null {
    const company = this.getCompany();
    const role = this.getRole();

    console.log('JobJourney LinkedIn Scraper - Company:', company, 'Role:', role);

    if (!company || !role) {
      console.log('JobJourney: Could not find company or role on LinkedIn page');
      console.log('JobJourney: Available elements for debugging:');
      console.log('  - h1 elements:', document.querySelectorAll('h1').length);
      console.log('  - job-title elements:', document.querySelectorAll('[class*="job-title"]').length);
      console.log('  - company elements:', document.querySelectorAll('[class*="company"]').length);
      return null;
    }

    return {
      company,
      role,
      location: this.getLocation(),
      salary: this.getSalary(),
      description: this.getDescription(),
      link: this.getJobLink(),
      externalJobId: this.getJobId(),
      source: this.source,
    };
  }

  private getCompany(): string {
    // Job detail page selectors - try multiple patterns based on HAR analysis
    const selectors = [
      // Primary selector from HAR (2024+ UI)
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      // Subtitle grouping often contains company link
      '.job-details-jobs-unified-top-card__subtitle-primary-grouping a[href*="/company/"]',
      '.job-details-jobs-unified-top-card__primary-description-container a[href*="/company/"]',
      // Older UI patterns
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      // Public/guest job pages
      '.topcard__org-name-link',
      '[data-tracking-control-name="public_jobs_topcard-org-name"]',
      // Generic company link fallback
      '.artdeco-entity-lockup__subtitle a',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length > 1 && text.length < 200) {
          console.log('JobJourney: Found company via selector:', selector);
          return text;
        }
      }
    }

    // Fallback: Find any company link in the top card area
    const topCard = document.querySelector('[class*="top-card"], [class*="topcard"]');
    if (topCard) {
      const companyLinks = topCard.querySelectorAll('a[href*="/company/"]');
      for (const link of companyLinks) {
        const text = link.textContent?.trim();
        if (text && text.length > 1 && text.length < 100) {
          console.log('JobJourney: Found company via fallback company link');
          return text;
        }
      }
    }

    return '';
  }

  private getRole(): string {
    const selectors = [
      // Primary selector with typography class from HAR
      'h1.job-details-jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title a',
      '.job-details-jobs-unified-top-card__job-title',
      // Older UI
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      // Public/guest pages
      '.topcard__title',
      // Typography-based selector (LinkedIn uses t-24 for large headings)
      '.t-24.job-details-jobs-unified-top-card__job-title',
      'h1.t-24',
      // Generic fallback - find h1 within job details
      '.jobs-search__job-details h1',
      '.job-view-layout h1',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        // Filter out generic LinkedIn headers and navigation
        if (text &&
            text.length > 2 &&
            text.length < 200 &&
            !text.includes('LinkedIn') &&
            !text.includes('Sign in') &&
            !text.includes('Join now')) {
          console.log('JobJourney: Found role via selector:', selector);
          return text;
        }
      }
    }

    // Ultimate fallback: first h1 that looks like a job title
    const h1Elements = document.querySelectorAll('h1');
    for (const h1 of h1Elements) {
      const text = h1.textContent?.trim();
      if (text &&
          text.length > 5 &&
          text.length < 150 &&
          !text.includes('LinkedIn') &&
          !text.includes('Sign') &&
          !text.includes('Join')) {
        console.log('JobJourney: Found role via h1 fallback');
        return text;
      }
    }

    return '';
  }

  private getLocation(): string {
    const selectors = [
      // New UI - location is typically the second item in the metadata
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__workplace-type',
      '.topcard__flavor--bullet',
      // Try finding by content pattern
      '[class*="location"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        // Location typically contains city names or "Remote"
        if (text && (
          text.includes(',') || // City, State format
          text.toLowerCase().includes('remote') ||
          text.toLowerCase().includes('hybrid') ||
          text.toLowerCase().includes('on-site') ||
          /^[A-Z][a-z]+/.test(text) // Starts with capital letter (city name)
        )) {
          return text;
        }
      }
    }

    // Try to extract from the primary description container
    const container = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container');
    if (container) {
      const spans = container.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent?.trim() || '';
        if (text.includes(',') && text.length < 50) {
          return text;
        }
      }
    }

    return '';
  }

  private getSalary(): string {
    const selectors = [
      '.job-details-jobs-unified-top-card__job-insight--highlight span',
      '.salary-main-rail__data-body',
      '[class*="salary"]',
      '.compensation__salary',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        if (text && (
          text.includes('$') ||
          text.includes('£') ||
          text.includes('€') ||
          text.includes('/yr') ||
          text.includes('/hr') ||
          text.includes('year') ||
          text.includes('hour')
        )) {
          return text;
        }
      }
    }

    return '';
  }

  private getDescription(): string {
    const selectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.description__text',
      '#job-details',
      '[class*="description"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        if (text.length > 100) {
          return this.cleanDescription(text);
        }
      }
    }

    return '';
  }

  private getJobLink(): string {
    // Clean the URL to remove tracking params
    const url = new URL(window.location.href);
    // Keep only the path for a clean URL
    return `https://www.linkedin.com${url.pathname}`;
  }

  private getJobId(): string | undefined {
    // Extract job ID from URL
    // Format: /jobs/view/123456789/ or /jobs/view/123456789?...
    const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
    if (match) return match[1];

    // Also try from currentJobId in URL params
    const url = new URL(window.location.href);
    const currentJobId = url.searchParams.get('currentJobId');
    if (currentJobId) return currentJobId;

    return undefined;
  }
}
