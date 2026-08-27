import type { EstablishmentId, UserId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FichitRepository } from '../data-access/fichit.repository';
import { FichitApi, FichitError } from './fichit-api.service';
import { FichitSync } from './fichit-sync.service';

const establishmentId = 'est_1' as EstablishmentId;
const userId = 'usr_1' as UserId;

describe('FichitSync', () => {
  let api: any;
  let repository: any;
  let sync: FichitSync;

  beforeEach(() => {
    api = {
      enabled: true,
      createCompany: vi.fn(),
      syncEmployee: vi.fn(),
      deactivateEmployee: vi.fn(),
    };
    repository = {
      establishment: vi.fn(),
      owner: vi.fn(),
      linkCompany: vi.fn(),
      member: vi.fn(),
      linkEmployee: vi.fn(),
      establishmentsWithoutCompany: vi.fn().mockResolvedValue([]),
      membersWithoutEmployee: vi.fn().mockResolvedValue([]),
    };
    sync = new FichitSync(api as unknown as FichitApi, repository as unknown as FichitRepository);
  });

  const unlinked = { id: 'est_1', name: 'Bar Pepe', taxId: null, fichitCompanyId: null };
  const linked = { ...unlinked, fichitCompanyId: 'c_1' };
  const member = {
    id: 'mem_1',
    userId: 'usr_1',
    deletedAt: null,
    fichitEmployeeId: null,
    user: { name: 'Ana García', email: 'ana@ejemplo.es' },
  };

  describe('ensureCompany', () => {
    it('does nothing at all when the integration is off', async () => {
      api.enabled = false;

      expect(await sync.ensureCompany(establishmentId)).toBeNull();
      expect(repository.establishment).not.toHaveBeenCalled();
    });

    it('does not call Fichit again once the establishment is linked', async () => {
      repository.establishment.mockResolvedValue(linked);

      expect(await sync.ensureCompany(establishmentId)).toBe('c_1');
      expect(api.createCompany).not.toHaveBeenCalled();
    });

    it('creates the company with the owner Fichit needs and keeps its id', async () => {
      repository.establishment.mockResolvedValue(unlinked);
      repository.owner.mockResolvedValue({ name: 'Pepe Ruiz', email: 'pepe@ejemplo.es' });
      api.createCompany.mockResolvedValue({ existing: false, company: { id: 'c_1' }, work_center_id: 'w_1' });

      expect(await sync.ensureCompany(establishmentId)).toBe('c_1');
      expect(api.createCompany).toHaveBeenCalledWith(
        expect.objectContaining({ externalId: 'est_1', ownerEmail: 'pepe@ejemplo.es' }),
      );
      expect(repository.linkCompany).toHaveBeenCalledWith(establishmentId, 'c_1');
    });

    it('keeps the company Fichit already had when a previous attempt got through', async () => {
      repository.establishment.mockResolvedValue(unlinked);
      repository.owner.mockResolvedValue({ name: 'Pepe Ruiz', email: 'pepe@ejemplo.es' });
      api.createCompany.mockResolvedValue({ existing: true, company: { id: 'c_1' }, work_center_id: 'w_1' });

      expect(await sync.ensureCompany(establishmentId)).toBe('c_1');
      expect(repository.linkCompany).toHaveBeenCalledWith(establishmentId, 'c_1');
    });

    it('leaves it unlinked when there is no owner to put on the company', async () => {
      repository.establishment.mockResolvedValue(unlinked);
      repository.owner.mockResolvedValue(null);

      expect(await sync.ensureCompany(establishmentId)).toBeNull();
      expect(api.createCompany).not.toHaveBeenCalled();
    });
  });

  describe('ensureEmployee', () => {
    it('links the company first, so a member never lands on a company that is not there', async () => {
      repository.member.mockResolvedValue(member);
      repository.establishment.mockResolvedValue(unlinked);
      repository.owner.mockResolvedValue({ name: 'Pepe Ruiz', email: 'pepe@ejemplo.es' });
      api.createCompany.mockResolvedValue({ existing: false, company: { id: 'c_1' }, work_center_id: 'w_1' });
      api.syncEmployee.mockResolvedValue({ created: true, employee: { id: 'e_1' } });

      expect(await sync.ensureEmployee(establishmentId, userId)).toBe('e_1');
      expect(api.createCompany).toHaveBeenCalled();
      expect(api.syncEmployee).toHaveBeenCalledWith(
        'c_1',
        expect.objectContaining({ externalId: 'usr_1', fullName: 'Ana García' }),
      );
      expect(repository.linkEmployee).toHaveBeenCalledWith('mem_1', 'e_1');
    });

    it('ignores a member who is no longer there', async () => {
      repository.member.mockResolvedValue({ ...member, deletedAt: new Date() });

      expect(await sync.ensureEmployee(establishmentId, userId)).toBeNull();
      expect(api.syncEmployee).not.toHaveBeenCalled();
    });

    it('does not rewrite the link when it already points at the same employee', async () => {
      repository.member.mockResolvedValue({ ...member, fichitEmployeeId: 'e_1' });
      repository.establishment.mockResolvedValue(linked);
      api.syncEmployee.mockResolvedValue({ created: false, employee: { id: 'e_1' } });

      expect(await sync.ensureEmployee(establishmentId, userId)).toBe('e_1');
      expect(repository.linkEmployee).not.toHaveBeenCalled();
    });
  });

  describe('retireEmployee', () => {
    it('deactivates the employee in the company it belongs to', async () => {
      repository.member.mockResolvedValue({ ...member, fichitEmployeeId: 'e_1' });
      repository.establishment.mockResolvedValue(linked);

      await sync.retireEmployee(establishmentId, userId);

      expect(api.deactivateEmployee).toHaveBeenCalledWith('c_1', 'e_1');
    });

    it('says nothing when the member was never linked', async () => {
      repository.member.mockResolvedValue(member);
      repository.establishment.mockResolvedValue(linked);

      await sync.retireEmployee(establishmentId, userId);

      expect(api.deactivateEmployee).not.toHaveBeenCalled();
    });

    it('treats an employee Fichit does not know as already retired', async () => {
      repository.member.mockResolvedValue({ ...member, fichitEmployeeId: 'e_1' });
      repository.establishment.mockResolvedValue(linked);
      api.deactivateEmployee.mockRejectedValue(new FichitError(404, 'not_found', 'no está'));

      await expect(sync.retireEmployee(establishmentId, userId)).resolves.toBeUndefined();
    });

    it('lets a real failure through instead of pretending it worked', async () => {
      repository.member.mockResolvedValue({ ...member, fichitEmployeeId: 'e_1' });
      repository.establishment.mockResolvedValue(linked);
      api.deactivateEmployee.mockRejectedValue(new FichitError(0, 'UNREACHABLE', 'no responde'));

      await expect(sync.retireEmployee(establishmentId, userId)).rejects.toThrow();
    });
  });

  describe('backfill', () => {
    it('repairs what was left unlinked and counts it', async () => {
      repository.establishmentsWithoutCompany.mockResolvedValue([{ id: 'est_1' }]);
      repository.membersWithoutEmployee.mockResolvedValue([{ establishmentId: 'est_1', userId: 'usr_1' }]);
      repository.establishment.mockResolvedValue(unlinked);
      repository.owner.mockResolvedValue({ name: 'Pepe Ruiz', email: 'pepe@ejemplo.es' });
      repository.member.mockResolvedValue(member);
      api.createCompany.mockResolvedValue({ existing: false, company: { id: 'c_1' }, work_center_id: 'w_1' });
      api.syncEmployee.mockResolvedValue({ created: true, employee: { id: 'e_1' } });

      expect(await sync.backfill()).toEqual({ companies: 1, employees: 1, failed: 0 });
    });

    it('keeps going past one that fails and reports it', async () => {
      repository.establishmentsWithoutCompany.mockResolvedValue([{ id: 'est_1' }, { id: 'est_2' }]);
      repository.establishment
        .mockResolvedValueOnce(unlinked)
        .mockResolvedValueOnce({ ...unlinked, id: 'est_2' });
      repository.owner.mockResolvedValue({ name: 'Pepe Ruiz', email: 'pepe@ejemplo.es' });
      api.createCompany
        .mockRejectedValueOnce(new FichitError(0, 'UNREACHABLE', 'no responde'))
        .mockResolvedValueOnce({ existing: false, company: { id: 'c_2' }, work_center_id: 'w_2' });

      expect(await sync.backfill()).toEqual({ companies: 1, employees: 0, failed: 1 });
    });

    it('reports nothing when the integration is off', async () => {
      api.enabled = false;

      expect(await sync.backfill()).toEqual({ companies: 0, employees: 0, failed: 0 });
      expect(repository.establishmentsWithoutCompany).not.toHaveBeenCalled();
    });
  });
});
