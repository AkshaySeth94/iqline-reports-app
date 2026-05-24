import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreatePatientDto } from './dto/create-patient.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    createPatient: jest.fn((dto) => {
      return {
        _id: 'someid',
        ...dto,
      };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPatient', () => {
    it('should call usersService.createPatient with the provided DTO', async () => {
      const dto: CreatePatientDto = {
        name: 'John Doe',
        phone: '1234567890',
      };
      const result = await controller.createPatient(dto);
      expect(service.createPatient).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        _id: 'someid',
        name: 'John Doe',
        phone: '1234567890',
      });
    });
  });
});
