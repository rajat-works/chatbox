import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument, MessageType, MessageStatus } from './schemas/message.schema';
import {
  Conversation,
  ConversationDocument,
  ConversationType,
} from './schemas/conversation.schema';
import { EncryptionService } from '../../common/services/encryption.service';
import { SendMessageDto, CreateConversationDto, CreateGroupDto } from './dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private encryptionService: EncryptionService,
  ) {}

  // Get or create a private conversation between two users
  async getOrCreatePrivateConversation(
    userId: string,
    otherUserId: string,
  ): Promise<any> {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(otherUserId)) {
      throw new NotFoundException('Invalid user ID');
    }

  let conversation: any = await this.conversationModel
      .findOne({
        type: ConversationType.PRIVATE,
        participants: {
          $all: [new Types.ObjectId(userId), new Types.ObjectId(otherUserId)],
          $size: 2,
        },
      })
      .populate({
        path: 'participants',
        model: 'User',
        select: 'name displayName username avatar status lastSeen bio',
      })
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', model: 'User', select: 'name displayName avatar' },
      })
      .lean();

    if (!conversation) {
      const created = await this.conversationModel.create({
        type: ConversationType.PRIVATE,
        participants: [new Types.ObjectId(userId), new Types.ObjectId(otherUserId)],
        unreadCounts: new Map(),
      });
      // Re-fetch with populated fields
      conversation = await this.conversationModel
        .findById(created._id)
        .populate({
          path: 'participants',
          model: 'User',
          select: 'name displayName username avatar status lastSeen bio',
        })
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', model: 'User', select: 'name displayName avatar' },
        })
        .lean();
    }
    const unreadCount = (conversation as any)?.unreadCounts?.get
      ? (conversation as any).unreadCounts.get(userId)
      : (conversation as any)?.unreadCounts?.[userId] || 0;

    return {
      ...conversation,
      unreadCount,
    };
  }

  // Create group conversation
  async createGroupConversation(creatorId: string, dto: CreateGroupDto) {
    const allParticipants = [
      new Types.ObjectId(creatorId),
      ...dto.participantIds.map((id) => new Types.ObjectId(id)),
    ];

    const conversation = await this.conversationModel.create({
      type: ConversationType.GROUP,
      participants: allParticipants,
      groupName: dto.groupName,
      groupDescription: dto.groupDescription || '',
      groupAdmin: new Types.ObjectId(creatorId),
      groupAdmins: [new Types.ObjectId(creatorId)],
      tags: dto.tags || [],
      unreadCounts: new Map(),
    });

    // Create system message
    await this.messageModel.create({
      sender: new Types.ObjectId(creatorId),
      conversation: conversation._id,
      type: MessageType.SYSTEM,
      content: this.encryptionService.encrypt('Group created'),
      status: MessageStatus.SENT,
    });

    return conversation;
  }

  // Send a message
  async sendMessage(senderId: string, dto: SendMessageDto, fileData?: any) {
    const conversation = await this.conversationModel.findById(dto.conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if sender is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === senderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    // Encrypt message content
    const encryptedContent = dto.content
      ? this.encryptionService.encrypt(dto.content)
      : '';

    const messageData: any = {
      sender: new Types.ObjectId(senderId),
      conversation: conversation._id,
      type: dto.type || MessageType.TEXT,
      content: encryptedContent,
      status: MessageStatus.SENT,
    };

    if (dto.replyTo) {
      messageData.replyTo = new Types.ObjectId(dto.replyTo);
    }

    if (fileData) {
      messageData.fileUrl = fileData.url;
      messageData.fileName = fileData.originalName;
      messageData.fileSize = fileData.size;
      messageData.mimeType = fileData.mimeType;
      messageData.thumbnail = fileData.thumbnail || '';
      messageData.duration = fileData.duration || 0;
    }

    const message = await this.messageModel.create(messageData);

    // Update conversation
    conversation.lastMessage = message._id as Types.ObjectId;
    conversation.lastMessageText = dto.content ? dto.content.substring(0, 100) : `[${dto.type || 'file'}]`;
    conversation.lastMessageAt = new Date();

    // Increment unread counts for all participants except sender
    conversation.participants.forEach((participantId: any) => {
      const pid = participantId.toString();
      if (pid !== senderId) {
        const current = conversation.unreadCounts.get(pid) || 0;
        conversation.unreadCounts.set(pid, current + 1);
      }
    });

    await conversation.save();

    // Populate sender info
    const populatedMessage = await this.messageModel
      .findById(message._id)
      .populate('sender', 'name displayName avatar')
      .populate('replyTo');

    return {
      ...populatedMessage?.toObject(),
      content: dto.content, // Return decrypted content to sender
    };
  }

  // Get conversation messages with pagination
  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === userId.toString(),
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not authorized');
    }

    console.log('Fetching messages for conversation:', conversationId, 'Page:', page, 'Limit:', limit);
    const messages = await this.messageModel
      .find({ conversation: new Types.ObjectId(conversationId), isDeleted: false })
      .populate('sender', 'name displayName avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Decrypt messages
    const decryptedMessages = messages.map((msg) => {
      const msgObj = msg.toObject();
      const replyTo =
        msgObj.replyTo && typeof msgObj.replyTo === 'object' && 'content' in msgObj.replyTo
          ? {
              ...msgObj.replyTo,
              content: this.encryptionService.decrypt(
                (msgObj.replyTo as { content?: string }).content || '',
              ),
            }
          : msgObj.replyTo;

      return {
        ...msgObj,
        ...(replyTo ? { replyTo } : {}), // Keep replyTo populated
        content: this.encryptionService.decrypt(msgObj.content),
      };
    });

    // Mark messages as read
    await this.markMessagesAsRead(conversationId, userId);

    return {
      messages: decryptedMessages.reverse(),
      page,
      limit,
      hasMore: messages.length === limit,
    };
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string) {
    await this.messageModel.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: new Types.ObjectId(userId) },
        readBy: { $ne: new Types.ObjectId(userId) },
      },
      {
        $addToSet: { readBy: new Types.ObjectId(userId) },
        $set: { status: MessageStatus.READ },
      },
    );

    // Reset unread count
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${userId}`]: 0 },
    });
  }

  // Get user's conversations
  async getConversations(userId: string) {
    const conversations = await this.conversationModel
      .find({
        participants: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .populate({
        path: 'participants',
        model: 'User',
        select: 'name displayName username avatar status lastSeen bio',
      })
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', model: 'User', select: 'name displayName avatar' },
      })
      .sort({ lastMessageAt: -1 })
      .lean();

    return conversations.map((conv: any) => {
      const unreadCount = conv?.unreadCounts?.get
        ? conv.unreadCounts.get(userId)
        : conv?.unreadCounts?.[userId] || 0;
        const lastMessage=conv.lastMessage        ? {
            ...conv.lastMessage,
            content: this.encryptionService.decrypt(conv.lastMessage.content),
            replyTo: conv.lastMessage.replyTo
              ? {
                  ...conv.lastMessage.replyTo,
                  content: this.encryptionService.decrypt(
                    (conv.lastMessage.replyTo as { content?: string }).content || '',
                  ),
                }
              : undefined,
          }
        : undefined;

      return {
        ...conv,
        unreadCount,
        lastMessage,
      };
    });
  }

  // Get single conversation
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate({
        path: 'participants',
        model: 'User',
        select: 'name displayName username avatar status lastSeen bio',
      })
      .populate({
        path: 'groupAdmins',
        model: 'User',
        select: 'name displayName avatar',
      })
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', model: 'User', select: 'name displayName avatar' },
      });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  // Delete message (soft delete)
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (message.sender.toString() !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    message.isDeleted = true;
    await message.save();
    return { message: 'Message deleted' };
  }

  // Mark delivered
  async markAsDelivered(conversationId: string, userId: string) {
    await this.messageModel.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: new Types.ObjectId(userId) },
        deliveredTo: { $ne: new Types.ObjectId(userId) },
      },
      {
        $addToSet: { deliveredTo: new Types.ObjectId(userId) },
        $set: { status: MessageStatus.DELIVERED },
      },
    );
  }
}
