// Phone normalization for SMS gateways, which want E.164 (+2526…) while
// the office types local numbers (0617770001). Server-side only.

const DEFAULT_COUNTRY_CODE = "+252"; // Somalia; override with SMS_DEFAULT_COUNTRY_CODE

export function normalizePhone(raw: string, countryCode?: string): string | null {
  const cc = (countryCode ?? process.env.SMS_DEFAULT_COUNTRY_CODE ?? DEFAULT_COUNTRY_CODE)
    .trim()
    .replace(/^00/, "+");
  if (!/^\+\d{1,4}$/.test(cc)) return null;

  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned;
  if (/^00\d{7,15}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  // local format: 0617770001 -> +252617770001
  if (/^0\d{6,14}$/.test(cleaned)) return `${cc}${cleaned.slice(1)}`;
  // bare digits: already carrying the country code, or a local number
  // missing its leading zero
  if (/^\d{7,15}$/.test(cleaned)) {
    return cleaned.startsWith(cc.slice(1)) ? `+${cleaned}` : `${cc}${cleaned}`;
  }
  return null;
}
