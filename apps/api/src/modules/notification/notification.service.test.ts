import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRepository } from '../../test/mocks/mock-repository';

vi.mock('../../config/data-source', () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from '../../config/data-source';
import {
  createNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
} from './notification.service';
import { NotificationType } from './entities/notification.entity';

function createMockQb() {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ['where', 'andWhere', 'orderBy', 'skip', 'take', 'update', 'set'];
  for (const m of chainMethods) {
    qb[m] = vi.fn().mockImplementation(() => qb);
  }
  qb['getManyAndCount'] = vi.fn().mockResolvedValue([[], 0]);
  qb['execute'] = vi.fn().mockResolvedValue({});
  return qb;
}

describe('notification.service', () => {
  let mockRepo: ReturnType<typeof createMockRepository> & {
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let mockQb: ReturnType<typeof createMockQb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQb = createMockQb();
    mockRepo = {
      ...createMockRepository(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQb),
    };
    vi.mocked(AppDataSource.getRepository).mockReturnValue(mockRepo as never);
  });

  describe('createNotification', () => {
    it('should create and save a notification', async () => {
      const saved = {
        id: 'notif-uuid-1',
        commerceId: 'commerce-uuid-1',
        type: NotificationType.IMPORT_FINISHED,
        title: 'Test',
        message: 'Test message',
        isRead: false,
        metadataJson: null,
        createdAt: new Date(),
      };
      mockRepo.create.mockReturnValue(saved);
      mockRepo.save.mockResolvedValue(saved);

      const result = await createNotification(
        'commerce-uuid-1',
        NotificationType.IMPORT_FINISHED,
        'Test',
        'Test message',
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commerceId: 'commerce-uuid-1',
          type: NotificationType.IMPORT_FINISHED,
          title: 'Test',
          message: 'Test message',
          isRead: false,
          metadataJson: null,
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });

    it('should pass metadataJson when provided', async () => {
      const metadata = { priceListId: 'pl-1' };
      mockRepo.create.mockImplementation((data: unknown) => ({ ...data as object }));
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      await createNotification(
        'commerce-uuid-1',
        NotificationType.PRICE_CHANGE,
        'Title',
        'Msg',
        metadata,
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadataJson: metadata }),
      );
    });
  });

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      const notifications = [{ id: 'n-1', isRead: false }];
      mockQb.getManyAndCount.mockResolvedValue([notifications, 1]);

      const result = await listNotifications('commerce-uuid-1', { page: 1, limit: 20 });

      expect(result.data).toEqual(notifications);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(mockQb.where).toHaveBeenCalledWith('n.commerceId = :commerceId', {
        commerceId: 'commerce-uuid-1',
      });
    });

    it('should apply unreadOnly filter when true', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await listNotifications('commerce-uuid-1', { page: 1, limit: 20, unreadOnly: true });

      expect(mockQb.andWhere).toHaveBeenCalledWith('n.isRead = false');
    });

    it('should not apply unreadOnly filter when false', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await listNotifications('commerce-uuid-1', { page: 1, limit: 20, unreadOnly: false });

      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('should calculate totalPages correctly', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 45]);

      const result = await listNotifications('commerce-uuid-1', { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockRepo.count.mockResolvedValue(5);

      const result = await getUnreadCount('commerce-uuid-1');

      expect(result).toEqual({ count: 5 });
      expect(mockRepo.count).toHaveBeenCalledWith({
        where: { commerceId: 'commerce-uuid-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = {
        id: 'notif-uuid-1',
        commerceId: 'commerce-uuid-1',
        isRead: false,
      };
      mockRepo.findOne.mockResolvedValue(notification);
      mockRepo.save.mockImplementation(async (e: unknown) => e);

      const result = await markAsRead('notif-uuid-1', 'commerce-uuid-1');

      expect(result).toHaveProperty('isRead', true);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw 404 when notification not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(markAsRead('bad-id', 'commerce-uuid-1')).rejects.toThrow(
        'Notification not found',
      );
    });

    it('should scope to commerceId', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(markAsRead('notif-uuid-1', 'wrong-commerce')).rejects.toThrow(
        'Notification not found',
      );

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'notif-uuid-1', commerceId: 'wrong-commerce' },
      });
    });
  });

  describe('markAllRead', () => {
    it('should update all unread notifications', async () => {
      mockQb.execute.mockResolvedValue({ affected: 3 });

      await markAllRead('commerce-uuid-1');

      expect(mockQb.update).toHaveBeenCalled();
      expect(mockQb.set).toHaveBeenCalledWith({ isRead: true });
      expect(mockQb.where).toHaveBeenCalledWith(
        'commerceId = :commerceId AND isRead = false',
        { commerceId: 'commerce-uuid-1' },
      );
      expect(mockQb.execute).toHaveBeenCalled();
    });
  });
});
