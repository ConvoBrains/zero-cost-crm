/**
 * Optional link helpers for company/contact forms.
 * Native `type="url"` rejects bare domains like `simplilearn.com` and
 * free-text source tags like `leads-import-jul27-2026`.
 */

/** True when the value already has a URI scheme (`https:`, `mailto:`, …). */
export function hasUriScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value.trim());
}

/**
 * Normalize an optional website / LinkedIn / profile value for storage.
 * - empty → ''
 * - already has a scheme → trimmed as-is
 * - bare domain / host+path (e.g. `simplilearn.com`) → `https://…`
 * - other free text → trimmed as-is (caller may still store it)
 */
export function normalizeOptionalUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (hasUriScheme(value)) return value;
  // host.tld or host.tld/path — common paste from Sheets / LinkedIn without scheme
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}
