import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = new this.notificationModel(createNotificationDto);
    return notification.save();
  }

  async findByUserId(userId: string): Promise<any[]> {
    const notifications = await this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    // Convert relatedOrderId từ ObjectId sang string
    return notifications.map(notification => ({
      ...notification,
      relatedOrderId: notification.relatedOrderId?.toString(),
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false }).exec();
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.notificationModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany({ userId, isRead: false }, { isRead: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.notificationModel.findByIdAndDelete(id).exec();
  }

  async deleteAll(userId: string): Promise<void> {
    await this.notificationModel.deleteMany({ userId }).exec();
  }
}
