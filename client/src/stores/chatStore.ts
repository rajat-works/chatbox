import { create } from 'zustand';
import { Conversation, Message } from '../types';
import { chatAPI } from '../services/api';
import socketService from '../services/socket';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  typingUsers: Record<string, string[]>; // conversationId -> userId[]
  onlineUsers: string[];

  // Actions
  loadConversations: () => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  loadMessages: (conversationId: string, page?: number) => Promise<void>;
  addMessage: (message: Message) => void;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setTypingUser: (conversationId: string, userId: string, isTyping: boolean) => void;
  markConversationAsRead: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  typingUsers: {},
  onlineUsers: [],

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const { data } = await chatAPI.getConversations();
      const conversations = Array.isArray(data) ? data : data.data || [];
      set({ conversations, isLoadingConversations: false });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversation: (conversation: Conversation | null) => {
    const prev = get().activeConversation;
    if (prev) {
      socketService.leaveConversation(prev._id);
    }
    if (conversation) {
      socketService.joinConversation(conversation._id);
      socketService.markAsRead(conversation._id);
    }
    console.log('Setting active conversation:', conversation?._id,conversation);
    set({ activeConversation: conversation, messages: [] });
  },

  loadMessages: async (conversationId: string, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const { data } = await chatAPI.getMessages(conversationId, page);
      const msgs = data.messages || data.data?.messages || data || [];
      if (page === 1) {
        set({ messages: msgs, isLoadingMessages: false });
      } else {
        set((state) => ({
          messages: [...msgs, ...state.messages],
          isLoadingMessages: false,
        }));
      }
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateConversationLastMessage: (conversationId: string, message: Message) => {
    set((state) => ({
      conversations: state.conversations
        .map((conv) =>
          conv._id === conversationId
            ? {
                ...conv,
                lastMessage: message,
                lastMessageText: message.content || `[${message.type}]`,
                lastMessageAt: message.createdAt,
                unreadCount:
                  conv._id === state.activeConversation?._id
                    ? 0
                    : (conv.unreadCount || 0) + 1,
              }
            : conv,
        )
        .sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        }),
    }));
  },

  setOnlineUsers: (userIds: string[]) => {
    set({ onlineUsers: userIds });
  },

  addOnlineUser: (userId: string) => {
    set((state) => ({
      onlineUsers: [...new Set([...state.onlineUsers, userId])],
    }));
  },

  removeOnlineUser: (userId: string) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
    }));
  },

  setTypingUser: (conversationId: string, userId: string, isTyping: boolean) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return {
        typingUsers: { ...state.typingUsers, [conversationId]: updated },
      };
    });
  },

  markConversationAsRead: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv,
      ),
    }));
  },
}));
