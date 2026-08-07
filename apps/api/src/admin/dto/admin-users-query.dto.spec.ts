import 'reflect-metadata';

import { Role } from '@coaster/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { AdminUsersQueryDto } from './admin-users-query.dto';

const parse = (query: Record<string, string>) =>
  plainToInstance(AdminUsersQueryDto, query, { enableImplicitConversion: true });

describe('AdminUsersQueryDto', () => {
  it('should read active=false as false rather than as a truthy string', () => {
    const dto = parse({ active: 'false' });

    expect(dto.active).toBe(false);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('should read active=true as true', () => {
    expect(parse({ active: 'true' }).active).toBe(true);
  });

  it('should leave active unset when the filter is not in the query', () => {
    const dto = parse({ q: 'ana' });

    expect(dto.active).toBeUndefined();
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('should reject a value that is neither true nor false', () => {
    expect(validateSync(parse({ active: 'maybe' }))).not.toHaveLength(0);
  });

  it('should convert paging and keep the role enum', () => {
    const dto = parse({ page: '3', pageSize: '50', role: Role.ADMIN });

    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(50);
    expect(validateSync(dto)).toHaveLength(0);
  });
});
