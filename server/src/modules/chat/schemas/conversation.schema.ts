import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationType {
  PRIVATE = 'private',
  GROUP = 'group',
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, enum: ConversationType })
  type: ConversationType;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  participants: Types.ObjectId[];

  // Group-specific fields
  @Prop({ default: '' })
  groupName: string;

  @Prop({ default: '' })
  groupDescription: string;

  @Prop({ default: '' })
  groupAvatar: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  groupAdmin: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  groupAdmins: Types.ObjectId[];

  // Tags for groups
  @Prop({ type: [String], default: [] })
  tags: string[];

  // Last message for quick preview
  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastMessage: Types.ObjectId | null;

  @Prop({ default: '' })
  lastMessageText: string;

  @Prop({ type: Date, default: null })
  lastMessageAt: Date | null;

  // Unread count per participant { participantId: count }
  @Prop({ type: Map, of: Number, default: {} })
  unreadCounts: Map<string, number>;

  @Prop({ default: false })
  isDeleted: boolean;

  // Typing indicators (stored transiently, mainly for real-time)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  typingUsers: Types.ObjectId[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ type: 1 });
