import { describe, expect, it } from 'vitest';
import { asBarId, Bar } from '@coaster/common';
import { barArrayMapper, barMapper, checkIsBar } from './bar.mapper';

describe('Bar Mapper', () => {
  const validBar: Bar = { id: asBarId('bar-1'), name: 'Tapas Bar' };

  describe('checkIsBar', () => {
    it('should return true for valid bar', () => {
      expect(checkIsBar({ id: '1', name: 'Bar' })).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsBar(null)).toBe(false);
      expect(checkIsBar({ name: 'Bar' })).toBe(false);
      expect(checkIsBar({ id: '1' })).toBe(false);
    });
  });

  describe('barMapper', () => {
    it('should map a valid bar', () => {
      expect(barMapper(validBar)).toEqual(validBar);
    });

    it('should throw Error for invalid bar', () => {
      expect(() => barMapper({})).toThrow(Error);
      expect(() => barMapper(null)).toThrow(Error);
      expect(() => barMapper(undefined)).toThrow(Error);
      expect(() => barMapper({ id: '1' })).toThrow(Error);
      expect(() => barMapper({ name: 'Bar' })).toThrow(Error);
    });
  });

  describe('barArrayMapper', () => {
    it('should map an array of valid bars', () => {
      expect(barArrayMapper([validBar])).toEqual([validBar]);
    });

    it('should throw an array for non-array input', () => {
      expect(() => barArrayMapper({})).toThrow(Error);
      expect(() => barArrayMapper(null)).toThrow(Error);
      expect(() => barArrayMapper(undefined)).toThrow(Error);
      expect(() => barArrayMapper(1)).toThrow(Error);
      expect(() => barArrayMapper('1')).toThrow(Error);
    });
  });
});
