import { BaseScraper } from './base';
import type { ScrapedJobData, JobSource } from '../../shared/types';

export class GlassdoorScraper extends BaseScraper {
  source: JobSource = 'glassdoor';

  scrape(): ScrapedJobData | null {
    const company = this.getCompany();
    const role = this.getRole();

    if (!company || !role) {
      console.log('JobJourney: Could not find company or role on Glassdoor page');
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
      '[data-test="employer-name"]',
      '.employerName',
      '.css-87uc0g',
      '.e1tk4kwz1',
      'div[class*="EmployerProfile"] a',
      '.job-details-title-container .employer-name',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text) return text;
    }

    return '';
  }

  private getRole(): string {
    const selectors = [
      '[data-test="job-title"]',
      '.JobDetails_jobTitle__Rw_gn',
      '.e1tk4kwz0',
      '.job-title',
      'h1[class*="JobTitle"]',
      '.css-1j389vi',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && !text.includes('Glassdoor')) return text;
    }

    return '';
  }

  private getLocation(): string {
    const selectors = [
      '[data-test="location"]',
      '.JobDetails_location__mSg5h',
      '.e1tk4kwz4',
      '.location',
      'span[class*="location"]',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text) return text;
    }

    return '';
  }

  private getSalary(): string {
    const selectors = [
      '[data-test="detailSalary"]',
      '.SalaryEstimate_salaryEstimate__lVJKf',
      '.e1wijj242',
      '.salary-estimate',
      'span[class*="salary"]',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && (text.includes('$') || text.includes('K') || text.includes('/yr'))) {
        return text;
      }
    }

    return '';
  }

  private getDescription(): string {
    const selectors = [
      '[data-test="description"]',
      '.JobDetails_jobDescription__uW_fK',
      '.jobDescriptionContent',
      '.desc',
      'div[class*="JobDescription"]',
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
    return window.location.href.split('?')[0];
  }

  private getJobId(): string | undefined {
    // Extract job ID from URL
    // Format: /job-listing/title-company-JOB_ID.htm or /Job/title-company-JOB_ID.htm
    const match = window.location.pathname.match(/[_-](\d+)\.htm/);
    return match?.[1];
  }
}
