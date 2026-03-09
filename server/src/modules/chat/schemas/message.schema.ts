import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  VOICE_NOTE = 'voice_note',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversation: Types.ObjectId;

  @Prop({ required: true, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  // Encrypted content
  @Prop({ default: '' })
  content: string;

  // For file/media messages
  @Prop({ default: '' })
  fileUrl: string;

  @Prop({ default: '' })
  fileName: string;

  @Prop({ default: 0 })
  fileSize: number;

  @Prop({ default: '' })
  mimeType: string;

  // Duration for audio/video
  @Prop({ default: 0 })
  duration: number;

  // Thumbnail for images/videos
  @Prop({ default: '' })
  thumbnail: string;

  @Prop({ default: MessageStatus.SENT, enum: MessageStatus })
  status: MessageStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  deliveredTo: Types.ObjectId[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  replyTo: Types.ObjectId | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
