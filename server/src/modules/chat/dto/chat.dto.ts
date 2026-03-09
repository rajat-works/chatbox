import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../schemas/message.schema';

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  conversationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: MessageType })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyTo?: string;
}

export class CreateConversationDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}

export class CreateGroupDto {
  @ApiProperty()
  @IsString()
  groupName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupDescription?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TypingDto {
  @ApiProperty()
  @IsString()
  conversationId: string;

  @ApiProperty()
  @IsString()
  userId: string;
}
