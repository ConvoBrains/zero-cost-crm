import { describe, expect, it } from 'vitest';
import { hasUriScheme, normalizeOptionalUrl } from '../../src/lib/urls';

describe('hasUriScheme', () => {
  it('detects common schemes', () => {
    expect(hasUriScheme('https://simplilearn.com')).toBe(true);
    expect(hasUriScheme('http://example.com')).toBe(true);
    expect(hasUriScheme('mailto:a@b.com')).toBe(true);
  });

  it('rejects bare domains', () => {
    expect(hasUriScheme('simplilearn.com')).toBe(false);
    expect(hasUriScheme('')).toBe(false);
  });
});

describe('normalizeOptionalUrl', () => {
  it('returns empty for blank input', () => {
    expect(normalizeOptionalUrl('')).toBe('');
    expect(normalizeOptionalUrl('   ')).toBe('');
  });

  it('keeps values that already have a scheme', () => {
    expect(normalizeOptionalUrl('https://simplilearn.com')).toBe('https://simplilearn.com');
    expect(normalizeOptionalUrl('  http://example.com/path  ')).toBe('http://example.com/path');
  });

  it('prefixes https:// for bare domains (the save-blocker case)', () => {
    expect(normalizeOptionalUrl('simplilearn.com')).toBe('https://simplilearn.com');
    expect(normalizeOptionalUrl('www.example.co.uk/about')).toBe('https://www.example.co.uk/about');
    expect(normalizeOptionalUrl('linkedin.com/company/acme')).toBe(
      'https://linkedin.com/company/acme'
    );
  });

  it('leaves free-text source tags unchanged', () => {
    expect(normalizeOptionalUrl('leads-import-jul27-2026')).toBe('leads-import-jul27-2026');
  });
});
