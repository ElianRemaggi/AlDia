import { AppDataSource } from '../../config/data-source';
import { Notification, NotificationType } from './entities/notification.entity';
import { AppError } from '../../shared/middleware';
import { ListNotificationsQuery } from './notification.dto';

const notificationRepo = () => AppDataSource.getRepository(Notification);

export async function createNotification(
  commerceId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadataJson?: Record<string, unknown>,
): Promise<Notification> {
  const notification = notificationRepo().create({
    commerceId,
    type,
    title,
    message,
    isRead: false,
    metadataJson: metadataJson ?? null,
  });
  return notificationRepo().save(notification);
}

export async function listNotifications(commerceId: string, query: ListNotificationsQuery) {
  const { page, limit, unreadOnly } = query;

  const qb = notificationRepo()
    .createQueryBuilder('n')
    .where('n.commerceId = :commerceId', { commerceId })
    .orderBy('n.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  if (unreadOnly === true) {
    qb.andWhere('n.isRead = false');
  }

  const [data, total] = await qb.getManyAndCount();

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUnreadCount(commerceId: string): Promise<{ count: number }> {
  const count = await notificationRepo().count({
    where: { commerceId, isRead: false },
  });
  return { count };
}

export async function markAsRead(id: string, commerceId: string): Promise<Notification> {
  const notification = await notificationRepo().findOne({ where: { id, commerceId } });
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }
  notification.isRead = true;
  return notificationRepo().save(notification);
}

export async function markAllRead(commerceId: string): Promise<void> {
  await notificationRepo()
    .createQueryBuilder()
    .update(Notification)
    .set({ isRead: true })
    .where('commerceId = :commerceId AND isRead = false', { commerceId })
    .execute();
}
