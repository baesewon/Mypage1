/**
 * storage.js - LocalStorage 기반 데이터 저장소 서비스
 * 향후 REST API 또는 외부 데이터베이스로 쉽게 교체할 수 있도록 모듈화된 인터페이스를 제공합니다.
 */

const STORAGE_KEYS = {
  FOODS: 'freshkeeper_foods_v1',
  STATS: 'freshkeeper_stats_v1',
  SETTINGS: 'freshkeeper_settings_v1',
  NOTIFICATIONS_LOG: 'freshkeeper_notif_log_v1'
};

const DEFAULT_STATS = {
  totalRegistered: 0,
  totalDeleted: 0,
  expiredDeleted: 0
};

const DEFAULT_SETTINGS = {
  browserNotificationsEnabled: false,
  alertThresholdDays: [7, 3, 1, 0], // 7일 전, 3일 전, 1일 전, 당일
  notifyOnExpired: true,
  darkMode: false
};

export const StorageService = {
  /**
   * 등록된 모든 식품 목록 조회
   * @returns {Array<Object>}
   */
  getFoods() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOODS);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('식품 목록 로드 오류:', err);
      return [];
    }
  },

  /**
   * 식품 목록 전체 저장
   * @param {Array<Object>} foods 
   */
  saveFoods(foods) {
    try {
      localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(foods));
    } catch (err) {
      console.error('식품 목록 저장 오류:', err);
    }
  },

  /**
   * 단일 식품 추가
   * @param {Object} food 
   * @returns {Object} 추가된 식품 객체
   */
  addFood(food) {
    const foods = this.getFoods();
    const newFood = {
      id: 'food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: food.name.trim(),
      category: food.category || '기타',
      quantity: Number(food.quantity) || 1,
      unit: food.unit || '개',
      location: food.location || '냉장고',
      expiryDate: food.expiryDate, // YYYY-MM-DD
      photo: food.photo || null, // Base64 or null
      memo: food.memo || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    foods.unshift(newFood);
    this.saveFoods(foods);

    // 통계 누적: 등록한 식품 수 +1
    const stats = this.getStats();
    stats.totalRegistered = (stats.totalRegistered || 0) + 1;
    this.saveStats(stats);

    return newFood;
  },

  /**
   * 여러 식품 일괄 추가 (샘플 데이터용)
   * @param {Array<Object>} newFoods 
   */
  addFoodsBulk(newFoods) {
    const foods = this.getFoods();
    const prepared = newFoods.map((f, idx) => ({
      id: 'food_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 7),
      name: f.name.trim(),
      category: f.category || '기타',
      quantity: Number(f.quantity) || 1,
      unit: f.unit || '개',
      location: f.location || '냉장고',
      expiryDate: f.expiryDate,
      photo: f.photo || null,
      memo: f.memo || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    const combined = [...prepared, ...foods];
    this.saveFoods(combined);

    const stats = this.getStats();
    stats.totalRegistered = (stats.totalRegistered || 0) + prepared.length;
    this.saveStats(stats);

    return prepared;
  },

  /**
   * 단일 식품 수정
   * @param {string} id 
   * @param {Object} updatedFields 
   * @returns {Object|null}
   */
  updateFood(id, updatedFields) {
    const foods = this.getFoods();
    const index = foods.findIndex(item => item.id === id);
    if (index === -1) return null;

    foods[index] = {
      ...foods[index],
      ...updatedFields,
      quantity: updatedFields.quantity !== undefined ? Number(updatedFields.quantity) : foods[index].quantity,
      updatedAt: new Date().toISOString()
    };
    this.saveFoods(foods);
    return foods[index];
  },

  /**
   * 식품 삭제
   * @param {string} id 
   * @param {boolean} isExpiredDiscard 유통기한이 지나서 폐기했는지 여부
   * @returns {boolean}
   */
  deleteFood(id, isExpiredDiscard = false) {
    const foods = this.getFoods();
    const initialLen = foods.length;
    const filtered = foods.filter(item => item.id !== id);
    if (filtered.length === initialLen) return false;

    this.saveFoods(filtered);

    // 통계 누적
    const stats = this.getStats();
    stats.totalDeleted = (stats.totalDeleted || 0) + 1;
    if (isExpiredDiscard) {
      stats.expiredDeleted = (stats.expiredDeleted || 0) + 1;
    }
    this.saveStats(stats);

    return true;
  },

  /**
   * 단일 식품 조회
   * @param {string} id 
   * @returns {Object|null}
   */
  getFoodById(id) {
    const foods = this.getFoods();
    return foods.find(f => f.id === id) || null;
  },

  /**
   * 통계 데이터 조회
   * @returns {Object}
   */
  getStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATS);
      return data ? { ...DEFAULT_STATS, ...JSON.parse(data) } : { ...DEFAULT_STATS };
    } catch (err) {
      console.error('통계 로드 오류:', err);
      return { ...DEFAULT_STATS };
    }
  },

  /**
   * 통계 데이터 저장
   * @param {Object} stats 
   */
  saveStats(stats) {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (err) {
      console.error('통계 저장 오류:', err);
    }
  },

  /**
   * 설정 조회
   * @returns {Object}
   */
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (err) {
      console.error('설정 로드 오류:', err);
      return { ...DEFAULT_SETTINGS };
    }
  },

  /**
   * 설정 저장
   * @param {Object} settings 
   */
  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (err) {
      console.error('설정 저장 오류:', err);
    }
  },

  /**
   * 알림 전송 이력 조회 (오늘 이미 보낸 브라우저 알림 중복 방지용)
   */
  getNotificationLog() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_LOG);
      return data ? JSON.parse(data) : {};
    } catch (err) {
      return {};
    }
  },

  /**
   * 알림 전송 이력 저장
   * @param {Object} log 
   */
  saveNotificationLog(log) {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_LOG, JSON.stringify(log));
    } catch (err) {}
  },

  /**
   * 데이터 초기화 (초기화 기능)
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.FOODS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS_LOG);
  },

  /**
   * 전체 데이터 내보내기 (JSON 백업)
   */
  exportData() {
    return {
      foods: this.getFoods(),
      stats: this.getStats(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
  },

  /**
   * 전체 데이터 불러오기 (JSON 복원)
   */
  importData(data) {
    if (data && Array.isArray(data.foods)) {
      this.saveFoods(data.foods);
      if (data.stats) this.saveStats(data.stats);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    }
    return false;
  }
};
