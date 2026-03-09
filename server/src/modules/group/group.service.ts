import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  ConversationType,
} from '../chat/schemas/conversation.schema';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) {}

  async getGroupInfo(groupId: string) {
    const group = await this.conversationModel
      .findById(groupId)
      .populate('participants', 'name avatar status')
      .populate('groupAdmin', 'name avatar')
      .populate('groupAdmins', 'name avatar');

    if (!group || group.type !== ConversationType.GROUP) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async addMember(groupId: string, userId: string, memberId: string) {
    const group = await this.conversationModel.findById(groupId);
    if (!group || group.type !== ConversationType.GROUP) {
      throw new NotFoundException('Group not found');
    }

    const isAdmin = group.groupAdmins.some((a: any) => a.toString() === userId);
    if (!isAdmin && group.groupAdmin?.toString() !== userId) {
      throw new ForbiddenException('Only admins can add members');
    }

    const isAlreadyMember = group.participants.some(
      (p: any) => p.toString() === memberId,
    );
    if (isAlreadyMember) {
      return { message: 'User is already a member' };
    }

    group.participants.push(new Types.ObjectId(memberId));
    await group.save();

    return { message: 'Member added successfully' };
  }

  async removeMember(groupId: string, userId: string, memberId: string) {
    const group = await this.conversationModel.findById(groupId);
    if (!group || group.type !== ConversationType.GROUP) {
      throw new NotFoundException('Group not found');
    }

    const isAdmin = group.groupAdmins.some((a: any) => a.toString() === userId);
    if (!isAdmin && group.groupAdmin?.toString() !== userId) {
      throw new ForbiddenException('Only admins can remove members');
    }

    group.participants = group.participants.filter(
      (p: any) => p.toString() !== memberId,
    ) as Types.ObjectId[];
    await group.save();

    return { message: 'Member removed' };
  }

  async updateGroup(
    groupId: string,
    userId: string,
    data: { groupName?: string; groupDescription?: string; tags?: string[] },
  ) {
    const group = await this.conversationModel.findById(groupId);
    if (!group || group.type !== ConversationType.GROUP) {
      throw new NotFoundException('Group not found');
    }

    const isAdmin = group.groupAdmins.some((a: any) => a.toString() === userId);
    if (!isAdmin && group.groupAdmin?.toString() !== userId) {
      throw new ForbiddenException('Only admins can update group');
    }

    if (data.groupName) group.groupName = data.groupName;
    if (data.groupDescription !== undefined) group.groupDescription = data.groupDescription;
    if (data.tags) group.tags = data.tags;
    await group.save();

    return { message: 'Group updated', group };
  }

  async makeAdmin(groupId: string, userId: string, memberId: string) {
    const group = await this.conversationModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    if (group.groupAdmin?.toString() !== userId) {
      throw new ForbiddenException('Only the group creator can promote admins');
    }

    if (!group.groupAdmins.some((a: any) => a.toString() === memberId)) {
      group.groupAdmins.push(new Types.ObjectId(memberId));
      await group.save();
    }

    return { message: 'Admin added' };
  }

  async leaveGroup(groupId: string, userId: string) {
    const group = await this.conversationModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    group.participants = group.participants.filter(
      (p: any) => p.toString() !== userId,
    ) as Types.ObjectId[];

    group.groupAdmins = group.groupAdmins.filter(
      (a: any) => a.toString() !== userId,
    ) as Types.ObjectId[];

    if (group.groupAdmin?.toString() === userId) {
      // Transfer admin to first remaining admin or participant
      group.groupAdmin = group.groupAdmins[0] || group.participants[0] || null;
    }

    await group.save();
    return { message: 'Left group successfully' };
  }
}
