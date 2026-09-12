/**
 * FreshKeeper Bundle - File Protocol & HTTP Compatible
 */
(function() {
'use strict';

// --- storage.js ---
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

const StorageService = {
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


// --- foodService.js ---
/**
 * foodService.js - 식품 관련 비즈니스 로직, D-day 계산, 정렬 및 필터링
 */

const CATEGORIES = [
  { id: '과자', label: '과자', icon: '🍪', color: '#F59E0B' },
  { id: '음료', label: '음료', icon: '🥤', color: '#3B82F6' },
  { id: '우유/유제품', label: '우유/유제품', icon: '🥛', color: '#06B6D4' },
  { id: '육류', label: '육류', icon: '🥩', color: '#EF4444' },
  { id: '채소', label: '채소', icon: '🥦', color: '#10B981' },
  { id: '과일', label: '과일', icon: '🍎', color: '#F43F5E' },
  { id: '냉동식품', label: '냉동식품', icon: '🧊', color: '#6366F1' },
  { id: '조미료', label: '조미료', icon: '🧂', color: '#8B5CF6' },
  { id: '기타', label: '기타', icon: '📦', color: '#64748B' }
];

const LOCATIONS = [
  { id: '냉장고', label: '냉장고', icon: '❄️' },
  { id: '냉동실', label: '냉동실', icon: '🧊' },
  { id: '실온', label: '실온', icon: '🌡️' },
  { id: '기타', label: '기타', icon: '📦' }
];

const FoodStatus = {
  EXPIRED: 'EXPIRED',       // 유통기한 지남 (diff < 0)
  TODAY: 'TODAY',           // 오늘 만료 (diff === 0)
  CRITICAL: 'CRITICAL',     // 임박 (1 <= diff <= 3)
  WARNING: 'WARNING',       // 주의 (4 <= diff <= 7)
  SAFE: 'SAFE'              // 안전 (diff > 7)
};

const FoodService = {
  /**
   * 오늘 자정 기준 Date 객체 반환
   */
  getTodayMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  },

  /**
   * 유통기한 문자열(YYYY-MM-DD)을 자정 Date 객체로 변환
   */
  parseExpiryDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  },

  /**
   * 오늘 기준 D-day 일수 계산
   * @param {string} expiryDateStr YYYY-MM-DD
   * @returns {number} (양수: 남은 일수, 0: 당일, 음수: 지난 일수)
   */
  calculateDaysDiff(expiryDateStr) {
    const target = this.parseExpiryDate(expiryDateStr);
    if (!target || isNaN(target.getTime())) return 9999;
    const today = this.getTodayMidnight();
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * D-day 라벨 텍스트 반환
   * @param {number} diff 
   * @returns {string} 예: 'D-3', 'D-day', 'D+2 (유통기한 지남)'
   */
  getDDayLabel(diff) {
    if (diff > 0) {
      return `D-${diff}`;
    } else if (diff === 0) {
      return 'D-day';
    } else {
      return `D+${Math.abs(diff)} (유통기한 지남)`;
    }
  },

  /**
   * 식품 상태 분류 반환
   * @param {number} diff 
   * @returns {string} FoodStatus 키
   */
  getStatus(diff) {
    if (diff < 0) return FoodStatus.EXPIRED;
    if (diff === 0) return FoodStatus.TODAY;
    if (diff <= 3) return FoodStatus.CRITICAL;
    if (diff <= 7) return FoodStatus.WARNING;
    return FoodStatus.SAFE;
  },

  /**
   * 식품 객체에 dDay, diff, status 계산값 데코레이션
   * @param {Object} food 
   */
  enrichFood(food) {
    const diff = this.calculateDaysDiff(food.expiryDate);
    const dDay = this.getDDayLabel(diff);
    const status = this.getStatus(diff);
    const categoryInfo = CATEGORIES.find(c => c.id === food.category) || CATEGORIES[CATEGORIES.length - 1];
    const locationInfo = LOCATIONS.find(l => l.id === food.location) || LOCATIONS[0];

    return {
      ...food,
      diff,
      dDay,
      status,
      categoryIcon: categoryInfo.icon,
      categoryColor: categoryInfo.color,
      locationIcon: locationInfo.icon
    };
  },

  /**
   * 식품 목록 전체에 계산 정보 추가
   * @param {Array<Object>} foods 
   */
  enrichFoods(foods) {
    return foods.map(f => this.enrichFood(f));
  },

  /**
   * 검색, 필터, 정렬 적용
   * @param {Array<Object>} foods 
   * @param {Object} options { query, filter, sort }
   */
  filterAndSort(foods, { query = '', filter = 'ALL', sort = 'EXPIRY_ASC' }) {
    let result = this.enrichFoods(foods);

    // 1. 검색어 필터 (식품명, 카테고리, 메모)
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery) {
      result = result.filter(f => 
        f.name.toLowerCase().includes(cleanQuery) ||
        f.category.toLowerCase().includes(cleanQuery) ||
        (f.memo && f.memo.toLowerCase().includes(cleanQuery))
      );
    }

    // 2. 조건 필터
    switch (filter) {
      case 'URGENT': // 유통기한 임박 (오늘 포함 7일 이내)
        result = result.filter(f => f.diff >= 0 && f.diff <= 7);
        break;
      case 'EXPIRED': // 유통기한 지남
        result = result.filter(f => f.diff < 0);
        break;
      case 'FRIDGE': // 냉장고
        result = result.filter(f => f.location === '냉장고');
        break;
      case 'FREEZER': // 냉동실
        result = result.filter(f => f.location === '냉동실');
        break;
      case 'ROOM': // 실온
        result = result.filter(f => f.location === '실온');
        break;
      case 'OTHER': // 기타 위치
        result = result.filter(f => f.location === '기타');
        break;
      case 'ALL':
      default:
        // 전체 유지
        break;
    }

    // 3. 정렬
    result.sort((a, b) => {
      if (sort === 'EXPIRY_ASC') {
        // 유통기한 가까운 순 (만료된 식품이 가장 위 또는 가장 임박한 식품 위)
        // 자연스러운 뷰: 만료된 것(음수) -> 임박 -> 먼 순
        return a.diff - b.diff;
      } else if (sort === 'EXPIRY_DESC') {
        // 유통기한 먼 순
        return b.diff - a.diff;
      } else if (sort === 'NAME_ASC') {
        // 이름순 (가나다/알파벳)
        return a.name.localeCompare(b.name, 'ko');
      }
      return 0;
    });

    return result;
  },

  /**
   * 대시보드 통계 지표 계산
   * @param {Array<Object>} foods 
   */
  calculateDashboardMetrics(foods) {
    const enriched = this.enrichFoods(foods);
    const metrics = {
      totalCount: enriched.length,
      within7DaysCount: 0,
      todayCount: 0,
      expiredCount: 0,
      fridgeCount: 0,
      freezerCount: 0,
      roomCount: 0,
      otherCount: 0,
      urgentItems: [] // D-7 이내 및 이미 지난 식품
    };

    enriched.forEach(f => {
      if (f.diff < 0) {
        metrics.expiredCount++;
      } else if (f.diff === 0) {
        metrics.todayCount++;
        metrics.within7DaysCount++;
      } else if (f.diff <= 7) {
        metrics.within7DaysCount++;
      }

      if (f.location === '냉장고') metrics.fridgeCount++;
      else if (f.location === '냉동실') metrics.freezerCount++;
      else if (f.location === '실온') metrics.roomCount++;
      else metrics.otherCount++;

      // 임박 및 경과 식품 목록 수집 (diff <= 7)
      if (f.diff <= 7) {
        metrics.urgentItems.push(f);
      }
    });

    // 임박 항목은 가장 위험한(만료 및 임박) 순으로 정렬
    metrics.urgentItems.sort((a, b) => a.diff - b.diff);

    return metrics;
  },

  /**
   * 카테고리별 통계 계산
   */
  calculateCategoryBreakdown(foods) {
    const counts = {};
    CATEGORIES.forEach(c => { counts[c.id] = 0; });
    foods.forEach(f => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return counts;
  },

  /**
   * 보관 위치별 통계 계산
   */
  calculateLocationBreakdown(foods) {
    const counts = {};
    LOCATIONS.forEach(l => { counts[l.id] = 0; });
    foods.forEach(f => {
      counts[f.location] = (counts[f.location] || 0) + 1;
    });
    return counts;
  }
};


// --- sampleData.js ---
/**
 * sampleData.js - 테스트 및 초기 체험용 현실감 있는 한국 식재료 샘플 데이터
 * 실행 시점의 '오늘 날짜'를 기준으로 D+2, D-day, D-1, D-3, D-7, 여유 있는 유통기한까지 고루 생성합니다.
 */

function formatDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getSampleFoods() {
  return [
    {
      name: '계란 (10구)',
      category: '기타',
      quantity: 1,
      unit: '판',
      location: '냉장고',
      expiryDate: formatDateOffset(-2), // D+2 (유통기한 지남)
      memo: '신선란, 확인 후 빠른 폐기 필요',
      photo: null
    },
    {
      name: '프레시 샌드위치',
      category: '과자',
      quantity: 1,
      unit: '개',
      location: '냉장고',
      expiryDate: formatDateOffset(0), // D-day (오늘 만료)
      memo: '오늘 점심이나 저녁에 꼭 먹기',
      photo: null
    },
    {
      name: '서울우유 1L',
      category: '우유/유제품',
      quantity: 2,
      unit: '팩',
      location: '냉장고',
      expiryDate: formatDateOffset(1), // D-1
      memo: '개봉 후 냉장보관',
      photo: null
    },
    {
      name: '슬라이스 햄',
      category: '육류',
      quantity: 1,
      unit: '팩',
      location: '냉장고',
      expiryDate: formatDateOffset(2), // D-2
      memo: '샌드위치용 햄',
      photo: null
    },
    {
      name: '플레인 요거트 (4입)',
      category: '우유/유제품',
      quantity: 4,
      unit: '개',
      location: '냉장고',
      expiryDate: formatDateOffset(3), // D-3
      memo: '아침 식사 대용',
      photo: null
    },
    {
      name: '국산 찌개용 두부',
      category: '기타',
      quantity: 1,
      unit: '모',
      location: '냉장고',
      expiryDate: formatDateOffset(5), // D-5
      memo: '된장찌개 끓일 예정',
      photo: null
    },
    {
      name: '한돈 삼겹살 500g',
      category: '육류',
      quantity: 1,
      unit: '팩',
      location: '냉장고',
      expiryDate: formatDateOffset(7), // D-7
      memo: '주말 저녁 구이용',
      photo: null
    },
    {
      name: '브로콜리',
      category: '채소',
      quantity: 2,
      unit: '송이',
      location: '냉장고',
      expiryDate: formatDateOffset(8), // D-8
      memo: '살짝 데쳐서 보관',
      photo: null
    },
    {
      name: '꿀사과',
      category: '과일',
      quantity: 5,
      unit: '개',
      location: '실온',
      expiryDate: formatDateOffset(14), // D-14
      memo: '통풍 잘되는 서늘한 곳',
      photo: null
    },
    {
      name: '코카콜라 제로 1.5L',
      category: '음료',
      quantity: 2,
      unit: '병',
      location: '실온',
      expiryDate: formatDateOffset(45), // D-45
      memo: '팬트리 보관',
      photo: null
    },
    {
      name: 'CJ 비비고 왕교자 만두',
      category: '냉동식품',
      quantity: 2,
      unit: '봉',
      location: '냉동실',
      expiryDate: formatDateOffset(120), // D-120
      memo: '냉동 보관 필수',
      photo: null
    },
    {
      name: '진간장 930ml',
      category: '조미료',
      quantity: 1,
      unit: '병',
      location: '실온',
      expiryDate: formatDateOffset(280), // D-280
      memo: '양념장 및 조림용',
      photo: null
    }
  ];
}


// --- notificationService.js ---
/**
 * notificationService.js - 브라우저 Web Notification API 및 인앱 알림 관리 서비스
 */


const NotificationService = {
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


// --- views.js ---
/**
 * views.js - UI 컴포넌트 및 화면 렌더링 템플릿
 */


const Views = {
  /**
   * D-day 배지 HTML 생성
   */
  renderDDayBadge(diff, dDay) {
    if (diff < 0) {
      return `<span class="badge badge-expired">⚠️ ${dDay}</span>`;
    } else if (diff === 0) {
      return `<span class="badge badge-today">🚨 ${dDay} (오늘 만료)</span>`;
    } else if (diff <= 3) {
      return `<span class="badge badge-critical">⏰ ${dDay}</span>`;
    } else if (diff <= 7) {
      return `<span class="badge badge-warning">📅 ${dDay}</span>`;
    } else {
      return `<span class="badge badge-safe">🌿 ${dDay}</span>`;
    }
  },

  /**
   * 식품 카드 HTML 생성
   */
  renderFoodCard(food, { showActions = true } = {}) {
    const photoHtml = food.photo
      ? `<img src="${food.photo}" alt="${food.name}" class="food-card-img" />`
      : `<div class="food-card-icon-placeholder" style="background-color: ${food.categoryColor}20; color: ${food.categoryColor}">
           <span class="emoji">${food.categoryIcon}</span>
         </div>`;

    return `
      <div class="food-card ${food.status.toLowerCase()}" data-id="${food.id}">
        <div class="food-card-media">
          ${photoHtml}
          <div class="food-card-location-tag">
            <span>${food.locationIcon}</span> ${food.location}
          </div>
        </div>
        <div class="food-card-content">
          <div class="food-card-header">
            <div class="food-card-tags">
              <span class="category-tag" style="color: ${food.categoryColor}; border-color: ${food.categoryColor}40">
                ${food.categoryIcon} ${food.category}
              </span>
              ${this.renderDDayBadge(food.diff, food.dDay)}
            </div>
            <h3 class="food-card-name" title="${food.name}">${food.name}</h3>
          </div>

          <div class="food-card-meta">
            <div class="meta-item">
              <span class="meta-label">수량</span>
              <span class="meta-value font-bold">${food.quantity} ${food.unit || '개'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">유통기한</span>
              <span class="meta-value">${food.expiryDate}</span>
            </div>
          </div>

          ${food.memo ? `<p class="food-card-memo">${food.memo}</p>` : ''}

          ${showActions ? `
            <div class="food-card-actions">
              <button class="btn btn-secondary btn-sm edit-food-btn" data-id="${food.id}">
                ✏️ 수정
              </button>
              <button class="btn btn-danger-subtle btn-sm delete-food-btn" data-id="${food.id}" data-name="${food.name}">
                🗑️ 삭제
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * 1. 홈 화면 (Home View) 렌더링
   */
  renderHome(foods) {
    const metrics = FoodService.calculateDashboardMetrics(foods);

    // D-day 임박 목록 (<= 3일 및 만료)
    const urgentTopList = metrics.urgentItems.filter(f => f.diff <= 3);

    return `
      <div class="view-container animate-fade">
        <!-- 상단 환영 및 빠른 요약 헤더 -->
        <header class="home-hero">
          <div class="hero-text">
            <h2>우리 집 냉장고 지킴이 🥑</h2>
            <p>오늘도 알뜰하고 신선하게 식품을 관리하세요</p>
          </div>
          <button class="btn btn-primary btn-cta" id="home-add-btn">
            + 식품 등록
          </button>
        </header>

        <!-- 홈 상단: 유통기한 임박/주의 알림 배너 (요구사항 3단계, 5단계) -->
        <section class="section-urgent-highlight">
          <div class="section-header">
            <div class="section-title-wrap">
              <span class="icon-warning-pulse">⚠️</span>
              <h3>유통기한 임박 식품</h3>
            </div>
            <span class="badge ${metrics.urgentItems.length > 0 ? 'badge-critical' : 'badge-safe'}">
              ${metrics.urgentItems.length}개 주의
            </span>
          </div>

          ${urgentTopList.length > 0 ? `
            <div class="urgent-quick-list">
              ${urgentTopList.map(item => `
                <div class="urgent-quick-item ${item.diff < 0 ? 'is-expired' : (item.diff === 0 ? 'is-today' : 'is-urgent')}" data-id="${item.id}">
                  <div class="urgent-item-info">
                    <span class="urgent-item-icon">${item.categoryIcon}</span>
                    <strong class="urgent-item-name">${item.name}</strong>
                    <span class="urgent-item-loc">${item.locationIcon} ${item.location}</span>
                  </div>
                  <div class="urgent-item-badge">
                    ${this.renderDDayBadge(item.diff, item.dDay)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-urgent-banner">
              <p>✨ 3일 이내로 임박하거나 유통기한이 지난 식품이 없습니다!</p>
            </div>
          `}
        </section>

        <!-- 대시보드 통계 그리드 (요구사항 4단계) -->
        <section class="dashboard-grid">
          <div class="dashboard-card stat-total" data-filter="ALL">
            <div class="stat-icon">📦</div>
            <div class="stat-content">
              <span class="stat-label">전체 식품</span>
              <strong class="stat-number">${metrics.totalCount}</strong>
            </div>
          </div>

          <div class="dashboard-card stat-urgent" data-filter="URGENT">
            <div class="stat-icon">⏰</div>
            <div class="stat-content">
              <span class="stat-label">7일 이내 임박</span>
              <strong class="stat-number text-urgent">${metrics.within7DaysCount}</strong>
            </div>
          </div>

          <div class="dashboard-card stat-today" data-filter="TODAY">
            <div class="stat-icon">🚨</div>
            <div class="stat-content">
              <span class="stat-label">오늘 만료</span>
              <strong class="stat-number text-today">${metrics.todayCount}</strong>
            </div>
          </div>

          <div class="dashboard-card stat-expired" data-filter="EXPIRED">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <span class="stat-label">유통기한 지남</span>
              <strong class="stat-number text-expired">${metrics.expiredCount}</strong>
            </div>
          </div>
        </section>

        <!-- 보관 위치별 요약 (요구사항 4단계) -->
        <section class="storage-locations-summary">
          <h3 class="section-title">보관 장소별 현황</h3>
          <div class="location-chips-grid">
            <div class="location-stat-chip" data-filter="FRIDGE">
              <span class="loc-icon">❄️</span>
              <div class="loc-text">
                <span class="loc-name">냉장고</span>
                <strong class="loc-count">${metrics.fridgeCount}개</strong>
              </div>
            </div>
            <div class="location-stat-chip" data-filter="FREEZER">
              <span class="loc-icon">🧊</span>
              <div class="loc-text">
                <span class="loc-name">냉동실</span>
                <strong class="loc-count">${metrics.freezerCount}개</strong>
              </div>
            </div>
            <div class="location-stat-chip" data-filter="ROOM">
              <span class="loc-icon">🌡️</span>
              <div class="loc-text">
                <span class="loc-name">실온</span>
                <strong class="loc-count">${metrics.roomCount}개</strong>
              </div>
            </div>
            <div class="location-stat-chip" data-filter="OTHER">
              <span class="loc-icon">📦</span>
              <div class="loc-text">
                <span class="loc-name">기타</span>
                <strong class="loc-count">${metrics.otherCount}개</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- 최근 등록 식품 미리보기 -->
        <section class="recent-foods-section">
          <div class="section-header">
            <h3 class="section-title">식품 목록 미리보기</h3>
            <button class="btn-link" id="home-view-all-btn">전체보기 →</button>
          </div>
          ${foods.length > 0 ? `
            <div class="food-cards-grid">
              ${FoodService.filterAndSort(foods, { sort: 'EXPIRY_ASC' }).slice(0, 4).map(f => this.renderFoodCard(f)).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-icon">🥗</div>
              <h4>등록된 식품이 없습니다</h4>
              <p>자주 먹는 식재료나 간식을 등록해 유통기한을 지켜보세요.</p>
              <button class="btn btn-primary btn-sm" id="empty-add-btn">+ 첫 식품 등록하기</button>
            </div>
          `}
        </section>
      </div>
    `;
  },

  /**
   * 2. 식품 목록 화면 (List View) 렌더링
   */
  renderList(foods, state = {}) {
    const query = state.query || '';
    const filter = state.filter || 'ALL';
    const sort = state.sort || 'EXPIRY_ASC';

    const filteredFoods = FoodService.filterAndSort(foods, { query, filter, sort });

    return `
      <div class="view-container animate-fade">
        <div class="view-header">
          <div class="view-title-row">
            <h2>식품 목록</h2>
            <span class="text-muted">총 ${filteredFoods.length}개</span>
          </div>
        </div>

        <!-- 검색창 (요구사항 2단계) -->
        <div class="search-bar-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="search" 
            id="food-search-input" 
            class="input-search" 
            placeholder="식품명, 카테고리 검색..." 
            value="${query}"
          />
          ${query ? `<button class="btn-clear-search" id="clear-search-btn">✕</button>` : ''}
        </div>

        <!-- 필터 칩 (요구사항 2단계: 전체, 유통기한 임박, 유통기한 지남, 냉장고, 냉동실, 실온) -->
        <div class="filter-chips-scroller">
          <button class="filter-chip ${filter === 'ALL' ? 'active' : ''}" data-filter="ALL">전체</button>
          <button class="filter-chip ${filter === 'URGENT' ? 'active' : ''}" data-filter="URGENT">⚠️ 유통기한 임박</button>
          <button class="filter-chip ${filter === 'EXPIRED' ? 'active' : ''}" data-filter="EXPIRED">🚨 유통기한 지남</button>
          <button class="filter-chip ${filter === 'FRIDGE' ? 'active' : ''}" data-filter="FRIDGE">❄️ 냉장고</button>
          <button class="filter-chip ${filter === 'FREEZER' ? 'active' : ''}" data-filter="FREEZER">🧊 냉동실</button>
          <button class="filter-chip ${filter === 'ROOM' ? 'active' : ''}" data-filter="ROOM">🌡️ 실온</button>
        </div>

        <!-- 정렬 옵션 바 -->
        <div class="list-controls-bar">
          <span class="results-count">검색 결과 <strong>${filteredFoods.length}</strong>건</span>
          <div class="sort-selector">
            <label for="food-sort-select">정렬:</label>
            <select id="food-sort-select" class="select-sm">
              <option value="EXPIRY_ASC" ${sort === 'EXPIRY_ASC' ? 'selected' : ''}>유통기한 가까운 순</option>
              <option value="EXPIRY_DESC" ${sort === 'EXPIRY_DESC' ? 'selected' : ''}>유통기한 먼 순</option>
              <option value="NAME_ASC" ${sort === 'NAME_ASC' ? 'selected' : ''}>이름순</option>
            </select>
          </div>
        </div>

        <!-- 식품 카드 그리드 (요구사항 5단계 카드 정보) -->
        ${filteredFoods.length > 0 ? `
          <div class="food-cards-grid">
            ${filteredFoods.map(f => this.renderFoodCard(f)).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">🔎</div>
            <h4>조건에 맞는 식품이 없습니다</h4>
            <p>검색어나 필터 조건을 변경해 보세요.</p>
            <button class="btn btn-secondary btn-sm" id="reset-filter-btn">필터 초기화</button>
          </div>
        `}
      </div>
    `;
  },

  /**
   * 3. 식품 등록 / 수정 폼 화면 (Form View) 렌더링
   */
  renderForm(food = null) {
    const isEdit = Boolean(food && food.id);
    const title = isEdit ? '식품 정보 수정' : '새 식품 등록';

    // 기본 오늘 날짜 YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExpiry = food ? food.expiryDate : todayStr;

    return `
      <div class="view-container animate-fade">
        <div class="view-header">
          <h2>${title}</h2>
          <p class="text-muted">${isEdit ? '식품 정보를 최신 상태로 업데이트하세요.' : '식품의 유통기한과 정보를 정확히 입력해 주세요.'}</p>
        </div>

        <form id="food-form" class="food-form-card" data-mode="${isEdit ? 'edit' : 'add'}" data-id="${isEdit ? food.id : ''}">
          <!-- 식품 사진 첨부 영역 (요구사항 2단계) -->
          <div class="form-group photo-upload-group">
            <label class="form-label">식품 사진 (선택)</label>
            <div class="photo-upload-container">
              <div class="photo-preview ${food && food.photo ? 'has-image' : ''}" id="photo-preview-box">
                ${food && food.photo 
                  ? `<img src="${food.photo}" alt="미리보기" id="photo-preview-img" />`
                  : `<div class="photo-placeholder"><span class="photo-icon">📷</span><span>사진 등록</span></div>`
                }
              </div>
              <div class="photo-actions">
                <input type="file" id="photo-file-input" accept="image/*" class="file-input-hidden" />
                <button type="button" class="btn btn-secondary btn-sm" id="photo-select-btn">
                  📁 사진 선택
                </button>
                <button type="button" class="btn btn-secondary btn-sm ${food && food.photo ? '' : 'hidden'}" id="photo-remove-btn">
                  삭제
                </button>
                <p class="form-hint">카메라 촬영 또는 갤러리 이미지 (자동 압축)</p>
              </div>
            </div>
          </div>

          <!-- 식품 이름 -->
          <div class="form-group">
            <label for="food-name" class="form-label required">식품 이름</label>
            <input 
              type="text" 
              id="food-name" 
              name="name" 
              class="input-control" 
              placeholder="예: 서울우유 1L, 사과, 비비고 만두" 
              value="${food ? food.name : ''}" 
              required 
              maxlength="40"
            />
          </div>

          <!-- 카테고리 선택 (요구사항 2단계) -->
          <div class="form-group">
            <label class="form-label required">카테고리</label>
            <div class="category-selector-grid">
              ${CATEGORIES.map(cat => `
                <label class="category-radio-chip">
                  <input 
                    type="radio" 
                    name="category" 
                    value="${cat.id}" 
                    ${(food ? food.category === cat.id : cat.id === '우유/유제품') ? 'checked' : ''}
                  />
                  <span class="chip-content" style="--chip-color: ${cat.color}">
                    <span class="chip-icon">${cat.icon}</span>
                    <span class="chip-text">${cat.label}</span>
                  </span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 수량 및 단위 -->
          <div class="form-row">
            <div class="form-group flex-2">
              <label for="food-quantity" class="form-label required">수량</label>
              <div class="quantity-control-wrap">
                <button type="button" class="qty-btn" id="qty-minus">-</button>
                <input 
                  type="number" 
                  id="food-quantity" 
                  name="quantity" 
                  class="input-control text-center font-bold" 
                  value="${food ? food.quantity : 1}" 
                  min="1" 
                  max="999" 
                  required 
                />
                <button type="button" class="qty-btn" id="qty-plus">+</button>
              </div>
            </div>
            <div class="form-group flex-1">
              <label for="food-unit" class="form-label">단위</label>
              <select id="food-unit" name="unit" class="select-control">
                ${['개', '팩', '병', '봉', '모', '판', '박스', '캔', 'g', 'kg', 'ml', 'L'].map(u => `
                  <option value="${u}" ${(food ? food.unit === u : u === '개') ? 'selected' : ''}>${u}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- 보관 위치 (요구사항 1단계: 냉장고, 냉동실, 실온, 기타) -->
          <div class="form-group">
            <label class="form-label required">보관 위치</label>
            <div class="location-selector-grid">
              ${LOCATIONS.map(loc => `
                <label class="location-radio-chip">
                  <input 
                    type="radio" 
                    name="location" 
                    value="${loc.id}" 
                    ${(food ? food.location === loc.id : loc.id === '냉장고') ? 'checked' : ''}
                  />
                  <span class="chip-content">
                    <span class="chip-icon">${loc.icon}</span>
                    <span class="chip-text">${loc.label}</span>
                  </span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 유통기한 등록 -->
          <div class="form-group">
            <label for="food-expiry" class="form-label required">유통기한</label>
            <input 
              type="date" 
              id="food-expiry" 
              name="expiryDate" 
              class="input-control font-bold" 
              value="${defaultExpiry}" 
              required 
            />
            <div class="quick-expiry-presets">
              <button type="button" class="preset-date-btn" data-days="3">+3일</button>
              <button type="button" class="preset-date-btn" data-days="7">+1주일</button>
              <button type="button" class="preset-date-btn" data-days="14">+2주일</button>
              <button type="button" class="preset-date-btn" data-days="30">+1개월</button>
              <button type="button" class="preset-date-btn" data-days="90">+3개월</button>
            </div>
          </div>

          <!-- 메모 (선택) -->
          <div class="form-group">
            <label for="food-memo" class="form-label">메모 (선택)</label>
            <input 
              type="text" 
              id="food-memo" 
              name="memo" 
              class="input-control" 
              placeholder="예: 개봉 후 3일 내 섭취, 요리 레시피 등" 
              value="${food && food.memo ? food.memo : ''}" 
              maxlength="100" 
            />
          </div>

          <!-- 폼 하단 버튼 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="form-cancel-btn">취소</button>
            <button type="submit" class="btn btn-primary flex-1">
              ${isEdit ? '수정 완료' : '식품 등록하기'}
            </button>
          </div>
        </form>
      </div>
    `;
  },

  /**
   * 4. 유통기한 임박 화면 (Urgent View) 렌더링
   */
  renderUrgent(foods) {
    const enriched = FoodService.enrichFoods(foods);
    // 7일 이내 및 지난 식품만 필터
    const urgentFoods = enriched.filter(f => f.diff <= 7);
    urgentFoods.sort((a, b) => a.diff - b.diff);

    // 세부 분류
    const expiredList = urgentFoods.filter(f => f.diff < 0);
    const todayList = urgentFoods.filter(f => f.diff === 0);
    const criticalList = urgentFoods.filter(f => f.diff >= 1 && f.diff <= 3);
    const warningList = urgentFoods.filter(f => f.diff >= 4 && f.diff <= 7);

    return `
      <div class="view-container animate-fade">
        <div class="view-header">
          <div class="view-title-row">
            <h2>⚠️ 유통기한 임박 및 경과</h2>
            <span class="badge badge-critical">${urgentFoods.length}개 항목</span>
          </div>
          <p class="text-muted">빠른 섭취 또는 정리가 필요한 식품들입니다</p>
        </div>

        ${urgentFoods.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎉</div>
            <h4>임박하거나 지난 식품이 없습니다!</h4>
            <p>모든 식품이 신선한 상태로 잘 관리되고 있습니다.</p>
          </div>
        ` : `
          <!-- 1. 이미 지난 식품 (가장 위험) -->
          ${expiredList.length > 0 ? `
            <div class="urgent-group-section group-expired">
              <div class="urgent-group-header">
                <span class="urgent-icon">🚨</span>
                <h3>유통기한 지난 식품 (${expiredList.length})</h3>
                <span class="group-guide">식품 상태를 확인 후 폐기 또는 정리하세요</span>
              </div>
              <div class="food-cards-grid">
                ${expiredList.map(f => this.renderFoodCard(f)).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 2. 오늘 만료되는 식품 -->
          ${todayList.length > 0 ? `
            <div class="urgent-group-section group-today">
              <div class="urgent-group-header">
                <span class="urgent-icon">⚠️</span>
                <h3>오늘 유통기한 만료 (${todayList.length})</h3>
                <span class="group-guide">오늘 꼭 식사 또는 간식으로 소비하세요!</span>
              </div>
              <div class="food-cards-grid">
                ${todayList.map(f => this.renderFoodCard(f)).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 3. 1~3일 이내 임박 식품 -->
          ${criticalList.length > 0 ? `
            <div class="urgent-group-section group-critical">
              <div class="urgent-group-header">
                <span class="urgent-icon">⏰</span>
                <h3>1~3일 이내 만료 임박 (${criticalList.length})</h3>
                <span class="group-guide">이번 주 식단에 먼저 활용해 보세요</span>
              </div>
              <div class="food-cards-grid">
                ${criticalList.map(f => this.renderFoodCard(f)).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 4. 4~7일 이내 만료 예정 -->
          ${warningList.length > 0 ? `
            <div class="urgent-group-section group-warning">
              <div class="urgent-group-header">
                <span class="urgent-icon">📅</span>
                <h3>일주일 이내 만료 예정 (${warningList.length})</h3>
                <span class="group-guide">여유가 있지만 미리 확인해 두세요</span>
              </div>
              <div class="food-cards-grid">
                ${warningList.map(f => this.renderFoodCard(f)).join('')}
              </div>
            </div>
          ` : ''}
        `}
      </div>
    `;
  },

  /**
   * 5. 통계 화면 (Stats View) 렌더링 (요구사항 4단계)
   */
  renderStats(foods) {
    const stats = StorageService.getStats();
    const currentStoredCount = foods.length;
    const totalRegistered = stats.totalRegistered || currentStoredCount;
    const totalDeleted = stats.totalDeleted || 0;
    const expiredDeleted = stats.expiredDeleted || 0;
    const consumedCount = Math.max(0, totalDeleted - expiredDeleted);

    // 소비율 vs 폐기율 계산
    const consumeRate = totalDeleted > 0 ? Math.round((consumedCount / totalDeleted) * 100) : 100;
    const wasteRate = totalDeleted > 0 ? Math.round((expiredDeleted / totalDeleted) * 100) : 0;

    // 위치별 현황
    const locationCounts = FoodService.calculateLocationBreakdown(foods);
    // 카테고리별 현황
    const categoryCounts = FoodService.calculateCategoryBreakdown(foods);

    return `
      <div class="view-container animate-fade">
        <div class="view-header">
          <h2>식품 관리 통계</h2>
          <p class="text-muted">우리 집의 식재료 소비 습관과 보관 현황을 확인하세요</p>
        </div>

        <!-- 핵심 4대 누적 지표 (요구사항 4단계) -->
        <div class="stats-key-grid">
          <div class="stat-box primary">
            <span class="stat-box-title">현재 보관 중인 식품</span>
            <strong class="stat-box-value">${currentStoredCount}</strong>
            <span class="stat-box-sub">신선하게 관리 중</span>
          </div>

          <div class="stat-box info">
            <span class="stat-box-title">총 등록한 식품 수</span>
            <strong class="stat-box-value">${totalRegistered}</strong>
            <span class="stat-box-sub">누적 등록 식품</span>
          </div>

          <div class="stat-box success">
            <span class="stat-box-title">알뜰 소진(식사/사용)</span>
            <strong class="stat-box-value">${consumedCount}</strong>
            <span class="stat-box-sub">유통기한 전 소진</span>
          </div>

          <div class="stat-box danger">
            <span class="stat-box-title">유통기한 지나 삭제한 식품</span>
            <strong class="stat-box-value">${expiredDeleted}</strong>
            <span class="stat-box-sub">기한 초과 폐기</span>
          </div>
        </div>

        <!-- 소비 효율성 프로그레스 -->
        <div class="stats-card">
          <div class="card-header-flex">
            <h3>식재료 소진 효율성</h3>
            <span class="efficiency-tag ${wasteRate > 30 ? 'bad' : 'good'}">
              소진율 ${consumeRate}%
            </span>
          </div>
          <div class="custom-progress-bar">
            <div class="progress-segment consumed" style="width: ${consumeRate}%;" title="알뜰 소진 ${consumeRate}%"></div>
            <div class="progress-segment expired" style="width: ${wasteRate}%;" title="기한 초과 폐기 ${wasteRate}%"></div>
          </div>
          <div class="progress-legend">
            <span class="legend-item"><span class="dot dot-green"></span> 알뜰 소진 (${consumedCount}개)</span>
            <span class="legend-item"><span class="dot dot-red"></span> 유통기한 초과 폐기 (${expiredDeleted}개)</span>
          </div>
        </div>

        <!-- 보관 위치별 분포 차트 -->
        <div class="stats-card">
          <h3>보관 위치별 현황</h3>
          <div class="distribution-list">
            ${LOCATIONS.map(loc => {
              const count = locationCounts[loc.id] || 0;
              const pct = currentStoredCount > 0 ? Math.round((count / currentStoredCount) * 100) : 0;
              return `
                <div class="dist-row">
                  <div class="dist-label">
                    <span>${loc.icon}</span> ${loc.label}
                  </div>
                  <div class="dist-bar-wrapper">
                    <div class="dist-bar" style="width: ${pct}%"></div>
                  </div>
                  <div class="dist-values">
                    <strong>${count}개</strong>
                    <span class="text-muted">(${pct}%)</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 카테고리별 보관 현황 -->
        <div class="stats-card">
          <h3>카테고리별 보관 품목</h3>
          <div class="category-stats-grid">
            ${CATEGORIES.map(cat => {
              const count = categoryCounts[cat.id] || 0;
              return `
                <div class="category-stat-card" style="border-left-color: ${cat.color}">
                  <span class="cat-stat-icon">${cat.icon}</span>
                  <div class="cat-stat-info">
                    <span class="cat-stat-name">${cat.label}</span>
                    <strong class="cat-stat-count">${count}개</strong>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 6. 설정 화면 (Settings View) 렌더링
   */
  renderSettings() {
    const settings = StorageService.getSettings();
    const isNotifSupported = NotificationService.isBrowserSupported();
    const notifPermission = NotificationService.getPermissionStatus();

    return `
      <div class="view-container animate-fade">
        <div class="view-header">
          <h2>설정</h2>
          <p class="text-muted">알림 및 데이터 백업을 관리하세요</p>
        </div>

        <!-- 알림 설정 (요구사항 3단계) -->
        <div class="settings-card">
          <div class="settings-card-title">
            <span>🔔</span>
            <h3>유통기한 알림 설정</h3>
          </div>

          <div class="settings-item">
            <div class="settings-item-text">
              <strong>브라우저 푸시 알림</strong>
              <p class="text-muted">
                ${isNotifSupported 
                  ? (notifPermission === 'granted' ? '현재 알림 권한이 허용되어 있습니다.' : '유통기한 도래 시 브라우저 알림을 받습니다.')
                  : '현재 브라우저에서는 시스템 푸시 알림을 지원하지 않아 인앱 알림으로 동작합니다.'
                }
              </p>
            </div>
            <div class="settings-item-ctrl">
              <button class="btn btn-sm ${settings.browserNotificationsEnabled ? 'btn-primary' : 'btn-secondary'}" id="toggle-browser-notif-btn">
                ${settings.browserNotificationsEnabled ? '알림 켜짐' : '알림 활성화'}
              </button>
            </div>
          </div>

          <div class="settings-info-box">
            <h4>기본 알림 발송 기준</h4>
            <ul class="notif-rule-list">
              <li>📅 <strong>유통기한 7일 전</strong>: 일주일 전 사전 확인 알림</li>
              <li>📢 <strong>유통기한 3일 전</strong>: 식단 계획 알림</li>
              <li>⏰ <strong>유통기한 1일 전</strong>: 내일 만료 임박 알림</li>
              <li>🚨 <strong>유통기한 당일</strong>: 오늘 만료 긴급 알림</li>
              <li>⚠️ <strong>유통기한 초과</strong>: 유통기한 지난 식품 폐기/정리 알림</li>
            </ul>
          </div>
        </div>

        <!-- 테스트 및 체험 기능 -->
        <div class="settings-card">
          <div class="settings-card-title">
            <span>🧪</span>
            <h3>체험 및 테스트용 데이터</h3>
          </div>
          <p class="text-muted mb-3">
            실제 가정에서 자주 쓰이는 우유, 계란, 찌개용 두부, 삼겹살, 만두 등 유통기한 상태별(지남, 당일, 임박, 여유) 샘플 데이터를 채워 넣고 테스트해 볼 수 있습니다.
          </p>
          <button class="btn btn-secondary w-full" id="load-sample-data-btn">
            🍱 샘플 식재료 12종 채워넣기
          </button>
        </div>

        <!-- 데이터 백업 및 복원 -->
        <div class="settings-card">
          <div class="settings-card-title">
            <span>💾</span>
            <h3>데이터 백업 & 복원</h3>
          </div>
          <p class="text-muted mb-3">
            모든 식품 및 통계 데이터는 브라우저 LocalStorage에 안전하게 저장됩니다. 다른 기기로 옮기거나 백업할 수 있습니다.
          </p>
          <div class="button-group-row">
            <button class="btn btn-secondary flex-1" id="export-json-btn">
              📥 JSON 데이터 내보내기
            </button>
            <label class="btn btn-secondary flex-1 text-center" style="cursor: pointer; margin-bottom: 0;">
              📤 JSON 불러오기
              <input type="file" id="import-json-input" accept=".json" style="display: none;" />
            </label>
          </div>
        </div>

        <!-- 위험 구역: 초기화 -->
        <div class="settings-card danger-zone">
          <div class="settings-card-title">
            <span>⚠️</span>
            <h3 class="text-danger">데이터 초기화</h3>
          </div>
          <p class="text-muted mb-3">
            등록된 모든 식품과 통계 기록이 영구적으로 삭제됩니다.
          </p>
          <button class="btn btn-danger-subtle w-full" id="clear-all-data-btn">
            🗑️ 모든 데이터 초기화
          </button>
        </div>

        <div class="app-info-footer">
          <p><strong>FreshKeeper</strong> - 유통기한 관리 웹앱</p>
          <p class="text-muted">버전 1.0.0 | 모바일 퍼스트 반응형</p>
        </div>
      </div>
    `;
  },

  /**
   * 알림 센터 모달 내용 렌더링
   */
  renderNotificationModal(notifications) {
    if (!notifications || notifications.length === 0) {
      return `
        <div class="notif-modal-empty">
          <div class="empty-icon">🔔</div>
          <p>새로운 유통기한 알림이 없습니다.</p>
        </div>
      `;
    }

    return `
      <div class="notif-modal-list">
        ${notifications.map(n => `
          <div class="notif-item notif-${n.urgency}" data-food-id="${n.foodId}">
            <div class="notif-item-header">
              <strong class="notif-title">${n.title}</strong>
              <span class="notif-time">${n.time}</span>
            </div>
            <p class="notif-body">${n.body}</p>
            <div class="notif-meta">
              <span>${n.location}</span> • <span>${n.dDay}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};


// --- app.js ---
/**
 * app.js - FreshKeeper 애플리케이션 진입점 및 컨트롤러
 */


class FreshKeeperApp {
  constructor() {
    this.currentTab = 'home';
    this.listState = {
      query: '',
      filter: 'ALL',
      sort: 'EXPIRY_ASC'
    };
    this.editingFoodId = null;
    this.pendingDeleteFoodId = null;
    this.currentPhotoBase64 = null;

    // DOM 캐싱
    this.mainEl = document.getElementById('app-main');
    this.bottomNavEl = document.getElementById('app-bottom-nav');
    this.notifBellBtn = document.getElementById('notif-bell-btn');
    this.notifBellBadge = document.getElementById('notif-bell-badge');
    this.navUrgentBadge = document.getElementById('nav-urgent-badge');

    // 모달 DOM
    this.notifModalOverlay = document.getElementById('notif-modal-overlay');
    this.notifModalContent = document.getElementById('notif-modal-content');
    this.notifModalCloseBtn = document.getElementById('notif-modal-close-btn');
    this.notifMarkReadBtn = document.getElementById('notif-mark-read-btn');

    this.deleteModalOverlay = document.getElementById('delete-modal-overlay');
    this.deleteModalItemName = document.getElementById('delete-modal-item-name');
    this.deleteModalCloseBtn = document.getElementById('delete-modal-close-btn');
    this.deleteCancelBtn = document.getElementById('delete-cancel-btn');
    this.deleteAsConsumedBtn = document.getElementById('delete-as-consumed-btn');
    this.deleteAsExpiredBtn = document.getElementById('delete-as-expired-btn');

    this.toastContainer = document.getElementById('toast-container');
  }

  /**
   * 앱 초기화
   */
  init() {
    this.bindGlobalEvents();
    this.checkInitialData();

    // URL 해시 기반 라우팅 지원 (예: #list, #urgent, #stats)
    const initialHash = window.location.hash.replace('#', '');
    const validTabs = ['home', 'list', 'add', 'urgent', 'stats', 'settings'];
    if (validTabs.includes(initialHash)) {
      this.currentTab = initialHash;
    }

    this.updateNotificationStatus();
    this.renderCurrentTab();

    // 시작 시 알림 체크 및 토스트 안내
    const foods = StorageService.getFoods();
    const urgentItems = foods.filter(f => FoodService.calculateDaysDiff(f.expiryDate) <= 0);
    if (urgentItems.length > 0) {
      setTimeout(() => {
        this.showToast(`🚨 유통기한 당일/초과 식품이 ${urgentItems.length}개 있습니다!`);
      }, 600);
    }
  }

  /**
   * 초기 데이터가 없을 때 사용자 편의를 위한 기본 샘플 자동 세팅
   */
  checkInitialData() {
    const foods = StorageService.getFoods();
    const stats = StorageService.getStats();
    // 처음 실행 시 사용자가 바로 앱의 기능을 체감할 수 있도록 샘플 데이터 로드
    if (foods.length === 0 && stats.totalRegistered === 0) {
      const samples = getSampleFoods();
      StorageService.addFoodsBulk(samples);
      console.log('초기 체험용 샘플 데이터 12종이 로드되었습니다.');
    }
  }

  /**
   * 전역 이벤트 바인딩
   */
  bindGlobalEvents() {
    // 1. 하단 내비게이션 탭 전환
    this.bottomNavEl.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (!navItem) return;
      const tab = navItem.dataset.tab;
      if (tab) {
        if (tab === 'add') {
          this.editingFoodId = null; // 신규 추가 모드로 리셋
          this.currentPhotoBase64 = null;
        }
        this.switchTab(tab);
      }
    });

    // 2. 상단 로고 클릭 시 홈으로 이동
    const logoBtn = document.getElementById('header-logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', () => this.switchTab('home'));
    }

    // 3. 알림 벨 클릭 시 알림 센터 모달 열기
    this.notifBellBtn.addEventListener('click', () => {
      this.openNotificationModal();
    });

    this.notifModalCloseBtn.addEventListener('click', () => {
      this.closeNotificationModal();
    });

    this.notifMarkReadBtn.addEventListener('click', () => {
      NotificationService.markAllAsRead();
      this.updateNotificationStatus();
      this.closeNotificationModal();
      this.showToast('모든 알림을 확인했습니다.');
    });

    // 4. 삭제 모달 이벤트
    this.deleteModalCloseBtn.addEventListener('click', () => this.closeDeleteModal());
    this.deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal());

    this.deleteAsConsumedBtn.addEventListener('click', () => {
      if (this.pendingDeleteFoodId) {
        StorageService.deleteFood(this.pendingDeleteFoodId, false);
        this.showToast('😋 맛있게 식사 완료! 알뜰 소진으로 기록되었습니다.');
        this.onFoodDataChanged();
      }
      this.closeDeleteModal();
    });

    this.deleteAsExpiredBtn.addEventListener('click', () => {
      if (this.pendingDeleteFoodId) {
        StorageService.deleteFood(this.pendingDeleteFoodId, true);
        this.showToast('🗑️ 유통기한 초과로 폐기 기록되었습니다.');
        this.onFoodDataChanged();
      }
      this.closeDeleteModal();
    });

    // 5. 브라우저 뒤로가기/앞으로가기 및 URL 해시 변경 감지
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['home', 'list', 'add', 'urgent', 'stats', 'settings'];
      if (validTabs.includes(hash) && hash !== this.currentTab) {
        this.switchTab(hash, false);
      }
    });

    // 모달 오버레이 바깥 클릭 시 닫기
    window.addEventListener('click', (e) => {
      if (e.target === this.notifModalOverlay) this.closeNotificationModal();
      if (e.target === this.deleteModalOverlay) this.closeDeleteModal();
    });
  }

  /**
   * 탭 전환
   */
  switchTab(tabName, updateHash = true) {
    this.currentTab = tabName;
    if (updateHash && window.location.hash.replace('#', '') !== tabName) {
      window.location.hash = tabName;
    }

    // 하단 탭 버튼 활성화 스타일 갱신
    const navItems = this.bottomNavEl.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.dataset.tab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 화면 렌더링
    this.renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * 현재 탭에 맞춰 메인 화면 렌더링
   */
  renderCurrentTab() {
    const foods = StorageService.getFoods();

    switch (this.currentTab) {
      case 'home':
        this.mainEl.innerHTML = Views.renderHome(foods);
        this.bindHomeEvents();
        break;

      case 'list':
        this.mainEl.innerHTML = Views.renderList(foods, this.listState);
        this.bindListEvents();
        break;

      case 'add':
        const editFood = this.editingFoodId ? StorageService.getFoodById(this.editingFoodId) : null;
        this.currentPhotoBase64 = editFood ? editFood.photo : null;
        this.mainEl.innerHTML = Views.renderForm(editFood);
        this.bindFormEvents();
        break;

      case 'urgent':
        this.mainEl.innerHTML = Views.renderUrgent(foods);
        this.bindCardActionEvents();
        break;

      case 'stats':
        this.mainEl.innerHTML = Views.renderStats(foods);
        break;

      case 'settings':
        this.mainEl.innerHTML = Views.renderSettings();
        this.bindSettingsEvents();
        break;

      default:
        this.mainEl.innerHTML = Views.renderHome(foods);
        this.bindHomeEvents();
    }

    this.updateNotificationStatus();
  }

  /**
   * 알림 상태 및 배지 갱신
   */
  updateNotificationStatus() {
    const foods = StorageService.getFoods();
    const notifications = NotificationService.checkAndNotify(foods);

    // 알림 벨 배지
    if (NotificationService.unreadCount > 0) {
      this.notifBellBadge.textContent = NotificationService.unreadCount;
      this.notifBellBadge.classList.remove('hidden');
    } else {
      this.notifBellBadge.classList.add('hidden');
    }

    // 하단 '임박 식품' 탭 배지 (<= 7일 이내 및 만료 개수)
    const metrics = FoodService.calculateDashboardMetrics(foods);
    if (metrics.urgentItems.length > 0) {
      this.navUrgentBadge.textContent = metrics.urgentItems.length;
      this.navUrgentBadge.classList.remove('hidden');
    } else {
      this.navUrgentBadge.classList.add('hidden');
    }
  }

  /**
   * 식품 데이터 변경 후 호출 (저장, 수정, 삭제)
   */
  onFoodDataChanged() {
    this.updateNotificationStatus();
    this.renderCurrentTab();
  }

  // ===================================================================
  // 각 탭별 이벤트 바인딩
  // ===================================================================

  /**
   * 홈 화면 이벤트 바인딩
   */
  bindHomeEvents() {
    // 1. CTA 등록 버튼
    const ctaBtn = document.getElementById('home-add-btn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        this.editingFoodId = null;
        this.switchTab('add');
      });
    }

    const emptyAddBtn = document.getElementById('empty-add-btn');
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => {
        this.editingFoodId = null;
        this.switchTab('add');
      });
    }

    // 2. 전체보기 링크
    const viewAllBtn = document.getElementById('home-view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.listState.filter = 'ALL';
        this.switchTab('list');
      });
    }

    // 3. 대시보드 지표 카드 클릭 시 해당 필터로 목록 이동
    const statCards = this.mainEl.querySelectorAll('.dashboard-card');
    statCards.forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.dataset.filter;
        if (filter) {
          this.listState.filter = filter;
          this.switchTab('list');
        }
      });
    });

    // 4. 보관 장소 칩 클릭 시 해당 위치 필터로 목록 이동
    const locChips = this.mainEl.querySelectorAll('.location-stat-chip');
    locChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        if (filter) {
          this.listState.filter = filter;
          this.switchTab('list');
        }
      });
    });

    // 5. 상단 임박 아이템 클릭 시 바로 수정/상세 모드로 이동
    const urgentItems = this.mainEl.querySelectorAll('.urgent-quick-item');
    urgentItems.forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (id) {
          this.editingFoodId = id;
          this.switchTab('add');
        }
      });
    });

    // 6. 카드 내부 수정/삭제 버튼
    this.bindCardActionEvents();
  }

  /**
   * 목록 화면 이벤트 바인딩
   */
  bindListEvents() {
    // 1. 검색어 입력 (실시간 필터링)
    const searchInput = document.getElementById('food-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.listState.query = e.target.value;
        const foods = StorageService.getFoods();
        const cardsGrid = this.mainEl.querySelector('.food-cards-grid');
        const countSpan = this.mainEl.querySelector('.results-count strong');

        const filtered = FoodService.filterAndSort(foods, this.listState);
        if (countSpan) countSpan.textContent = filtered.length;

        if (cardsGrid) {
          if (filtered.length > 0) {
            cardsGrid.innerHTML = filtered.map(f => Views.renderFoodCard(f)).join('');
            this.bindCardActionEvents();
          } else {
            cardsGrid.parentElement.innerHTML = `
              <div class="empty-state">
                <div class="empty-icon">🔎</div>
                <h4>검색 결과가 없습니다</h4>
                <p>'${e.target.value}'에 일치하는 식품을 찾을 수 없습니다.</p>
              </div>
            `;
          }
        }
      });
    }

    // 검색어 지우기 버튼
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.listState.query = '';
        this.renderCurrentTab();
      });
    }

    // 2. 필터 칩 클릭
    const filterChips = this.mainEl.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.listState.filter = chip.dataset.filter;
        this.renderCurrentTab();
      });
    });

    // 3. 정렬 셀렉트 변경
    const sortSelect = document.getElementById('food-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.listState.sort = e.target.value;
        this.renderCurrentTab();
      });
    }

    // 필터 초기화 버튼
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.listState = { query: '', filter: 'ALL', sort: 'EXPIRY_ASC' };
        this.renderCurrentTab();
      });
    }

    // 4. 카드 액션 이벤트
    this.bindCardActionEvents();
  }

  /**
   * 식품 카드 내부 액션 (수정, 삭제) 이벤트 바인딩
   */
  bindCardActionEvents() {
    // 수정 버튼
    const editBtns = this.mainEl.querySelectorAll('.edit-food-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this.editingFoodId = id;
        this.switchTab('add');
      });
    });

    // 삭제 버튼
    const deleteBtns = this.mainEl.querySelectorAll('.delete-food-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const name = btn.dataset.name || '식품';
        this.openDeleteModal(id, name);
      });
    });
  }

  /**
   * 등록 / 수정 폼 이벤트 바인딩
   */
  bindFormEvents() {
    const form = document.getElementById('food-form');
    if (!form) return;

    // 수량 조절 버튼 (+ / -)
    const qtyInput = document.getElementById('food-quantity');
    const minusBtn = document.getElementById('qty-minus');
    const plusBtn = document.getElementById('qty-plus');

    if (qtyInput && minusBtn && plusBtn) {
      minusBtn.addEventListener('click', () => {
        const val = parseInt(qtyInput.value, 10) || 1;
        if (val > 1) qtyInput.value = val - 1;
      });
      plusBtn.addEventListener('click', () => {
        const val = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = val + 1;
      });
    }

    // 유통기한 빠른 프리셋 버튼
    const presetBtns = this.mainEl.querySelectorAll('.preset-date-btn');
    const expiryInput = document.getElementById('food-expiry');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days, 10) || 0;
        const target = new Date();
        target.setDate(target.getDate() + days);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        expiryInput.value = `${yyyy}-${mm}-${dd}`;
      });
    });

    // 사진 파일 선택 및 캔버스 자동 압축
    const fileInput = document.getElementById('photo-file-input');
    const selectPhotoBtn = document.getElementById('photo-select-btn');
    const removePhotoBtn = document.getElementById('photo-remove-btn');
    const previewBox = document.getElementById('photo-preview-box');

    if (selectPhotoBtn && fileInput) {
      selectPhotoBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const compressedBase64 = await this.compressImage(file, 300, 300, 0.8);
          this.currentPhotoBase64 = compressedBase64;
          previewBox.innerHTML = `<img src="${compressedBase64}" alt="미리보기" id="photo-preview-img" />`;
          previewBox.classList.add('has-image');
          if (removePhotoBtn) removePhotoBtn.classList.remove('hidden');
          this.showToast('📷 사진이 성공적으로 등록되었습니다.');
        } catch (err) {
          console.error('이미지 압축 오류:', err);
          this.showToast('이미지 처리 중 오류가 발생했습니다.');
        }
      });
    }

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        this.currentPhotoBase64 = null;
        if (fileInput) fileInput.value = '';
        previewBox.innerHTML = `<div class="photo-placeholder"><span class="photo-icon">📷</span><span>사진 등록</span></div>`;
        previewBox.classList.remove('has-image');
        removePhotoBtn.classList.add('hidden');
      });
    }

    // 취소 버튼
    const cancelBtn = document.getElementById('form-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editingFoodId = null;
        this.currentPhotoBase64 = null;
        this.switchTab('list');
      });
    }

    // 폼 제출
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const name = (formData.get('name') || '').trim();
      const category = formData.get('category') || '기타';
      const quantity = parseInt(formData.get('quantity'), 10) || 1;
      const unit = formData.get('unit') || '개';
      const location = formData.get('location') || '냉장고';
      const expiryDate = formData.get('expiryDate');
      const memo = (formData.get('memo') || '').trim();

      if (!name) {
        this.showToast('식품 이름을 입력해 주세요.');
        return;
      }
      if (!expiryDate) {
        this.showToast('유통기한을 선택해 주세요.');
        return;
      }

      const foodPayload = {
        name,
        category,
        quantity,
        unit,
        location,
        expiryDate,
        photo: this.currentPhotoBase64,
        memo
      };

      if (this.editingFoodId) {
        // 수정 모드
        StorageService.updateFood(this.editingFoodId, foodPayload);
        this.showToast(`✨ '${name}' 식품 정보가 수정되었습니다.`);
        this.editingFoodId = null;
      } else {
        // 신규 등록 모드
        StorageService.addFood(foodPayload);
        this.showToast(`🎉 '${name}'이(가) 등록되었습니다.`);
      }

      this.currentPhotoBase64 = null;
      this.onFoodDataChanged();
      this.switchTab('list');
    });
  }

  /**
   * 설정 화면 이벤트 바인딩
   */
  bindSettingsEvents() {
    // 1. 브라우저 알림 권한 토글
    const notifToggleBtn = document.getElementById('toggle-browser-notif-btn');
    if (notifToggleBtn) {
      notifToggleBtn.addEventListener('click', async () => {
        const granted = await NotificationService.requestPermission();
        if (granted) {
          this.showToast('🔔 브라우저 알림이 활성화되었습니다.');
        } else {
          this.showToast('브라우저 알림이 차단되었거나 지원되지 않습니다. 인앱 알림으로 동작합니다.');
        }
        this.renderCurrentTab();
      });
    }

    // 2. 샘플 데이터 불러오기
    const sampleBtn = document.getElementById('load-sample-data-btn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        const samples = getSampleFoods();
        StorageService.addFoodsBulk(samples);
        this.showToast('🍱 샘플 식재료 12종이 성공적으로 추가되었습니다!');
        this.onFoodDataChanged();
        this.switchTab('home');
      });
    }

    // 3. JSON 데이터 내보내기
    const exportBtn = document.getElementById('export-json-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = StorageService.exportData();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `freshkeeper_backup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('📥 데이터 백업 파일이 다운로드되었습니다.');
      });
    }

    // 4. JSON 데이터 불러오기
    const importInput = document.getElementById('import-json-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            const success = StorageService.importData(parsed);
            if (success) {
              this.showToast('📤 데이터가 성공적으로 복원되었습니다.');
              this.onFoodDataChanged();
              this.switchTab('home');
            } else {
              this.showToast('올바른 백업 파일 형식이 아닙니다.');
            }
          } catch (err) {
            console.error('JSON 파싱 실패:', err);
            this.showToast('파일 읽기에 실패했습니다.');
          }
        };
        reader.readAsText(file);
      });
    }

    // 5. 전체 데이터 초기화
    const clearBtn = document.getElementById('clear-all-data-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('정말로 모든 식품과 통계 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
          StorageService.clearAll();
          this.showToast('🗑️ 모든 데이터가 초기화되었습니다.');
          this.onFoodDataChanged();
          this.switchTab('home');
        }
      });
    }
  }

  // ===================================================================
  // 모달 제어 및 유틸리티
  // ===================================================================

  /**
   * 알림 센터 모달 열기
   */
  openNotificationModal() {
    const notifs = NotificationService.getNotifications();
    this.notifModalContent.innerHTML = Views.renderNotificationModal(notifs);

    // 알림 항목 클릭 시 해당 식품 수정/상세로 이동
    const notifItems = this.notifModalContent.querySelectorAll('.notif-item');
    notifItems.forEach(item => {
      item.addEventListener('click', () => {
        const foodId = item.dataset.foodId;
        if (foodId) {
          this.closeNotificationModal();
          this.editingFoodId = foodId;
          this.switchTab('add');
        }
      });
    });

    this.notifModalOverlay.classList.add('active');
  }

  /**
   * 알림 센터 모달 닫기
   */
  closeNotificationModal() {
    this.notifModalOverlay.classList.remove('active');
  }

  /**
   * 삭제 사유 선택 모달 열기
   */
  openDeleteModal(id, foodName) {
    this.pendingDeleteFoodId = id;
    this.deleteModalItemName.innerHTML = `<strong>'${foodName}'</strong>을(를) 어떻게 처리하셨나요?`;
    this.deleteModalOverlay.classList.add('active');
  }

  /**
   * 삭제 사유 선택 모달 닫기
   */
  closeDeleteModal() {
    this.pendingDeleteFoodId = null;
    this.deleteModalOverlay.classList.remove('active');
  }

  /**
   * 이미지 자동 압축 리사이징 (Canvas 기반)
   * LocalStorage 용량(5~10MB) 초과 방지
   */
  compressImage(file, maxWidth = 300, maxHeight = 300, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 토스트 메시지 출력
   */
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  }
}

// 애플리케이션 시작 (readyState 확인으로 즉시 실행 보장)
function bootstrapFreshKeeper() {
  const app = new FreshKeeperApp();
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapFreshKeeper);
} else {
  bootstrapFreshKeeper();
}



})();
