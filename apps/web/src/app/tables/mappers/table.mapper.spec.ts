import { describe, expect, it } from 'vitest';
import { asBarId, asTableId, Table, TableStatus } from '@coaster/common';
import { checkIsTable, tableArrayMapper, tableMapper } from './table.mapper';

describe('Table Mapper', () => {
  const validTable: Table = {
    id: asTableId('table-1'),
    barId: asBarId('bar-1'),
    name: 'Mesa 1',
    status: TableStatus.FREE,
  };

  describe('checkIsTable', () => {
    it('should return true for valid table', () => {
      expect(checkIsTable(validTable)).toBe(true);
    });

    it('should return false for null', () => {
      expect(checkIsTable(null)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(checkIsTable({})).toBe(false);
    });

    it('should return false for object missing fields', () => {
      expect(checkIsTable({ id: '1' })).toBe(false);
    });
  });

  describe('tableMapper', () => {
    it('should map a valid table', () => {
      expect(tableMapper(validTable)).toEqual(validTable);
    });

    it('should throw Error for invalid table', () => {
      expect(() => tableMapper({})).toThrow('Invalid Table payload');
    });
  });

  describe('tableArrayMapper', () => {
    it('should map valid array of tables', () => {
      expect(tableArrayMapper([validTable])).toEqual([validTable]);
    });

    it('should return empty array for empty input', () => {
      expect(tableArrayMapper([])).toEqual([]);
    });

    it('should throw Error if input is not an array', () => {
      expect(() => tableArrayMapper({})).toThrow('Expected array of Tables');
    });
  });
});
