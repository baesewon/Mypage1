/**
 * foodService.js - 식품 관련 비즈니스 로직, D-day 계산, 정렬 및 필터링
 */

export const CATEGORIES = [
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

export const LOCATIONS = [
  { id: '냉장고', label: '냉장고', icon: '❄️' },
  { id: '냉동실', label: '냉동실', icon: '🧊' },
  { id: '실온', label: '실온', icon: '🌡️' },
  { id: '기타', label: '기타', icon: '📦' }
];

export const FoodStatus = {
  EXPIRED: 'EXPIRED',       // 유통기한 지남 (diff < 0)
  TODAY: 'TODAY',           // 오늘 만료 (diff === 0)
  CRITICAL: 'CRITICAL',     // 임박 (1 <= diff <= 3)
  WARNING: 'WARNING',       // 주의 (4 <= diff <= 7)
  SAFE: 'SAFE'              // 안전 (diff > 7)
};

export const FoodService = {
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
