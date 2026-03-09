import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatService } from './chat.service';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map userId -> Set of socketIds
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;

      // Track online status
      if (!this.onlineUsers.has(payload.sub)) {
        this.onlineUsers.set(payload.sub, new Set());
      }
      this.onlineUsers.get(payload.sub)!.add(client.id);

      // Update user status in DB
      await this.userModel.findByIdAndUpdate(payload.sub, {
        status: UserStatus.ONLINE,
        lastSeen: null,
      });

      // Join user's own room for direct notifications
      client.join(`user:${payload.sub}`);

      // Broadcast online status to all connected users
      this.server.emit('user:online', { userId: payload.sub });

      console.log(`User ${payload.sub} connected (socket: ${client.id})`);
    } catch (error) {
      console.error('WebSocket auth failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.onlineUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.onlineUsers.delete(client.userId);

          // Update user status
          await this.userModel.findByIdAndUpdate(client.userId, {
            status: UserStatus.OFFLINE,
            lastSeen: new Date(),
          });

          // Broadcast offline status
          this.server.emit('user:offline', {
            userId: client.userId,
            lastSeen: new Date(),
          });
        }
      }
      console.log(`User ${client.userId} disconnected (socket: ${client.id})`);
    }
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);

    // Mark messages as delivered when user joins
    if (client.userId) {
      await this.chatService.markAsDelivered(data.conversationId, client.userId);
      this.server.to(`conversation:${data.conversationId}`).emit('messages:delivered', {
        conversationId: data.conversationId,
        userId: client.userId,
      });
    }
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string; replyTo?: string },
  ) {
    if (!client.userId) return;

    try {
      const message = await this.chatService.sendMessage(client.userId, {
        conversationId: data.conversationId,
        content: data.content,
        type: data.type as any,
        replyTo: data.replyTo,
      });

      // Emit to all participants in the conversation
      this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);

      // Also emit to individual user rooms for notification purposes
      const conversation = await this.chatService.getConversation(
        data.conversationId,
        client.userId,
      );
      if (conversation) {
        (conversation.participants as any[]).forEach((participant: any) => {
          const pid = participant._id?.toString() || participant.toString();
          if (pid !== client.userId) {
            this.server.to(`user:${pid}`).emit('notification:message', {
              conversationId: data.conversationId,
              message,
            });
          }
        });
      }
    } catch (error) {
      client.emit('message:error', { error: 'Failed to send message' });
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    await this.chatService.markMessagesAsRead(data.conversationId, client.userId);
    this.server.to(`conversation:${data.conversationId}`).emit('messages:read', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  // Get online users
  @SubscribeMessage('users:online')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const onlineUserIds = Array.from(this.onlineUsers.keys());
    client.emit('users:online', onlineUserIds);
  }

  // Check if specific user is online
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0;
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
