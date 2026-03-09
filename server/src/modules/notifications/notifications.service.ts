import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { EmailService } from '../../common/services/email.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) {}

  async createNotification(data: {
    recipientId: string;
    senderId?: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, any>;
  }) {
    const notification = await this.notificationModel.create({
      recipient: new Types.ObjectId(data.recipientId),
      sender: data.senderId ? new Types.ObjectId(data.senderId) : null,
      type: data.type,
      title: data.title,
      body: data.body,
      metadata: data.metadata || {},
    });

    // Check if user wants email notifications
    const recipient = await this.userModel.findById(data.recipientId);
    if (recipient?.emailNotificationsEnabled && recipient?.email) {
      if (data.type === NotificationType.MESSAGE && recipient.messageNotificationsEnabled) {
        await this.emailService.sendMessageNotification(
          recipient.email,
          data.title,
          data.body,
        );
      }
    }

    return notification;
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const notifications = await this.notificationModel
      .find({ recipient: new Types.ObjectId(userId) })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const unreadCount = await this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      isRead: false,
    });

    return { notifications, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: new Types.ObjectId(userId) },
      { isRead: true },
    );
    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(notificationId: string, userId: string) {
    await this.notificationModel.findOneAndDelete({
      _id: notificationId,
      recipient: new Types.ObjectId(userId),
    });
    return { message: 'Notification deleted' };
  }
}
