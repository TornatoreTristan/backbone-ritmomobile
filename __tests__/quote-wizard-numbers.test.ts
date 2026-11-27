import { parseDecimal, parseInteger } from '@/services/quote-wizard-numbers';

describe('parseDecimal', () => {
  it('reads the French decimal comma instead of truncating at it', () => {
    expect(parseDecimal('85,5')).toBe(85.5);
    expect(parseDecimal('450,50')).toBe(450.5);
    expect(parseDecimal('12,5')).toBe(12.5);
  });

  it('reads dot decimals and integers', () => {
    expect(parseDecimal('85.5')).toBe(85.5);
    expect(parseDecimal('75')).toBe(75);
    expect(parseDecimal('0')).toBe(0);
    expect(parseDecimal(',5')).toBe(0.5);
    expect(parseDecimal('85,')).toBe(85);
  });

  it('ignores surrounding and thousands spaces', () => {
    expect(parseDecimal('  85,5 ')).toBe(85.5);
    expect(parseDecimal('1 250,50')).toBe(1250.5);
    expect(parseDecimal('1 250,50')).toBe(1250.5);
  });

  it.each(['', '   ', ',', '.', 'abc', '85m', '-5', '1,2,3', '1.2.3', '1e3', 'NaN'])(
    'returns null (never NaN) for %p',
    (input) => {
      expect(parseDecimal(input)).toBeNull();
    },
  );

  it('returns null for null and undefined', () => {
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal(undefined)).toBeNull();
  });
});

describe('parseInteger', () => {
  it('reads plain integers', () => {
    expect(parseInteger('3')).toBe(3);
    expect(parseInteger(' 60 ')).toBe(60);
    expect(parseInteger('0')).toBe(0);
  });

  it.each(['', '3,5', '3.5', 'abc', '-1', '1995abc', '1 000'])('returns null for %p', (input) => {
    expect(parseInteger(input)).toBeNull();
  });
});
