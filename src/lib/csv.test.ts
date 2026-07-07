import { describe, it, expect } from 'vitest';
import { escapeCsvField } from '@/lib/csv';

describe('escapeCsvField', () => {
  it('returns plain values unchanged', () => {
    expect(escapeCsvField('Coffee Shop')).toBe('Coffee Shop');
  });

  it('quotes values containing commas, quotes, or newlines', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line\nbreak')).toBe('"line\nbreak"');
  });

  it('neutralizes formula triggers', () => {
    expect(escapeCsvField('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(escapeCsvField('+1234')).toBe("'+1234");
    expect(escapeCsvField('-1234')).toBe("'-1234");
    expect(escapeCsvField('@cmd')).toBe("'@cmd");
    expect(escapeCsvField('\tpayload')).toBe("'\tpayload");
  });

  it('quotes AND neutralizes when both apply', () => {
    expect(escapeCsvField('=HYPERLINK("http://evil",\n"x")')).toBe(
      '"\'=HYPERLINK(""http://evil"",\n""x"")"'
    );
  });
});
