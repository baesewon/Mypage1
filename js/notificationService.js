/**
 * notificationService.js - 브라우저 Web Notification API 및 인앱 알림 관리 서비스
 */

import { FoodService, FoodStatus } from './foodService.js';
import { StorageService } from './storage.js';

export const NotificationService = {
  notifications: [], // 현재 세션의 인앱 알림 목록
  unreadCount: 0,

  /**
   * 브라우저 알림 지원 여부 확인
   */
  isBrowserSupported() {
    return 'Notification' in window;
  },

  /**
   * 브라우저 알림 권한 상태 반환
   * @returns {'default'|'granted'|'denied'|'unsupported'}
   */
  getPermissionStatus() {
    if (!this.isBrowserSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * 브라우저 알림 권한 요청
   */
  async requestPermission() {
    if (!this.isBrowserSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      const settings = StorageService.getSettings();
      settings.browserNotificationsEnabled = (permission === 'granted');
      StorageService.saveSettings(settings);
      return permission === 'granted';
    } catch (err) {
      console.error('알림 권한 요청 실패:', err);
      return false;
    }
  },

  /**
   * 전체 식품 목록을 스캔하여 알림 생성 및 발송
   * 기준: 7일 전, 3일 전, 1일 전, 당일, 만료
   */
  checkAndNotify(foods) {
    const todayStr = new Date().toISOString().split('T')[0];
    const notifLog = StorageService.getNotificationLog();
    const settings = StorageService.getSettings();
    const enriched = FoodService.enrichFoods(foods);

    const activeNotifications = [];

    enriched.forEach(food => {
      const diff = food.diff;
      let alertType = null;
      let title = '';
      let body = '';
      let urgency = 'info';

      if (diff < 0) {
        alertType = 'EXPIRED';
        title = `🚨 유통기한 초과: ${food.name}`;
        body = `유통기한이 ${Math.abs(diff)}일 지났습니다. 상태를 확인하고 폐기해 주세요.`;
        urgency = 'danger';
      } else if (diff === 0) {
        alertType = 'DAY_0';
        title = `⚠️ 유통기한 당일: ${food.name}`;
        body = `오늘 유통기한이 만료됩니다! 잊지 말고 소비하세요.`;
        urgency = 'warning';
      } else if (diff === 1) {
        alertType = 'DAY_1';
        title = `⏰ 유통기한 1일 전: ${food.name}`;
        body = `내일 유통기한이 만료됩니다. (D-1)`;
        urgency = 'warning';
      } else if (diff === 3) {
        alertType = 'DAY_3';
        title = `📢 유통기한 3일 전: ${food.name}`;
        body = `유통기한이 3일 남았습니다. (D-3)`;
        urgency = 'caution';
      } else if (diff === 7) {
        alertType = 'DAY_7';
        title = `📅 유통기한 7일 전: ${food.name}`;
        body = `유통기한이 일주일 남았습니다. (D-7)`;
        urgency = 'info';
      }

      if (alertType) {
        const notifItem = {
          id: `${food.id}_${diff}_${todayStr}`,
          foodId: food.id,
          foodName: food.name,
          diff,
          dDay: food.dDay,
          category: food.category,
          location: food.location,
          alertType,
          title,
          body,
          urgency,
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };
        activeNotifications.push(notifItem);

        // 브라우저 알림 발송 조건: 브라우저 알림 권한 있고, 오늘 이 항목을 발송한 적 없는 경우
        const logKey = `${food.id}_${alertType}_${todayStr}`;
        if (
          this.isBrowserSupported() &&
          Notification.permission === 'granted' &&
          settings.browserNotificationsEnabled &&
          !notifLog[logKey]
        ) {
          try {
            new Notification(title, {
              body,
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🥑</text></svg>',
              tag: logKey
            });
            notifLog[logKey] = Date.now();
          } catch (e) {
            console.warn('브라우저 알림 띄우기 오류:', e);
          }
        }
      }
    });

    StorageService.saveNotificationLog(notifLog);
    this.notifications = activeNotifications;
    this.unreadCount = activeNotifications.length;

    return activeNotifications;
  },

  /**
   * 알림 읽음 처리
   */
  markAllAsRead() {
    this.unreadCount = 0;
  },

  /**
   * 현재 알림 목록 반환
   */
  getNotifications() {
    return this.notifications;
  }
};
