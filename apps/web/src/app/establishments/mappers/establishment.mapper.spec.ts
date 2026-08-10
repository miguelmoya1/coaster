import type { Establishment } from '@coaster/common';
import { asEstablishmentId } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import { establishmentArrayMapper, establishmentMapper, checkIsEstablishment } from './establishment.mapper';

describe('Establishment Mapper', () => {
  const validEstablishment: Establishment = { id: asEstablishmentId('establishment-1'), name: 'Tapas Establishment' };

  describe('checkIsEstablishment', () => {
    it('should return true for valid establishment', () => {
      expect(checkIsEstablishment({ id: '1', name: 'Establishment' })).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsEstablishment(null)).toBe(false);
      expect(checkIsEstablishment({ name: 'Establishment' })).toBe(false);
      expect(checkIsEstablishment({ id: '1' })).toBe(false);
    });
  });

  describe('establishmentMapper', () => {
    it('should map a valid establishment', () => {
      expect(establishmentMapper(validEstablishment)).toEqual(validEstablishment);
    });

    it('should throw Error for invalid establishment', () => {
      expect(() => establishmentMapper({})).toThrow(Error);
      expect(() => establishmentMapper(null)).toThrow(Error);
      expect(() => establishmentMapper(undefined)).toThrow(Error);
      expect(() => establishmentMapper({ id: '1' })).toThrow(Error);
      expect(() => establishmentMapper({ name: 'Establishment' })).toThrow(Error);
    });
  });

  describe('establishmentArrayMapper', () => {
    it('should map an array of valid establishments', () => {
      expect(establishmentArrayMapper([validEstablishment])).toEqual([validEstablishment]);
    });

    it('should throw an array for non-array input', () => {
      expect(() => establishmentArrayMapper({})).toThrow(Error);
      expect(() => establishmentArrayMapper(null)).toThrow(Error);
      expect(() => establishmentArrayMapper(undefined)).toThrow(Error);
      expect(() => establishmentArrayMapper(1)).toThrow(Error);
      expect(() => establishmentArrayMapper('1')).toThrow(Error);
    });
  });
});
