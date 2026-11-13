import {
  isValidGenericTaxId,
  isValidSpanishTaxId,
  normalizeTaxId,
} from './tax-id-validator';

describe('TaxIdValidator (Spanish DNI/NIE/CIF & Generic)', () => {
  describe('normalizeTaxId', () => {
    it('should strip spaces, hyphens, and dots and uppercase the value', () => {
      expect(normalizeTaxId('  b-87.654.323 ')).toBe('B87654323');
      expect(normalizeTaxId(' 12345678-z ')).toBe('12345678Z');
    });
  });

  describe('isValidSpanishTaxId', () => {
    it('should accept valid DNI values', () => {
      expect(isValidSpanishTaxId('12345678Z')).toBeTrue();
      expect(isValidSpanishTaxId('12.345.678-z')).toBeTrue();
    });

    it('should reject invalid DNI checksums', () => {
      expect(isValidSpanishTaxId('12345678A')).toBeFalse();
      expect(isValidSpanishTaxId('1234567Z')).toBeFalse();
    });

    it('should accept valid NIE values for X and Y prefixes', () => {
      expect(isValidSpanishTaxId('X1234567L')).toBeTrue();
      expect(isValidSpanishTaxId('Y1234567X')).toBeTrue();
    });

    it('should reject invalid NIE checksums', () => {
      expect(isValidSpanishTaxId('X1234567A')).toBeFalse();
    });

    it('should accept valid CIF values (numeric-only and alpha-only control prefixes)', () => {
      expect(isValidSpanishTaxId('B87654323')).toBeTrue();
      expect(isValidSpanishTaxId('A12345674')).toBeTrue();
      expect(isValidSpanishTaxId('Q2826000H')).toBeTrue();
    });

    it('should reject invalid CIF control characters or wrong prefix rule', () => {
      expect(isValidSpanishTaxId('B87654329')).toBeFalse();
      expect(isValidSpanishTaxId('B8765432C')).toBeFalse();
    });
  });

  describe('isValidGenericTaxId', () => {
    it('should accept alphanumeric identifiers between 5 and 20 chars after normalization', () => {
      expect(isValidGenericTaxId('PT-509.876.543')).toBeTrue();
      expect(isValidGenericTaxId('US123456789')).toBeTrue();
    });

    it('should reject identifiers shorter than 5 chars or containing symbols', () => {
      expect(isValidGenericTaxId('AB12')).toBeFalse();
      expect(isValidGenericTaxId('DE_123456')).toBeFalse();
    });
  });
});

