import { CurrencyConvertPipe } from './currency-convert.pipe';

describe('CurrencyConvertPipe', () => {
  const pipe = new CurrencyConvertPipe();

  it('should return "-" for null or undefined amounts', () => {
    expect(pipe.transform(null)).toBe('-');
    expect(pipe.transform(undefined)).toBe('-');
  });

  it('should format EUR amounts accurately', () => {
    const formatted = pipe.transform(140, 'EUR', 1.0);
    // Standard Spanish currency format contains 140,00 and €
    expect(formatted).toContain('140');
    expect(formatted).toContain('€');
  });

  it('should convert and format in USD with exchange rate', () => {
    const formatted = pipe.transform(100, 'USD', 1.082);
    expect(formatted).toContain('108');
  });
});

