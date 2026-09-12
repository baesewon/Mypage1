/**
 * app.js - FreshKeeper 애플리케이션 진입점 및 컨트롤러
 */

import { StorageService } from './storage.js';
import { FoodService } from './foodService.js';
import { NotificationService } from './notificationService.js';
import { Views } from './views.js';
import { getSampleFoods } from './sampleData.js';

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
