import { asBarId, Bar } from '@coaster/interfaces';
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
      expect(() => barMapper({ id: '1' })).toThrow('Invalid Bar payload');
    });
  });

  describe('barArrayMapper', () => {
    it('should map an array of valid bars', () => {
      expect(barArrayMapper([validBar])).toEqual([validBar]);
    });

    it('should throw an array for non-array input', () => {
      expect(() => barArrayMapper({})).toThrow('Expected array of Bars');
    });
  });
});
