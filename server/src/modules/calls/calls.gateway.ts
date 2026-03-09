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
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface CallSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/calls',
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: CallSocket) {
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

      // Join user's own room for direct targeting
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: CallSocket) {
    // nothing needed
  }

  @SubscribeMessage('call:initiate')
  handleCallInitiate(
    @ConnectedSocket() client: CallSocket,
    @MessageBody()
    data: {
      targetUserId: string;
      type: 'voice' | 'video';
      offer: RTCSessionDescriptionInit;
    },
  ) {
    console.log('Received call initiation:', {
      from: client.userId,
      to: data.targetUserId,
      type: data.type,
    });
    if (!client.userId) return;

    this.server.to(`user:${data.targetUserId}`).emit('call:incoming', {
      callerId: client.userId,
      type: data.type,
      offer: data.offer,
    });
  }

  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @ConnectedSocket() client: CallSocket,
    @MessageBody()
    data: {
      callerId: string;
      answer: RTCSessionDescriptionInit;
    },
  ) {
    this.server.to(`user:${data.callerId}`).emit('call:answered', {
      answererId: client.userId,
      answer: data.answer,
    });
  }

  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: CallSocket,
    @MessageBody()
    data: {
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    this.server.to(`user:${data.targetUserId}`).emit('call:ice-candidate', {
      candidateUserId: client.userId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('call:end')
  handleCallEnd(
    @ConnectedSocket() client: CallSocket,
    @MessageBody() data: { targetUserId: string },
  ) {
    this.server.to(`user:${data.targetUserId}`).emit('call:ended', {
      userId: client.userId,
    });
  }

  @SubscribeMessage('call:reject')
  handleCallReject(
    @ConnectedSocket() client: CallSocket,
    @MessageBody() data: { callerId: string },
  ) {
    this.server.to(`user:${data.callerId}`).emit('call:rejected', {
      userId: client.userId,
    });
  }

  @SubscribeMessage('call:toggle-audio')
  handleToggleAudio(
    @ConnectedSocket() client: CallSocket,
    @MessageBody() data: { targetUserId: string; muted: boolean },
  ) {
    this.server.to(`user:${data.targetUserId}`).emit('call:audio-toggled', {
      userId: client.userId,
      muted: data.muted,
    });
  }

  @SubscribeMessage('call:toggle-video')
  handleToggleVideo(
    @ConnectedSocket() client: CallSocket,
    @MessageBody() data: { targetUserId: string; videoOff: boolean },
  ) {
    this.server.to(`user:${data.targetUserId}`).emit('call:video-toggled', {
      userId: client.userId,
      videoOff: data.videoOff,
    });
  }
}
