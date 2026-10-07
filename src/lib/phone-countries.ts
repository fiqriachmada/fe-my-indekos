export interface CountryDialInfo {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  formatPlaceholder: string;
}

export const COUNTRIES: CountryDialInfo[] = [
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', formatPlaceholder: '812-3456-7890' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', formatPlaceholder: '12-345-6789' },
  { code: 'SG', name: 'Singapura', dialCode: '+65', flag: '🇸🇬', formatPlaceholder: '8123-4567' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', formatPlaceholder: '81-234-5678' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', formatPlaceholder: '91-234-5678' },
  { code: 'PH', name: 'Filipina', dialCode: '+63', flag: '🇵🇭', formatPlaceholder: '912-345-6789' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', formatPlaceholder: '412-345-678' },
  { code: 'US', name: 'Amerika Serikat', dialCode: '+1', flag: '🇺🇸', formatPlaceholder: '202-555-0123' },
  { code: 'GB', name: 'Inggris', dialCode: '+44', flag: '🇬🇧', formatPlaceholder: '7911-123456' },
  { code: 'JP', name: 'Jepang', dialCode: '+81', flag: '🇯🇵', formatPlaceholder: '90-1234-5678' },
  { code: 'KR', name: 'Korea Selatan', dialCode: '+82', flag: '🇰🇷', formatPlaceholder: '10-1234-5678' },
  { code: 'CN', name: 'Tiongkok', dialCode: '+86', flag: '🇨🇳', formatPlaceholder: '138-0013-8000' },
  { code: 'SA', name: 'Arab Saudi', dialCode: '+966', flag: '🇸🇦', formatPlaceholder: '50-123-4567' },
  { code: 'AE', name: 'Uni Emirat Arab', dialCode: '+971', flag: '🇦🇪', formatPlaceholder: '50-123-4567' },
  { code: 'DE', name: 'Jerman', dialCode: '+49', flag: '🇩🇪', formatPlaceholder: '151-23456789' },
  { code: 'FR', name: 'Prancis', dialCode: '+33', flag: '🇫🇷', formatPlaceholder: '6-12-34-56-78' },
];

/**
 * Normalizes user typed number with the selected country dialCode:
 * If user types:
 * - "082233528492" with dialCode "+62" -> strips leading 0 to "82233528492"
 * - "+6282233528492" with dialCode "+62" -> strips "+62" and leading 0 to "82233528492"
 * - "6282233528492" -> strips prefix "62" to "82233528492"
 */
export function cleanLocalPhoneNumber(raw: string, dialCode: string): string {
  let digits = raw.replace(/\D/g, '');
  const dialDigits = dialCode.replace(/\D/g, '');

  if (digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  }

  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  return digits;
}

export function formatFullPhoneNumber(localNumber: string, dialCode: string): string {
  const clean = cleanLocalPhoneNumber(localNumber, dialCode);
  return clean ? `${dialCode}${clean}` : '';
}
