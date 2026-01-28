import { BaseScraper } from './base';
import type { ScrapedJobData, JobSource } from '../../shared/types';

export class LinkedInScraper extends BaseScraper {
  source: JobSource = 'linkedin';

  scrape(): ScrapedJobData | null {
    const company = this.getCompany();
    const role = this.getRole();

    if (!company || !role) {
      console.log('JobJourney: Could not find company or role on LinkedIn page');
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
    // Job detail page selectors - try multiple patterns
    const selectors = [
      // New LinkedIn UI (2024+)
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      // Job search results page
      '.job-details-jobs-unified-top-card__primary-description-container a',
      // Older selectors
      '[data-tracking-control-name="public_jobs_topcard-org-name"]',
      '.topcard__org-name-link',
      '.company-name',
      // Generic fallbacks
      'a[href*="/company/"]',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && text.length > 1 && text.length < 200) {
        return text;
      }
    }

    // Try to find company from the primary description container
    const container = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container');
    if (container) {
      const links = container.querySelectorAll('a');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href.includes('/company/')) {
          const text = link.textContent?.trim();
          if (text && text.length > 1) return text;
        }
      }
    }

    return '';
  }

  private getRole(): string {
    const selectors = [
      // New LinkedIn UI
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      // Older selectors
      '.topcard__title',
      'h1.jobs-unified-top-card__job-title',
      // Generic h1
      'h1',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      // Filter out generic LinkedIn headers
      if (text && !text.includes('LinkedIn') && !text.includes('Sign in') && text.length > 2) {
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
