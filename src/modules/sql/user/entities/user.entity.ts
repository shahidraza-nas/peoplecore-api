import { SqlModel } from '@core/sql/sql.model';
import { IsUnique } from '@core/sql/sql.unique-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  BeforeCreate,
  BeforeSave,
  Column,
  DataType,
  Table,
} from 'sequelize-typescript';
import config from 'src/config';
import { generateHash, uuid } from 'src/core/core.utils';
import { AuthProvider } from '../../auth/auth-provider.enum';
import { Role } from '../role.enum';

@Table
export class User extends SqlModel {
  @Column({
    type: DataType.ENUM(...Object.values(Role)),
    defaultValue: Role.User,
  })
  @ApiProperty({ enum: Role, description: 'Role', example: Role.User })
  @IsEnum(Role)
  declare role: Role;

  @Column({ unique: 'uid' })
  @ApiProperty({
    description: 'Unique ID',
    example: 'a926d382-6741-4d95-86cf-1f5c421cf654',
    readOnly: true,
  })
  declare uid: string;

  @Column({
    type: DataType.ENUM(...Object.values(AuthProvider)),
    defaultValue: 'Local',
  })
  @ApiProperty({
    enum: AuthProvider,
    description: 'Auth Provider',
    example: 'Local',
    readOnly: true,
  })
  declare provider: AuthProvider;

  @Column
  @ApiProperty({ description: 'First Name', example: 'Ross' })
  @IsString()
  declare first_name: string;

  @Column
  @ApiProperty({ description: 'Last Name', example: 'Geller' })
  @IsString()
  declare last_name: string;

  @Column
  @ApiProperty({
    description: 'Full Name',
    example: 'Ross Geller',
    readOnly: true,
  })
  declare name?: string;

  @Column
  @ApiProperty({ description: 'Email', example: 'ross.geller@gmail.com' })
  @IsUnique('User', {
    message: 'User with the same email address already exists.',
  })
  @IsString()
  @IsEmail()
  declare email: string;

  @Column({ type: DataType.STRING(7), defaultValue: '+1' })
  @ApiProperty({ description: 'Phone Code', example: '+1', required: false })
  @IsOptional()
  @IsString()
  declare phone_code: string;

  @Column(DataType.STRING(20))
  @ApiProperty({ description: 'Phone', example: '9999999999', required: false })
  @IsOptional()
  @IsNumberString()
  declare phone: string;

  @Column
  @ApiProperty({ description: 'Password', example: '123456', writeOnly: true })
  @IsString()
  @MinLength(6)
  declare password: string;

  @Column
  @ApiProperty({ description: 'Avatar', example: 'user/avatar.png' })
  @IsOptional()
  @IsString()
  get avatar(): string {
    const avatarValue = this.getDataValue('avatar');
    if (!avatarValue) return null;
    
    // If already a full URL (http:// or https://), return as-is
    if (avatarValue.startsWith('http://') || avatarValue.startsWith('https://')) {
      return avatarValue;
    }
    
    // Otherwise, prepend CDN URL for local files
    return config().cdnURL + avatarValue;
  }

  @Column({ defaultValue: false })
  @ApiProperty({ description: 'Enable 2FA?', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  declare enable_2fa?: boolean;

  @Column({ defaultValue: true })
  @ApiProperty({ description: 'Send Email?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  declare send_email?: boolean;

  @Column({ defaultValue: true })
  @ApiProperty({ description: 'Send SMS?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  declare send_sms?: boolean;

  @Column({ defaultValue: true })
  @ApiProperty({ description: 'Send Push?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  declare send_push?: boolean;

  @Column
  @ApiProperty({
    format: 'date-time',
    description: 'Last Login At',
    example: '2021-01-01T00:00:00Z',
    readOnly: true,
  })
  declare last_login_at?: Date;

  @BeforeSave
  static setName(instance: User) {
    if (instance.first_name && instance.last_name) {
      instance.name = `${instance.first_name} ${instance.last_name}`;
    }
  }

  @BeforeCreate
  static async hashPassword(instance: User) {
    if (instance.password) {
      instance.password = await generateHash(instance.password);
    }
  }

  @BeforeCreate
  static setUuid(instance: User) {
    instance.uid = uuid();
  }

  @BeforeSave
  static normalizeAvatar(instance: User) {
    const cdn = config().cdnURL;
    const avatar = instance.getDataValue('avatar');
    if (typeof avatar === 'string' && avatar.startsWith(cdn)) {
      instance.setDataValue('avatar', avatar.replace(cdn, ''));
    }
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}
