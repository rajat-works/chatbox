// ========================================
// CoreChat Type Definitions
// ========================================

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  bio: string;
  avatar: string;
  username: string;
  displayName: string;
  address: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string | null;
  profileImagePrivacy: PrivacyOption;
  lastSeenPrivacy: PrivacyOption;
  onlineStatusPrivacy: PrivacyOption;
  callsEnabled: boolean;
  isSearchable: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  messageNotificationsEnabled: boolean;
  groupNotificationsEnabled: boolean;
  friends: string[];
}

export type PrivacyOption = 'everyone' | 'friends' | 'nobody';

export interface UserPublic {
  _id: string;
  name: string;
  displayName: string;
  username: string;
  email?: string;
  phone?: string;
  bio: string;
  avatar: string;
  status?: 'online' | 'offline' | 'away';
  lastSeen?: string | null;
  callsEnabled?: boolean;
}

export interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar: string;
  };
  conversation: string;
  type: MessageType;
  content: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  thumbnail: string;
  status: 'sent' | 'delivered' | 'read';
  readBy: string[];
  deliveredTo: string[];
  isDeleted: boolean;
  replyTo: Message | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice_note' | 'system';

export interface Conversation {
  _id: string;
  type: 'private' | 'group';
  participants: UserPublic[];
  groupName: string;
  groupDescription: string;
  groupAvatar: string;
  groupAdmin: string | null;
  groupAdmins: UserPublic[];
  tags: string[];
  lastMessage: Message | null;
  lastMessageText: string;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender: UserPublic | null;
  type: 'message' | 'group_invite' | 'call_missed' | 'friend_request' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CallState {
  isActive: boolean;
  type: 'voice' | 'video' | null;
  remoteUser: UserPublic | null;
  isIncoming: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type ThemeMode = 'light' | 'dark';
