const DNI_CONTROL_TABLE = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIE_PREFIX_MAP: Record<string, string> = { X: '0', Y: '1', Z: '2' };
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';

const CIF_NUMERIC_ONLY_PREFIXES = new Set(['A', 'B', 'E', 'H']);
const CIF_ALPHA_ONLY_PREFIXES = new Set(['P', 'Q', 'R', 'S', 'N', 'W']);

const DNI_PATTERN = /^[0-9]{8}[A-Z]$/;
const NIE_PATTERN = /^[XYZ][0-9]{7}[A-Z]$/;
const CIF_PATTERN = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;
const GENERIC_TAX_ID_PATTERN = /^[A-Z0-9]{5,20}$/;

/** Strip whitespace, hyphens, and dots, and convert a tax ID to uppercase. */
export function normalizeTaxId(rawTaxId: string): string {
  return rawTaxId.trim().replace(/[\s.-]+/g, '').toUpperCase();
}

function isValidDni(taxId: string): boolean {
  if (!DNI_PATTERN.test(taxId)) {
    return false;
  }
  const num = Number.parseInt(taxId.slice(0, 8), 10);
  return taxId[8] === DNI_CONTROL_TABLE[num % 23];
}

function isValidNie(taxId: string): boolean {
  if (!NIE_PATTERN.test(taxId)) {
    return false;
  }
  const mappedPrefix = NIE_PREFIX_MAP[taxId[0]];
  const num = Number.parseInt(`${mappedPrefix}${taxId.slice(1, 8)}`, 10);
  return taxId[8] === DNI_CONTROL_TABLE[num % 23];
}

function isValidCif(taxId: string): boolean {
  if (!CIF_PATTERN.test(taxId)) {
    return false;
  }

  const prefix = taxId[0];
  const digits = taxId
    .slice(1, 8)
    .split('')
    .map((ch) => Number.parseInt(ch, 10));
  const controlChar = taxId[8];

  let evenSum = 0;
  for (let i = 1; i < digits.length; i += 2) {
    evenSum += digits[i];
  }

  let oddSum = 0;
  for (let i = 0; i < digits.length; i += 2) {
    const doubled = digits[i] * 2;
    oddSum += Math.floor(doubled / 10) + (doubled % 10);
  }

  const controlDigit = (10 - ((evenSum + oddSum) % 10)) % 10;
  const expectedDigit = String(controlDigit);
  const expectedLetter = CIF_CONTROL_LETTERS[controlDigit];

  if (CIF_NUMERIC_ONLY_PREFIXES.has(prefix)) {
    return controlChar === expectedDigit;
  }
  if (CIF_ALPHA_ONLY_PREFIXES.has(prefix)) {
    return controlChar === expectedLetter;
  }
  return controlChar === expectedDigit || controlChar === expectedLetter;
}

/** Return true when rawTaxId passes official Spanish DNI, NIE, or CIF checksums. */
export function isValidSpanishTaxId(rawTaxId: string): boolean {
  const normalized = normalizeTaxId(rawTaxId);
  if (normalized.length !== 9) {
    return false;
  }
  return isValidDni(normalized) || isValidNie(normalized) || isValidCif(normalized);
}

/** Return true when rawTaxId passes generic alphanumeric tax ID validation (5-20 chars). */
export function isValidGenericTaxId(rawTaxId: string): boolean {
  const normalized = normalizeTaxId(rawTaxId);
  return GENERIC_TAX_ID_PATTERN.test(normalized);
}

