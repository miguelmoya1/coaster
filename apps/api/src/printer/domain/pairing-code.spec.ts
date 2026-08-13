import { describe, expect, it } from 'vitest';
import { codeFromFilename, newPairingCode, PAIRING_CODE_LENGTH } from './pairing-code';

describe('newPairingCode', () => {
  it('should avoid the characters people mistype', () => {
    const codes = Array.from({ length: 200 }, () => newPairingCode()).join('');

    expect(codes).not.toMatch(/[AEIOU01]/);
  });

  it('should not repeat itself in any run worth worrying about', () => {
    const codes = new Set(Array.from({ length: 500 }, () => newPairingCode()));

    expect(codes.size).toBe(500);
    expect([...codes][0]).toHaveLength(PAIRING_CODE_LENGTH);
  });
});

describe('codeFromFilename', () => {
  it('should read the code out of the name it was downloaded with', () => {
    expect(codeFromFilename('coaster-printer-7F3KB92X.exe')).toBe('7F3KB92X');
  });

  it('should survive the copy a browser makes of a repeated download', () => {
    expect(codeFromFilename('coaster-printer-7F3KB92X (1).exe')).toBe('7F3KB92X');
  });

  it('should survive a full path and a different case', () => {
    expect(codeFromFilename('C:\\Users\\Ana\\Downloads\\coaster-printer-7f3kb92x.exe')).toBe('7F3KB92X');
  });

  it('should find nothing in a file somebody renamed', () => {
    expect(codeFromFilename('impresora.exe')).toBeNull();
  });
});
