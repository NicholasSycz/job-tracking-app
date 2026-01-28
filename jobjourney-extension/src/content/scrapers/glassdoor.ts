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
      // New Glassdoor UI (2024+)
      '[data-test="employer-name"]',
      '[data-test="employerName"]',
      // Job listing page
      '.EmployerProfile_compactEmployerName__9MGcV',
      '.EmployerProfile_employerNameLink__0dVe5',
      '.e1tk4kwz1', // Dynamic class - may change
      // Older selectors
      '.employerName',
      '.employer-name',
      '.css-87uc0g',
      // Job details container
      '.JobDetails_jobDetailsHeader__fvYwB a',
      'div[class*="EmployerProfile"] a',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && text.length > 1 && text.length < 200) {
        return text;
      }
    }

    // Try to find from breadcrumb or header
    const headerLinks = document.querySelectorAll('a[href*="/Overview/"]');
    for (const link of headerLinks) {
      const text = link.textContent?.trim();
      if (text && text.length > 1 && text.length < 100) {
        return text;
      }
    }

    return '';
  }

  private getRole(): string {
    const selectors = [
      // New Glassdoor UI
      '[data-test="job-title"]',
      '[data-test="jobTitle"]',
      // Job listing page
      '.JobDetails_jobTitle__Rw_gn',
      '.JobDetails_jobDetailsHeader__fvYwB h1',
      '.e1tk4kwz0', // Dynamic class
      // Older selectors
      '.job-title',
      '.title',
      'h1[class*="JobTitle"]',
      '.css-1j389vi',
      // Generic h1
      'h1',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      // Filter out generic Glassdoor headers
      if (text && !text.includes('Glassdoor') && !text.includes('Sign In') && text.length > 2) {
        return text;
      }
    }

    // Try document title
    const title = document.querySelector('title')?.textContent || '';
    if (title) {
      // Pattern: "Job Title - Company | Glassdoor"
      const parts = title.split(' - ');
      if (parts.length > 0 && !parts[0].includes('Glassdoor')) {
        return parts[0].trim();
      }
    }

    return '';
  }

  private getLocation(): string {
    const selectors = [
      // New Glassdoor UI
      '[data-test="location"]',
      '[data-test="emp-location"]',
      // Job listing page
      '.JobDetails_location__mSg5h',
      '.e1tk4kwz4', // Dynamic class
      // Older selectors
      '.location',
      '.job-location',
      'span[class*="location"]',
      '[class*="Location"]',
    ];

    for (const selector of selectors) {
      const text = this.getText(selector);
      if (text && text.length > 2 && text.length < 100) {
        return text;
      }
    }

    // Try to find location from job metadata
    const metaItems = document.querySelectorAll('[class*="JobDetails"] span');
    for (const item of metaItems) {
      const text = item.textContent?.trim() || '';
      // Location patterns
      if (text && (
        text.includes(',') || // City, State format
        text.toLowerCase().includes('remote') ||
        text.toLowerCase().includes('hybrid')
      ) && !text.includes('$')) {
        return text;
      }
    }

    return '';
  }

  private getSalary(): string {
    const selectors = [
      // New Glassdoor UI
      '[data-test="detailSalary"]',
      '[data-test="salaryEstimate"]',
      // Job listing page
      '.SalaryEstimate_salaryEstimate__lVJKf',
      '.e1wijj242', // Dynamic class
      // Older selectors
      '.salary-estimate',
      '.salary',
      'span[class*="salary"]',
      '[class*="Salary"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        if (text && (
          text.includes('$') ||
          text.includes('£') ||
          text.includes('€') ||
          text.includes('K') ||
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
      // New Glassdoor UI
      '[data-test="description"]',
      '[data-test="jobDescriptionContent"]',
      // Job listing page
      '.JobDetails_jobDescription__uW_fK',
      '.JobDetails_jobDescription__6VeBn',
      '.jobDescriptionContent',
      // Older selectors
      '.desc',
      '.description',
      'div[class*="JobDescription"]',
      '#JobDescriptionContainer',
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
    // Clean the URL - remove tracking params
    const url = new URL(window.location.href);
    url.search = '';
    return url.toString();
  }

  private getJobId(): string | undefined {
    // Extract job ID from URL
    // Format: /job-listing/title-company-JOB_ID.htm or /Job/title-company-JOB_ID.htm
    const patterns = [
      /[_-](\d{8,})\.htm/,  // ID before .htm
      /jobListingId=(\d+)/, // Query param
      /\/job\/[^/]+-(\d+)/, // In path
    ];

    for (const pattern of patterns) {
      const match = window.location.href.match(pattern);
      if (match) return match[1];
    }

    // Try to find in data attributes
    const jobElement = document.querySelector('[data-job-id], [data-id], [data-job-listing-id]');
    if (jobElement) {
      const id = jobElement.getAttribute('data-job-id') ||
                 jobElement.getAttribute('data-id') ||
                 jobElement.getAttribute('data-job-listing-id');
      if (id) return id;
    }

    return undefined;
  }
}
