import { JobApplication } from '../types';

/**
 * Export applications to CSV format
 */
export function exportToCSV(applications: JobApplication[]): void {
  const headers = [
    'Company',
    'Role',
    'Status',
    'Date Applied',
    'Location',
    'Salary',
    'Description',
    'Link',
    'Notes',
  ];

  const rows = applications.map((app) => [
    escapeCSVField(app.company),
    escapeCSVField(app.role),
    app.status,
    app.dateApplied,
    escapeCSVField(app.location || ''),
    escapeCSVField(app.salary || ''),
    escapeCSVField(app.description || ''),
    escapeCSVField(app.link || ''),
    escapeCSVField(app.notes || ''),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  downloadFile(csvContent, 'applications.csv', 'text/csv');
}

/**
 * Export applications to JSON format
 */
export function exportToJSON(applications: JobApplication[]): void {
  const data = applications.map((app) => ({
    company: app.company,
    role: app.role,
    status: app.status,
    dateApplied: app.dateApplied,
    location: app.location || null,
    salary: app.salary || null,
    description: app.description || null,
    link: app.link || null,
    notes: app.notes || null,
  }));

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, 'applications.json', 'application/json');
}

/**
 * Escape a field for CSV format
 */
function escapeCSVField(field: string): string {
  // If the field contains a comma, newline, or quote, wrap it in quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    // Escape existing quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return field;
}

/**
 * Trigger a file download in the browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
