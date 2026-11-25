/** Turns a human label into a stable snake_case value. */
export const slugify = (str: string) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
