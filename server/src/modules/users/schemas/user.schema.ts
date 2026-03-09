import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
}

export enum PrivacyOption {
  EVERYONE = 'everyone',
  FRIENDS = 'friends',
  NOBODY = 'nobody',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, sparse: true, trim: true, lowercase: true })
  email?: string;

  @Prop({ unique: true, sparse: true, trim: true })
  phone?: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: '' })
  username: string;

  @Prop({ default: UserStatus.OFFLINE, enum: UserStatus })
  status: UserStatus;

  @Prop({ type: Date, default: null })
  lastSeen: Date | null;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ select: false })
  otp?: string;

  @Prop({ type: Date, select: false })
  otpExpiresAt?: Date;

  @Prop({ select: false })
  refreshToken?: string;

  // Privacy settings
  @Prop({ default: PrivacyOption.EVERYONE, enum: PrivacyOption })
  profileImagePrivacy: PrivacyOption;

  @Prop({ default: PrivacyOption.EVERYONE, enum: PrivacyOption })
  lastSeenPrivacy: PrivacyOption;

  @Prop({ default: PrivacyOption.EVERYONE, enum: PrivacyOption })
  onlineStatusPrivacy: PrivacyOption;

  // Feature toggles
  @Prop({ default: true })
  callsEnabled: boolean;

  @Prop({ default: true })
  isSearchable: boolean;

  @Prop({ default: true })
  emailNotificationsEnabled: boolean;

  @Prop({ default: true })
  pushNotificationsEnabled: boolean;

  @Prop({ default: true })
  messageNotificationsEnabled: boolean;

  @Prop({ default: true })
  groupNotificationsEnabled: boolean;

  // Friends list
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  friends: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  blockedUsers: Types.ObjectId[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  // Address info
  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  displayName: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ name: 'text', username: 'text' });
