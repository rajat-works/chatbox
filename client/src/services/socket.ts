import { io, Socket } from 'socket.io-client';

class SocketService {
  private chatSocket: Socket | null = null;
  private callsSocket: Socket | null = null;

  connectChat(token: string): Socket {
    if (this.chatSocket?.connected) return this.chatSocket;

    // Disconnect old socket if exists
    if (this.chatSocket) {
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }

    this.chatSocket = io('/chat', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.chatSocket.on('connect', () => {
      console.log('Chat socket connected');
    });

    this.chatSocket.on('disconnect', (reason) => {
      console.log('Chat socket disconnected:', reason);
      // If server disconnected us (e.g. auth failure), try reconnecting with fresh token
      if (reason === 'io server disconnect') {
        const freshToken = localStorage.getItem('accessToken');
        if (freshToken && this.chatSocket) {
          this.chatSocket.auth = { token: freshToken };
          this.chatSocket.connect();
        }
      }
    });

    this.chatSocket.on('connect_error', (error) => {
      console.error('Chat socket error:', error.message);
      // On auth errors, try refreshing the token in auth
      const freshToken = localStorage.getItem('accessToken');
      if (freshToken && this.chatSocket) {
        this.chatSocket.auth = { token: freshToken };
      }
    });

    return this.chatSocket;
  }

  connectCalls(token: string): Socket {
    if (this.callsSocket?.connected) return this.callsSocket;

    if (this.callsSocket) {
      this.callsSocket.disconnect();
      this.callsSocket = null;
    }

    this.callsSocket = io('/calls', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.callsSocket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        const freshToken = localStorage.getItem('accessToken');
        if (freshToken && this.callsSocket) {
          this.callsSocket.auth = { token: freshToken };
          this.callsSocket.connect();
        }
      }
    });

    this.callsSocket.on('connect_error', () => {
      const freshToken = localStorage.getItem('accessToken');
      if (freshToken && this.callsSocket) {
        this.callsSocket.auth = { token: freshToken };
      }
    });

    return this.callsSocket;
  }

  getChatSocket(): Socket | null {
    return this.chatSocket;
  }

  getCallsSocket(): Socket | null {
    return this.callsSocket;
  }

  disconnectAll() {
    this.chatSocket?.disconnect();
    this.callsSocket?.disconnect();
    this.chatSocket = null;
    this.callsSocket = null;
  }

  // Chat socket helpers
  joinConversation(conversationId: string) {
    this.chatSocket?.emit('join:conversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.chatSocket?.emit('leave:conversation', { conversationId });
  }

  sendMessage(conversationId: string, content: string, type?: string, replyTo?: string) {
    this.chatSocket?.emit('message:send', { conversationId, content, type, replyTo });
  }

  markAsRead(conversationId: string) {
    this.chatSocket?.emit('message:read', { conversationId });
  }

  startTyping(conversationId: string) {
    this.chatSocket?.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId: string) {
    this.chatSocket?.emit('typing:stop', { conversationId });
  }

  getOnlineUsers() {
    this.chatSocket?.emit('users:online');
  }

  // Call socket helpers
  initiateCall(targetUserId: string, type: 'voice' | 'video', offer: RTCSessionDescriptionInit) {
    console.log('Initiating call to:', targetUserId, 'Type:', type);
    this.callsSocket?.emit('call:initiate', { targetUserId, type, offer });
  }

  answerCall(callerId: string, answer: RTCSessionDescriptionInit) {
    this.callsSocket?.emit('call:answer', { callerId, answer });
  }

  sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit) {
    this.callsSocket?.emit('call:ice-candidate', { targetUserId, candidate });
  }

  endCall(targetUserId: string) {
    this.callsSocket?.emit('call:end', { targetUserId });
  }

  rejectCall(callerId: string) {
    this.callsSocket?.emit('call:reject', { callerId });
  }
}

export const socketService = new SocketService();
export default socketService;
