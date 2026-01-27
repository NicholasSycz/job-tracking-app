import type { ScrapedJobData, JobSource } from '../../shared/types';

export abstract class BaseScraper {
  abstract source: JobSource;

  abstract scrape(): ScrapedJobData | null;

  // Helper to safely extract text content
  protected getText(selector: string, parent: Element | Document = document): string {
    const element = parent.querySelector(selector);
    return element?.textContent?.trim() || '';
  }

  // Helper to extract attribute
  protected getAttribute(selector: string, attr: string, parent: Element | Document = document): string {
    const element = parent.querySelector(selector);
    return element?.getAttribute(attr)?.trim() || '';
  }

  // Helper to extract href
  protected getHref(selector: string, parent: Element | Document = document): string {
    return this.getAttribute(selector, 'href', parent);
  }

  // Helper to extract job ID from URL
  protected extractJobId(url: string, pattern: RegExp): string | undefined {
    const match = url.match(pattern);
    return match?.[1];
  }

  // Clean up description text
  protected cleanDescription(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
