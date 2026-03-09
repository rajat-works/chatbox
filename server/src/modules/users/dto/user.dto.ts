import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrivacyOption } from '../schemas/user.schema';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Abraham' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'johnabraham' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'Never give up 💪' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'John Abraham' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: '33 street west subidbazar, sylhet' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdatePrivacyDto {
  @ApiPropertyOptional({ enum: PrivacyOption })
  @IsOptional()
  @IsEnum(PrivacyOption)
  profileImagePrivacy?: PrivacyOption;

  @ApiPropertyOptional({ enum: PrivacyOption })
  @IsOptional()
  @IsEnum(PrivacyOption)
  lastSeenPrivacy?: PrivacyOption;

  @ApiPropertyOptional({ enum: PrivacyOption })
  @IsOptional()
  @IsEnum(PrivacyOption)
  onlineStatusPrivacy?: PrivacyOption;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  callsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Whether the user appears in search results' })
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  messageNotificationsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  groupNotificationsEnabled?: boolean;
}

export class DeleteAccountDto {
  @IsString()
  password: string;
}
