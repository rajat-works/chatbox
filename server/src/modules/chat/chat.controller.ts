import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, CreateConversationDto, CreateGroupDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  async getConversations(@Req() req: any) {
    const userId = req.user?._id?.toString();
    return this.chatService.getConversations(userId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get private conversation' })
  async createConversation(
    @Req() req: any,
    @Body() dto: CreateConversationDto,
  ): Promise<any> {
    if (dto.participantIds.length !== 1) {
      throw new BadRequestException('Provide exactly one participant ID for private chat');
    }
    const userId = req.user?._id?.toString();
    return this.chatService.getOrCreatePrivateConversation(userId, dto.participantIds[0]);
  }

  @Post('conversations/group')
  @ApiOperation({ summary: 'Create group conversation' })
  async createGroup(
    @Req() req: any,
    @Body() dto: CreateGroupDto,
  ) {
    const userId = req.user?._id?.toString();
    return this.chatService.createGroupConversation(userId, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get single conversation' })
  async getConversation(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.chatService.getConversation(id, userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  async getMessages(
    @Param('id') conversationId: string,
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const userId = req.user?._id?.toString();
    return this.chatService.getMessages(conversationId, userId, page, limit);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a text message' })
  async sendMessage(
    @Req() req: any,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user?._id?.toString();
    return this.chatService.sendMessage(userId, dto);
  }

  @Post('messages/file')
  @ApiOperation({ summary: 'Send a file/image/video message' })
  @UseInterceptors(FileInterceptor('file'))
  async sendFileMessage(
    @Req() req: any,
    @Body() dto: SendMessageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileData = {
      url: `/uploads/chat/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };

    const userId = req.user?._id?.toString();
    return this.chatService.sendMessage(userId, dto, fileData);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(
    @Param('id') messageId: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.chatService.deleteMessage(messageId, userId);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markAsRead(
    @Param('id') conversationId: string,
    @Req() req: any,
  ) {
    const userId = req.user?._id?.toString();
    return this.chatService.markMessagesAsRead(conversationId, userId);
  }
}
