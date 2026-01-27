import { BaseScraper } from './base';
import type { ScrapedJobData, JobSource } from '../../shared/types';

export class LinkedInScraper extends BaseScraper {
  source: JobSource = 'linkedin';

  scrape(): ScrapedJobData | null {
    // Try multiple selectors as LinkedIn's DOM structure can vary
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
    // Job detail page selectors
    const selectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '[data-tracking-control-name="public_jobs_topcard-org-name"]',
      '.topcard__org-name-link',
      '.company-name',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text) return text;
    }

    return '';
  }

  private getRole(): string {
    const selectors = [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '.topcard__title',
      'h1.jobs-unified-top-card__job-title',
      'h1',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && !text.includes('LinkedIn')) return text;
    }

    return '';
  }

  private getLocation(): string {
    const selectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
      '.job-details-jobs-unified-top-card__workplace-type',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text) return text;
    }

    return '';
  }

  private getSalary(): string {
    const selectors = [
      '.job-details-jobs-unified-top-card__job-insight--highlight span',
      '.salary-main-rail__data-body',
      '[class*="salary"]',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && (text.includes('$') || text.includes('/yr') || text.includes('/hr'))) {
        return text;
      }
    }

    return '';
  }

  private getDescription(): string {
    const selectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.description__text',
      '[class*="description"]',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && text.length > 100) {
        return this.cleanDescription(text);
      }
    }

    return '';
  }

  private getJobLink(): string {
    // Clean the URL to remove tracking params
    const url = new URL(window.location.href);
    url.search = '';
    return url.toString();
  }

  private getJobId(): string | undefined {
    // Extract job ID from URL
    // Format: /jobs/view/123456789/ or /jobs/view/123456789?...
    const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
    return match?.[1];
  }
}
