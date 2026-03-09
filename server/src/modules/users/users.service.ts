import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserStatus, PrivacyOption } from './schemas/user.schema';
import { UpdateProfileDto, UpdatePrivacyDto, DeleteAccountDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.findById(userId);
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      username: user.username,
      displayName: user.displayName,
      address: user.address,
      status: user.status,
      lastSeen: user.lastSeen,
      profileImagePrivacy: user.profileImagePrivacy,
      lastSeenPrivacy: user.lastSeenPrivacy,
      onlineStatusPrivacy: user.onlineStatusPrivacy,
      callsEnabled: user.callsEnabled,
      isSearchable: user.isSearchable,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
      messageNotificationsEnabled: user.messageNotificationsEnabled,
      groupNotificationsEnabled: user.groupNotificationsEnabled,
      friends: user.friends,
    };
  }

  async getUserPublicProfile(userId: string, viewerId?: string) {
    const user = await this.findById(userId);

    const isFriend = viewerId
      ? user.friends.some((f) => f.toString() === viewerId)
      : false;

    const canSeeAvatar = this.checkPrivacy(user.profileImagePrivacy, isFriend);
    const canSeeLastSeen = this.checkPrivacy(user.lastSeenPrivacy, isFriend);
    const canSeeOnlineStatus = this.checkPrivacy(user.onlineStatusPrivacy, isFriend);

    return {
      _id: user._id,
      name: user.name,
      displayName: user.displayName || user.name,
      username: user.username,
      bio: user.bio,
      avatar: canSeeAvatar ? user.avatar : '',
      status: canSeeOnlineStatus ? user.status : undefined,
      lastSeen: canSeeLastSeen ? user.lastSeen : undefined,
      callsEnabled: user.callsEnabled,
    };
  }

  private checkPrivacy(privacy: PrivacyOption, isFriend: boolean): boolean {
    switch (privacy) {
      case PrivacyOption.EVERYONE:
        return true;
      case PrivacyOption.FRIENDS:
        return isFriend;
      case PrivacyOption.NOBODY:
        return false;
      default:
        return true;
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findById(userId);

    if (dto.username) {
      const existingUsername = await this.userModel.findOne({
        username: dto.username,
        _id: { $ne: userId },
      });
      if (existingUsername) {
        throw new BadRequestException('Username already taken');
      }
    }

    Object.assign(user, dto);
    await user.save();

    return {
      message: 'Profile updated successfully',
      user: await this.getProfile(userId),
    };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.findById(userId);
    user.avatar = avatarUrl;
    await user.save();
    return { message: 'Avatar updated', avatar: avatarUrl };
  }

  async updatePrivacy(userId: string, dto: UpdatePrivacyDto) {
    const user = await this.findById(userId);
    Object.assign(user, dto);
    await user.save();
    return {
      message: 'Privacy settings updated',
      user: await this.getProfile(userId),
    };
  }

  async updateStatus(userId: string, status: UserStatus) {
    await this.userModel.findByIdAndUpdate(userId, {
      status,
      ...(status === UserStatus.OFFLINE ? { lastSeen: new Date() } : {}),
    });
  }

  async searchUsers(query: string, currentUserId: string) {
    const users = await this.userModel
      .find({
        $and: [
          { _id: { $ne: currentUserId } },
          { isDeleted: false },
          { isSearchable: { $ne: false } },
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { displayName: { $regex: query, $options: 'i' } },
              { username: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } },
              { phone: { $regex: query, $options: 'i' } },
            ],
          },
        ],
      })
      .select('name displayName username email phone avatar bio status lastSeen')
      .limit(20);

    return users;
  }

  async addFriend(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException('Cannot add yourself as a friend');
    }

    const user = await this.findById(userId);
    const friend = await this.findById(friendId);

    const friendObjectId = new Types.ObjectId(friendId);
    const userObjectId = new Types.ObjectId(userId);

    if (!user.friends.some((f) => f.toString() === friendId)) {
      user.friends.push(friendObjectId);
      await user.save();
    }

    if (!friend.friends.some((f) => f.toString() === userId)) {
      friend.friends.push(userObjectId);
      await friend.save();
    }

    return { message: 'Friend added successfully' };
  }

  async removeFriend(userId: string, friendId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { friends: new Types.ObjectId(friendId) },
    });
    await this.userModel.findByIdAndUpdate(friendId, {
      $pull: { friends: new Types.ObjectId(userId) },
    });
    return { message: 'Friend removed' };
  }

  async blockUser(userId: string, blockUserId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: new Types.ObjectId(blockUserId) },
      $pull: { friends: new Types.ObjectId(blockUserId) },
    });
    return { message: 'User blocked' };
  }

  async unblockUser(userId: string, blockUserId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: new Types.ObjectId(blockUserId) },
    });
    return { message: 'User unblocked' };
  }

  async getFriends(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('friends', 'name username avatar bio status lastSeen');
    return user?.friends || [];
  }

  async getContacts(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('friends', 'name username avatar bio status lastSeen');
    return user?.friends || [];
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new NotFoundException('User not found');

    if (user.password) {
      const isValid = await bcrypt.compare(dto.password, user.password);
      if (!isValid) throw new ForbiddenException('Invalid password');
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.status = UserStatus.OFFLINE;
    user.refreshToken = undefined;
    await user.save();

    return { message: 'Account deleted permanently' };
  }

  async getOnlineUsers(userIds: string[]) {
    return this.userModel
      .find({
        _id: { $in: userIds },
        status: UserStatus.ONLINE,
      })
      .select('_id name avatar status');
  }
}
