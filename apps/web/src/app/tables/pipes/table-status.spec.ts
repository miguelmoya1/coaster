import { TableStatus } from '@coaster/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { TableStatusPipe } from './table-status';

describe('TableStatusPipe', () => {
  let pipe: TableStatusPipe;

  beforeEach(() => {
    pipe = new TableStatusPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return correct class for OCCUPIED', () => {
    expect(pipe.transform(TableStatus.OCCUPIED, 'class')).toBe('bg-error/10 border-error/40 text-error');
  });

  it('should return correct class for FREE', () => {
    expect(pipe.transform(TableStatus.FREE, 'class')).toBe('bg-secondary/10 border-secondary/40 text-secondary');
  });

  it('should return correct icon for OCCUPIED', () => {
    expect(pipe.transform(TableStatus.OCCUPIED, 'icon')).toBe('group');
  });

  it('should return correct icon for FREE', () => {
    expect(pipe.transform(TableStatus.FREE, 'icon')).toBe('check_circle');
  });

  it('should return correct label for OCCUPIED', () => {
    expect(pipe.transform(TableStatus.OCCUPIED, 'label')).toBe('orders.table_occupied');
  });

  it('should return correct label for FREE', () => {
    expect(pipe.transform(TableStatus.FREE, 'label')).toBe('orders.table_free');
  });

  it('should return empty string for unknown type', () => {
    expect(pipe.transform(TableStatus.FREE, 'unknown' as any)).toBe('');
  });
});
