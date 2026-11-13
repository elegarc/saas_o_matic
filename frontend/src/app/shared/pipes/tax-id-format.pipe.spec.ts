import { TaxIdFormatPipe } from './tax-id-format.pipe';

describe('TaxIdFormatPipe', () => {
  const pipe = new TaxIdFormatPipe();

  it('should return empty string for null or undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should trim and uppercase tax IDs', () => {
    expect(pipe.transform('  b58818501  ')).toBe('B58818501');
    expect(pipe.transform('12345678z')).toBe('12345678Z');
  });
});

