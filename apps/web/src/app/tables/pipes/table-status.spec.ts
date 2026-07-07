import { TableStatusPipe } from './table-status';
import { describe, beforeEach, it, expect } from 'vitest';

describe('TableStatusPipe', () => {
  let pipe: TableStatusPipe;

  beforeEach(() => {
    pipe = new TableStatusPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return correct class for OCCUPIED', () => {
    expect(pipe.transform('OCCUPIED', 'class')).toBe('bg-error/10 border-error/40 text-error');
  });

  it('should return correct class for FREE', () => {
    expect(pipe.transform('FREE', 'class')).toBe('bg-secondary/10 border-secondary/40 text-secondary');
  });

  it('should return correct icon for OCCUPIED', () => {
    expect(pipe.transform('OCCUPIED', 'icon')).toBe('group');
  });

  it('should return correct icon for FREE', () => {
    expect(pipe.transform('FREE', 'icon')).toBe('check_circle');
  });

  it('should return correct label for OCCUPIED', () => {
    expect(pipe.transform('OCCUPIED', 'label')).toBe('orders.table_occupied');
  });

  it('should return correct label for FREE', () => {
    expect(pipe.transform('FREE', 'label')).toBe('orders.table_free');
  });

  it('should return empty string for unknown type', () => {
    expect(pipe.transform('FREE', 'unknown' as any)).toBe('');
  });
});
