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
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-InlineCompanyRating div[data-company-name="true"]',
      '.icl-u-lg-mr--sm a',
      '.companyName',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text) return text;
    }

    return '';
  }

  private getRole(): string {
    const selectors = [
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '.jobsearch-JobInfoHeader-title',
      'h1.icl-u-xs-mb--xs',
      '.jobTitle',
      'h1',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && !text.includes('Indeed')) return text;
    }

    return '';
  }

  private getLocation(): string {
    const selectors = [
      '[data-testid="inlineHeader-companyLocation"]',
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
      '.icl-u-lg-mr--sm.icl-u-xs-mr--xs',
      '.companyLocation',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text) return text;
    }

    return '';
  }

  private getSalary(): string {
    const selectors = [
      '[data-testid="attribute_snippet_testid"]',
      '#salaryInfoAndJobType span',
      '.jobsearch-JobMetadataHeader-item',
      '.salary-snippet-container',
      '.attribute_snippet',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && (text.includes('$') || text.includes('/year') || text.includes('/hour') || text.includes('an hour'))) {
        return text;
      }
    }

    return '';
  }

  private getDescription(): string {
    const selectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobDescriptionText"]',
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
    // Clean the URL
    const url = new URL(window.location.href);
    // Keep only the jk parameter which is the job key
    const jk = url.searchParams.get('jk');
    if (jk) {
      url.search = `?jk=${jk}`;
    }
    return url.toString();
  }

  private getJobId(): string | undefined {
    // Extract job key from URL params
    const url = new URL(window.location.href);
    return url.searchParams.get('jk') || undefined;
  }
}
