import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { UserRole } from '../common/enums/user-role.enum';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UsersService', () => {
  let service: UsersService;
  let model: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: {
            new: jest.fn().mockResolvedValue({ save: jest.fn() }),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<User>>(getModelToken(User.name));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create a default admin if one does not exist', async () => {
      jest.spyOn(model, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      const save = jest.fn();
      (model as any).new.mockImplementation(() => ({ save }));
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await service.onModuleInit();

      expect(model.findOne).toHaveBeenCalledWith({ role: UserRole.Admin });
      expect(save).toHaveBeenCalled();
    });

    it('should not create a default admin if one already exists', async () => {
      jest.spyOn(model, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ role: UserRole.Admin }),
      } as any);
      const save = jest.fn();
      (model as any).new.mockImplementation(() => ({ save }));

      await service.onModuleInit();

      expect(model.findOne).toHaveBeenCalledWith({ role: UserRole.Admin });
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('createPatient', () => {
    it('should create a new patient successfully', async () => {
      const createPatientDto: CreatePatientDto = { name: 'New Patient', phone: '1112223333' };
      jest.spyOn(service, 'findByPhone').mockResolvedValue(null);
      const save = jest.fn().mockResolvedValue({});
      (model as any).new.mockImplementation(() => ({ save }));

      await service.createPatient(createPatientDto);

      expect(service.findByPhone).toHaveBeenCalledWith(createPatientDto.phone);
      expect(save).toHaveBeenCalled();
    });

    it('should throw a ConflictException if phone number is already in use', async () => {
      const createPatientDto: CreatePatientDto = { name: 'New Patient', phone: '1112223333' };
      jest.spyOn(service, 'findByPhone').mockResolvedValue({} as any);

      await expect(service.createPatient(createPatientDto)).rejects.toThrow(ConflictException);
    });
  });
});
