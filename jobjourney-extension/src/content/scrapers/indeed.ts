import { BaseScraper } from './base';
import type { ScrapedJobData, JobSource } from '../../shared/types';

export class IndeedScraper extends BaseScraper {
  source: JobSource = 'indeed';

  scrape(): ScrapedJobData | null {
    const company = this.getCompany();
    const role = this.getRole();

    if (!company || !role) {
      console.log('JobJourney: Could not find company or role on Indeed page');
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
    const selectors = [
      // New Indeed UI (2024+)
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '[data-testid="companyName"]',
      // Job view page
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-InlineCompanyRating div[data-company-name="true"]',
      '.jobsearch-CompanyInfoContainer a',
      // Older selectors
      '.icl-u-lg-mr--sm a',
      '.companyName',
      '.company',
      // Generic fallback
      '[data-company-name]',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && text.length > 1 && text.length < 200) {
        return text;
      }
    }

    // Try to find from meta tags
    const metaCompany = document.querySelector('meta[property="og:description"]');
    if (metaCompany) {
      const content = metaCompany.getAttribute('content') || '';
      // Pattern: "Job Title at Company Name..."
      const match = content.match(/at\s+([^.]+)/i);
      if (match) return match[1].trim();
    }

    return '';
  }

  private getRole(): string {
    const selectors = [
      // New Indeed UI
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '[data-testid="simpleHeader-title"]',
      // Job view page
      '.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title-container h1',
      'h1.icl-u-xs-mb--xs',
      // Older selectors
      '.jobTitle',
      '.title',
      // Generic fallback
      'h1',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      // Filter out Indeed headers
      if (text && !text.includes('Indeed') && !text.includes('Sign in') && text.length > 2) {
        return text;
      }
    }

    // Try meta title
    const title = document.querySelector('title')?.textContent || '';
    if (title) {
      // Pattern: "Job Title - Company - Location | Indeed.com"
      const parts = title.split(' - ');
      if (parts.length > 0 && !parts[0].includes('Indeed')) {
        return parts[0].trim();
      }
    }

    return '';
  }

  private getLocation(): string {
    const selectors = [
      // New Indeed UI
      '[data-testid="inlineHeader-companyLocation"]',
      '[data-testid="job-location"]',
      '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
      // Job view page
      '.jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
      '.jobsearch-CompanyInfoWithReview > div:last-child',
      // Older selectors
      '.icl-u-lg-mr--sm.icl-u-xs-mr--xs',
      '.companyLocation',
      '.location',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && text.length > 2 && text.length < 100) {
        // Filter out salary info that might be in same container
        if (!text.includes('$') && !text.includes('year') && !text.includes('hour')) {
          return text;
        }
      }
    }

    return '';
  }

  private getSalary(): string {
    const selectors = [
      // New Indeed UI
      '[data-testid="attribute_snippet_testid"]',
      '[data-testid="jobsearch-JobMetadataHeader-salaryLabel"]',
      // Job view page
      '#salaryInfoAndJobType span',
      '.jobsearch-JobMetadataHeader-item',
      '.salary-snippet-container',
      '.attribute_snippet',
      // Generic
      '[class*="salary"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        if (text && (
          text.includes('$') ||
          text.includes('£') ||
          text.includes('€') ||
          text.includes('/year') ||
          text.includes('/hour') ||
          text.includes('a year') ||
          text.includes('an hour') ||
          text.includes('annually')
        )) {
          return text;
        }
      }
    }

    return '';
  }

  private getDescription(): string {
    const selectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobDescriptionText"]',
      '.jobDescription',
      '#jobDescription',
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
    const url = new URL(window.location.href);
    // Keep only the jk parameter which is the job key
    const jk = url.searchParams.get('jk');
    if (jk) {
      return `https://www.indeed.com/viewjob?jk=${jk}`;
    }
    // For other URL formats, clean up tracking params
    url.searchParams.delete('from');
    url.searchParams.delete('tk');
    url.searchParams.delete('advn');
    return url.toString();
  }

  private getJobId(): string | undefined {
    // Extract job key from URL params
    const url = new URL(window.location.href);
    const jk = url.searchParams.get('jk');
    if (jk) return jk;

    // Try to find in data attributes
    const jobCard = document.querySelector('[data-jk]');
    if (jobCard) {
      return jobCard.getAttribute('data-jk') || undefined;
    }

    return undefined;
  }
}
