/**
 * views.js - UI 컴포넌트 및 화면 렌더링 템플릿
 */

import { CATEGORIES, LOCATIONS, FoodStatus, FoodService } from './foodService.js';
import { StorageService } from './storage.js';
import { NotificationService } from './notificationService.js';

export const Views = {
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
