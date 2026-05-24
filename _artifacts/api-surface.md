# API Surface

This document outlines the public API for the backend application, serving as a contract for the implementation stage.

## backend/src/app.module.ts
`class AppModule`

## backend/src/main.ts
`function bootstrap()`

## backend/src/common/enums/report-status.enum.ts
`export enum ReportStatus { Final = 'Final', Corrected = 'Corrected' }`

## backend/src/common/enums/user-role.enum.ts
`export enum UserRole { Admin = 'Admin', Patient = 'Patient' }`

## backend/src/auth/auth.controller.ts
`class AuthController`
  `constructor(authService: AuthService)`
  `adminLogin(adminLoginDto: AdminLoginDto): Promise<LoginResponseDto>`
  `patientLogin(patientLoginDto: PatientLoginDto): Promise<{ message: string }>`
  `verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<LoginResponseDto>`

## backend/src/auth/auth.service.ts
`class AuthService`
  `constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService)`
  `validateAdmin(phone: string, pass: string): Promise<Omit<User, 'password'> | null>`
  `loginAdmin(user: any): Promise<LoginResponseDto>`
  `requestPatientOtp(phone: string): Promise<void>`
  `verifyPatientOtp(phone: string, otp: string): Promise<LoginResponseDto>`

## backend/src/auth/dto/admin-login.dto.ts
`export class AdminLoginDto`
  `phone: string`
  `password: string`

## backend/src/auth/dto/login-response.dto.ts
`export class LoginResponseDto`
  `accessToken: string`

## backend/src/auth/dto/patient-login.dto.ts
`export class PatientLoginDto`
  `phone: string`

## backend/src/auth/dto/verify-otp.dto.ts
`export class VerifyOtpDto`
  `phone: string`
  `otp: string`

## backend/src/auth/decorators/public.decorator.ts
`export const IS_PUBLIC_KEY = 'isPublic'`
`export const Public: () => CustomDecorator<string>`

## backend/src/auth/decorators/roles.decorator.ts
`export const ROLES_KEY = 'roles'`
`export const Roles: (...roles: UserRole[]) => CustomDecorator<string>`

## backend/src/auth/guards/jwt-auth.guard.ts
`class JwtAuthGuard extends AuthGuard('jwt')`
  `constructor(reflector: Reflector)`
  `canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>`

## backend/src/auth/guards/roles.guard.ts
`class RolesGuard`
  `constructor(reflector: Reflector)`
  `canActivate(context: ExecutionContext): boolean`

## backend/src/auth/strategies/jwt.strategy.ts
`class JwtStrategy extends PassportStrategy(Strategy)`
  `constructor(configService: ConfigService)`
  `validate(payload: any): Promise<{ userId: any; phone: any; role: any }>`

## backend/src/users/users.controller.ts
`class UsersController`
  `constructor(usersService: UsersService)`
  `createPatient(createPatientDto: CreatePatientDto): Promise<User>`

## backend/src/users/users.service.ts
`class UsersService`
  `constructor(userModel: Model<User>)`
  `onModuleInit(): Promise<void>`
  `findByPhone(phone: string): Promise<User | null>`
  `findById(id: string): Promise<User | null>`
  `createPatient(createPatientDto: CreatePatientDto): Promise<User>`

## backend/src/users/dto/create-patient.dto.ts
`export class CreatePatientDto`
  `name: string`
  `phone: string`

## backend/src/users/schemas/user.schema.ts
`export class User`
  `name: string`
  `phone: string`
  `password?: string`
  `role: UserRole`
`export const UserSchema: Schema<User>`

## backend/src/reports/reports.controller.ts
`class ReportsController`
  `constructor(reportsService: ReportsService)`
  `create(createReportDto: CreateReportDto, req: any): Promise<Report>`
  `findAllForPatient(req: any): Promise<Report[]>`
  `findOne(id: string, req: any): Promise<Report>`
  `update(id: string, updateReportDto: UpdateReportDto, req: any): Promise<Report>`

## backend/src/reports/reports.service.ts
`class ReportsService`
  `constructor(reportModel: Model<Report>)`
  `create(createReportDto: CreateReportDto, adminId: string): Promise<Report>`
  `findAllForPatient(patientId: string): Promise<Report[]>`
  `findOne(id: string, userId: string, userRole: UserRole): Promise<Report>`
  `update(id: string, updateReportDto: UpdateReportDto, adminId: string): Promise<Report>`

## backend/src/reports/dto/create-report.dto.ts
`class GlucoseMarkerDataDto`
  `glucoseValue: number`
`export class CreateReportDto`
  `patient: string`
  `reportDate: Date`
  `status: ReportStatus`
  `notes?: string`
  `reportType: 'GlucoseMarker'`
  `data: GlucoseMarkerDataDto`

## backend/src/reports/dto/update-report.dto.ts
`export class UpdateReportDto extends PartialType(CreateReportDto)`

## backend/src/reports/schemas/report.schema.ts
`export class Report`
  `patient: Types.ObjectId`
  `reportDate: Date`
  `status: ReportStatus`
  `notes?: string`
  `reportType: string`
  `data: Record<string, any>`
  `createdBy: Types.ObjectId`
  `updatedBy: Types.ObjectId`
`export const ReportSchema: Schema<Report>`

## backend/src/audit/audit.service.ts
`class AuditService`
  `constructor(auditLogModel: Model<AuditLog>)`
  `log(actorId: string, action: string, details: Record<string, any>): Promise<AuditLog>`

## backend/src/audit/schemas/audit-log.schema.ts
`export class AuditLog`
  `actorId: string`
  `action: string`
  `details: Record<string, any>`
`export const AuditLogSchema: Schema<AuditLog>`

## backend/src/health/health.controller.ts
`class HealthController`
  `check(): { status: string }`
