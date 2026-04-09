import { asUserId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { BarRepository } from '../data-access/bar.repository';
import { BarsService } from './bars.service';

describe('BarsService', () => {
  let service: BarsService;
  let repository: jest.Mocked<BarRepository>;

  const FAKE_DATE = new Date('2026-01-01T10:00:00Z');

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarsService, { provide: BarRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<BarsService>(BarsService);
    repository = module.get(BarRepository);
  });

  describe('create', () => {
    it('debería mapear correctamente el bar creado', async () => {
      repository.create.mockResolvedValue({
        id: 'bar-123',
        name: 'Nuevo Bar',
        createdAt: FAKE_DATE,
        updatedAt: FAKE_DATE,
      } as any);

      const result = await service.create(
        {
          name: 'Nuevo Bar',
        },
        { id: 'user-id' } as any,
      );

      expect(repository.create).toHaveBeenCalledWith('user-id', { name: 'Nuevo Bar' });
      expect(result).toEqual({
        id: 'bar-123',
        name: 'Nuevo Bar',
        createdAt: FAKE_DATE.toISOString(),
        updatedAt: FAKE_DATE.toISOString(),
      });
    });
  });

  describe('getForUser', () => {
    it('debería mapear correctamente la lista de bares del usuario', async () => {
      repository.findByUserId.mockResolvedValue([
        {
          id: 'bar-1',
          name: 'Bar Paco',
          createdAt: FAKE_DATE,
          updatedAt: FAKE_DATE,
        } as any,
      ]);

      const result = await service.getForUser({ id: 'user-id' } as any);

      expect(repository.findByUserId).toHaveBeenCalledWith('user-id');
      expect(result).toEqual([
        {
          id: 'bar-1',
          name: 'Bar Paco',
          createdAt: FAKE_DATE.toISOString(),
          updatedAt: FAKE_DATE.toISOString(),
        },
      ]);
    });

    it('debería devolver un array vacío si no tiene bares', async () => {
      repository.findByUserId.mockResolvedValue([]);

      const result = await service.getForUser({ id: 'user-id' } as any);

      expect(result).toEqual([]);
    });
  });
});
