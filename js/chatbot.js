/**
 * ============================================================================
 * 🤖 FreshKeeper AI 챗봇 모듈 (js/chatbot.js)
 * ============================================================================
 * 
 * 🔑 [OpenAI API 설정]
 * 1. 코드에서 직접 설정: 아래의 OPENAI_API_KEY 변수에 API 키를 입력하세요.
 * 2. 웹 화면에서 직접 설정: 웹 브라우저 채팅창 상단의 [🔑 API 키 입력창]에 
 *    언제든지 키를 붙여넣고 [적용]을 눌러 즉시 대화할 수 있습니다.
 */
const OPENAI_API_KEY = ""; // 👈 코드 상단 변수 (예: "sk-proj-xxxx...")
const OPENAI_MODEL = "gpt-5-mini"; // 👈 지정된 모델명: gpt-5-mini

(function () {
  'use strict';

  // 로컬 스토리지 키
  const STORAGE_KEY_API_KEY = 'freshkeeper_openai_api_key';
  const STORAGE_KEY_FOODS = 'freshkeeper_foods_v1';

  // 시스템 기본 프롬프트
  const BASE_SYSTEM_PROMPT = `당신은 유통기한 관리 웹앱 'FreshKeeper'의 똑똑하고 친절한 AI 요리 셰프이자 식재료 보관 전문가입니다.
주요 역할:
1. 사용자의 식재료를 활용한 알뜰 요리 레시피 추천 (특히 유통기한이 임박한 식재료 우선 활용)
2. 올바른 식재료 보관 방법(냉장, 냉동, 실온) 및 신선도 유지 꿀팁 안내
3. 유통기한과 소비기한의 차이점 및 안전 섭취 기준 설명
4. 답변은 친절하고 가독성 좋게, 필요시 글머리 기호(• 또는 1, 2, 3)를 활용해 명확하게 작성해주세요.`;

  // 대화 히스토리 (OpenAI API 전달용)
  let conversationHistory = [];

  // DOM 요소 참조
  let floatBtn = null;
  let chatWindow = null;
  let messagesContainer = null;
  let messageInput = null;
  let sendBtn = null;

  // 상단 웹 API 키 바 DOM 참조
  let apikeyBar = null;
  let apikeyStatusIndicator = null;
  let apikeyStatusText = null;
  let apikeyToggleBtn = null;
  let webApikeyInput = null;
  let apikeyEyeBtn = null;
  let apikeySaveBtn = null;
  let apikeyClearBtn = null;

  // 현재 유효한 API 키 가져오기 (코드 상단 변수 우선 -> 로컬스토리지 보조)
  function getEffectiveApiKey() {
    if (typeof OPENAI_API_KEY === 'string' && OPENAI_API_KEY.trim().length > 0) {
      return OPENAI_API_KEY.trim();
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY_API_KEY);
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    } catch (e) {
      console.warn('LocalStorage access error:', e);
    }
    return '';
  }

  // 웹 상단 API 키 상태 UI 동기화 갱신
  function updateApiKeyStatusUI() {
    if (!apikeyStatusIndicator || !apikeyStatusText || !webApikeyInput) return;

    const currentKey = getEffectiveApiKey();

    if (currentKey) {
      apikeyStatusIndicator.className = 'apikey-status connected';
      const masked = currentKey.length > 12 
        ? `${currentKey.slice(0, 7)}...${currentKey.slice(-4)}`
        : '••••••••';
      apikeyStatusText.textContent = `API 키 연결됨 (${masked})`;
      webApikeyInput.value = currentKey;
    } else {
      apikeyStatusIndicator.className = 'apikey-status disconnected';
      apikeyStatusText.textContent = `API 키 미입력 (아래에 직접 붙여넣으세요)`;
      webApikeyInput.value = '';
      if (apikeyBar) {
        apikeyBar.classList.remove('collapsed');
      }
      if (apikeyToggleBtn) {
        apikeyToggleBtn.textContent = '접기 ▲';
      }
    }
  }

  // API 키 바 강조 및 포커스 (키 미입력 시 전송 시도할 때 호출)
  function highlightApiKeyBar() {
    if (!apikeyBar || !webApikeyInput) return;
    apikeyBar.classList.remove('collapsed');
    if (apikeyToggleBtn) apikeyToggleBtn.textContent = '접기 ▲';
    apikeyBar.classList.add('highlight');
    setTimeout(() => {
      apikeyBar.classList.remove('highlight');
    }, 1200);
    webApikeyInput.focus();
  }

  // 현재 냉장고에 등록된 식재료 정보 요약 생성 (Context 주입)
  function getFridgeContext() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FOODS);
      if (!raw) return '';
      const foods = JSON.parse(raw);
      if (!Array.isArray(foods) || foods.length === 0) return '';

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const itemsSummary = foods.slice(0, 20).map(item => {
        let ddayStr = '';
        if (item.expiryDate) {
          const exp = new Date(item.expiryDate);
          exp.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) ddayStr = `(만료 ${Math.abs(diffDays)}일 경과)`;
          else if (diffDays === 0) ddayStr = '(오늘 만료)';
          else ddayStr = `(D-${diffDays})`;
        }
        return `${item.name}${ddayStr}[${item.location || '냉장'}]`;
      });

      return `\n\n[현재 사용자의 보관 식재료 목록]: ${itemsSummary.join(', ')}\n사용자가 요리나 식재료 추천을 요청할 때 위 목록의 재료(특히 만료 임박 식재료)를 우선 활용해주세요.`;
    } catch (err) {
      return '';
    }
  }

  // 시스템 메시지 생성
  function buildSystemMessage() {
    const fridgeInfo = getFridgeContext();
    return {
      role: 'system',
      content: BASE_SYSTEM_PROMPT + fridgeInfo
    };
  }

  // 현재 시간 포맷 (예: 오후 2:30)
  function formatCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${ampm} ${hours}:${minutes}`;
  }

  // 마크다운 형태의 텍스트를 안전한 HTML로 변환 (간이 파서)
  function formatMessageText(text) {
    if (!text) return '';
    
    // HTML 엔티티 이스케이프
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 볼드: **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 인라인 코드: `code`
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 줄바꿈 보존
    return safe;
  }

  // 말풍선 DOM 생성 및 추가
  function appendMessage(role, content, type = 'normal') {
    const row = document.createElement('div');
    row.className = `chat-row ${role}`;

    const timeStr = formatCurrentTime();

    if (role === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'chat-avatar';
      avatar.textContent = '🥑';
      row.appendChild(avatar);
    }

    const bubbleContainer = document.createElement('div');
    bubbleContainer.className = 'chat-bubble-container';

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.innerHTML = formatMessageText(content);

    const timeEl = document.createElement('div');
    timeEl.className = 'chat-time';
    timeEl.textContent = timeStr;

    bubbleContainer.appendChild(bubble);
    bubbleContainer.appendChild(timeEl);
    row.appendChild(bubbleContainer);

    messagesContainer.appendChild(row);
    scrollToBottom();
    return row;
  }

  // 타이핑 인디케이터 표시
  function showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'chat-row bot typing-row';
    row.id = 'chat-typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = '🥑';
    row.appendChild(avatar);

    const bubbleContainer = document.createElement('div');
    bubbleContainer.className = 'chat-bubble-container';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

    bubble.appendChild(dots);
    bubbleContainer.appendChild(bubble);
    row.appendChild(bubbleContainer);

    messagesContainer.appendChild(row);
    scrollToBottom();
  }

  // 타이핑 인디케이터 제거
  function hideTypingIndicator() {
    const el = document.getElementById('chat-typing-indicator');
    if (el) el.remove();
  }

  // 최하단 스크롤
  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }
  }

  // OpenAI API 호출
  async function callOpenAI(userPrompt) {
    const apiKey = getEffectiveApiKey();

    if (!apiKey) {
      hideTypingIndicator();
      highlightApiKeyBar();
      appendMessage('bot', 
        `⚠️ **OpenAI API 키가 필요합니다.**\n\n대화창 상단의 **[🔑 API 키 입력창]**에 본인의 API 키(\`sk-proj-...\`)를 직접 붙여넣으신 후 **[적용]** 버튼을 눌러주세요!`,
        'warning'
      );
      return;
    }

    // 대화 내역에 사용자 발화 추가
    conversationHistory.push({ role: 'user', content: userPrompt });

    // API 요청용 메시지 배열 구성 (시스템 메시지 + 이전 대화 기록)
    const requestMessages = [
      buildSystemMessage(),
      ...conversationHistory
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL, // gpt-5-mini
          messages: requestMessages
        })
      });

      hideTypingIndicator();

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson.error?.message || response.statusText;
        } catch (_) {
          errorDetail = response.statusText;
        }

        if (response.status === 401) {
          highlightApiKeyBar();
          appendMessage('bot', `❌ **API 키 인증 실패 (401)**\n입력된 API 키가 유효하지 않습니다. 상단 입력창에서 올바른 키를 다시 확인해주세요.`, 'error');
        } else if (response.status === 429) {
          appendMessage('bot', `⚠️ **API 요청 한도 초과 (429)**\n계정의 크레딧 잔액이나 사용량 한도를 초과했습니다. OpenAI 대시보드를 확인해주세요.`, 'warning');
        } else {
          appendMessage('bot', `❌ **API 오류 (${response.status})**\n${errorDetail}`, 'error');
        }
        return;
      }

      const data = await response.json();
      const assistantReply = data.choices?.[0]?.message?.content || '(답변 내용이 없습니다)';

      // 대화 히스토리에 AI 답변 기록
      conversationHistory.push({ role: 'assistant', content: assistantReply });

      // 말풍선 렌더링
      appendMessage('bot', assistantReply);

    } catch (err) {
      hideTypingIndicator();
      console.error('OpenAI API 호출 에러:', err);
      appendMessage('bot', `❌ **네트워크 통신 오류**\n서버와 통신하는 중 문제가 발생했습니다. 인터넷 연결이나 방화벽 설정을 확인해주세요.\n(${err.message})`, 'error');
    }
  }

  // 메시지 전송 처리
  async function handleSendMessage(text) {
    const query = (text || messageInput.value || '').trim();
    if (!query) return;

    // 입력 필드 초기화 및 포커스
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    // 사용자 말풍선 표시
    appendMessage('user', query);

    // AI 타이핑 인디케이터 표시
    showTypingIndicator();

    // API 호출
    await callOpenAI(query);

    sendBtn.disabled = false;
    messageInput.focus();
  }

  // 대화 내용 초기화
  function resetConversation() {
    conversationHistory = [];
    messagesContainer.innerHTML = '';
    renderWelcomeMessage();
  }

  // 환영 메시지 렌더링
  function renderWelcomeMessage() {
    const currentKey = getEffectiveApiKey();

    let welcomeText = `안녕하세요! **FreshKeeper AI 셰프**입니다 👨‍🍳\n` +
      `냉장고 속 재료로 만들 수 있는 요리 추천이나, 유통기한·보관 꿀팁 등 궁금한 점을 편하게 물어보세요!`;

    if (!currentKey) {
      welcomeText += `\n\n💡 **안내**: 상단의 **[🔑 API 키 입력창]**에 본인의 OpenAI API 키를 넣고 **[적용]**을 누르시면 바로 답변을 받으실 수 있습니다.`;
    }

    appendMessage('bot', welcomeText);

    // 추천 질문 칩 생성
    const suggestionsWrap = document.createElement('div');
    suggestionsWrap.className = 'chatbot-suggestions';
    suggestionsWrap.innerHTML = `
      <div class="suggestion-title">💡 자주 묻는 추천 질문</div>
      <button class="suggestion-chip" data-query="현재 냉장고에 있는 재료로 만들 수 있는 맛있는 요리 추천해줘!">🍳 냉장고 속 재료로 만들 수 있는 요리 추천해줘</button>
      <button class="suggestion-chip" data-query="유통기한과 소비기한의 차이점이 뭐야? 기한 지나면 바로 버려야 해?">⏱️ 유통기한과 소비기한 차이점이 뭐야?</button>
      <button class="suggestion-chip" data-query="식재료를 냉장/냉동에 오래 신선하게 보관하는 비법 알려줘">🧊 식재료 신선 보관 꿀팁 알려줘</button>
    `;

    suggestionsWrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (chip && chip.dataset.query) {
        handleSendMessage(chip.dataset.query);
      }
    });

    messagesContainer.appendChild(suggestionsWrap);
    scrollToBottom();
  }

  // 챗봇 UI DOM 생성 및 주입
  function createChatbotUI() {
    // 1. 플로팅 버튼 생성
    floatBtn = document.createElement('button');
    floatBtn.className = 'chatbot-float-btn';
    floatBtn.id = 'chatbot-toggle-btn';
    floatBtn.setAttribute('title', 'FreshKeeper AI 챗봇 열기');
    floatBtn.setAttribute('aria-label', 'FreshKeeper AI 챗봇');
    floatBtn.innerHTML = `
      <span class="btn-icon-chat">💬</span>
      <span class="btn-icon-close">✕</span>
      <span class="chatbot-badge" id="chatbot-alert-badge">AI</span>
    `;

    // 2. 대화창 윈도우 생성
    chatWindow = document.createElement('div');
    chatWindow.className = 'chatbot-window';
    chatWindow.id = 'chatbot-window';
    chatWindow.innerHTML = `
      <!-- 헤더 -->
      <div class="chatbot-header">
        <div class="chatbot-header-info">
          <div class="chatbot-header-avatar">🥑</div>
          <div class="chatbot-header-text">
            <span class="chatbot-header-title">FreshKeeper AI 셰프</span>
            <span class="chatbot-header-subtitle">
              <span>스마트 식재료 도우미</span>
              <span class="chatbot-model-badge">${OPENAI_MODEL}</span>
            </span>
          </div>
        </div>
        <div class="chatbot-header-actions">
          <button class="chatbot-header-btn" id="chatbot-btn-key-focus" title="API 키 입력창 포커스" aria-label="API 키">🔑</button>
          <button class="chatbot-header-btn" id="chatbot-btn-reset" title="대화 내용 비우기" aria-label="대화 비우기">🔄</button>
          <button class="chatbot-header-btn" id="chatbot-btn-close" title="채팅창 닫기" aria-label="닫기">✕</button>
        </div>
      </div>

      <!-- 웹상에서 매번 직접 넣을 수 있는 상단 고정 API 키 입력 바 -->
      <div class="chatbot-apikey-bar" id="chatbot-apikey-bar">
        <div class="apikey-bar-top">
          <div class="apikey-status" id="apikey-status-indicator">
            <span class="apikey-status-dot"></span>
            <span class="apikey-status-text" id="apikey-status-text">API 키 확인 중...</span>
          </div>
          <button class="apikey-toggle-btn" id="apikey-toggle-btn" title="입력창 접기/펼치기">접기 ▲</button>
        </div>
        <div class="apikey-input-row" id="apikey-input-row">
          <div class="apikey-input-wrap">
            <span class="apikey-input-icon">🔑</span>
            <input 
              type="password" 
              class="chatbot-web-apikey-input" 
              id="chatbot-web-apikey-input" 
              placeholder="OpenAI API 키를 직접 입력/붙여넣기 (sk-proj-...)" 
              autocomplete="off"
              spellcheck="false"
            />
            <button class="apikey-eye-btn" id="apikey-eye-btn" title="키 표시/숨김">👁️</button>
          </div>
          <button class="chatbot-web-apikey-save" id="chatbot-web-apikey-save" title="입력한 키 즉시 적용">적용</button>
          <button class="chatbot-web-apikey-clear" id="chatbot-web-apikey-clear" title="키 지우기">삭제</button>
        </div>
      </div>

      <!-- 대화 메시지 영역 -->
      <div class="chatbot-messages" id="chatbot-messages"></div>

      <!-- 입력창 -->
      <div class="chatbot-input-container">
        <textarea 
          class="chatbot-textarea" 
          id="chatbot-input-text" 
          placeholder="메시지를 입력하세요... (Enter로 전송)" 
          rows="1"
        ></textarea>
        <button class="chatbot-send-btn" id="chatbot-send-btn" title="전송" aria-label="전송">
          ➔
        </button>
      </div>
    `;

    document.body.appendChild(floatBtn);
    document.body.appendChild(chatWindow);

    // 요소 바인딩
    messagesContainer = document.getElementById('chatbot-messages');
    messageInput = document.getElementById('chatbot-input-text');
    sendBtn = document.getElementById('chatbot-send-btn');

    apikeyBar = document.getElementById('chatbot-apikey-bar');
    apikeyStatusIndicator = document.getElementById('apikey-status-indicator');
    apikeyStatusText = document.getElementById('apikey-status-text');
    apikeyToggleBtn = document.getElementById('apikey-toggle-btn');
    webApikeyInput = document.getElementById('chatbot-web-apikey-input');
    apikeyEyeBtn = document.getElementById('apikey-eye-btn');
    apikeySaveBtn = document.getElementById('chatbot-web-apikey-save');
    apikeyClearBtn = document.getElementById('chatbot-web-apikey-clear');

    // 이벤트 리스너 바인딩
    initEvents();

    // 초기 상태 UI 반영
    updateApiKeyStatusUI();

    // 환영 메시지 로드
    renderWelcomeMessage();
  }

  // 이벤트 핸들러 초기화
  function initEvents() {
    // 1. 플로팅 버튼 토글
    floatBtn.addEventListener('click', toggleChatWindow);

    // 2. 닫기 버튼
    document.getElementById('chatbot-btn-close').addEventListener('click', closeChatWindow);

    // 3. 대화 초기화 버튼
    document.getElementById('chatbot-btn-reset').addEventListener('click', () => {
      if (confirm('대화 내용을 초기화하시겠습니까?')) {
        resetConversation();
      }
    });

    // 4. 헤더 🔑 아이콘 클릭 시 API 키 바 포커스
    document.getElementById('chatbot-btn-key-focus').addEventListener('click', () => {
      highlightApiKeyBar();
    });

    // 5. API 키 접기/펼치기 토글
    apikeyToggleBtn.addEventListener('click', () => {
      apikeyBar.classList.toggle('collapsed');
      const isCollapsed = apikeyBar.classList.contains('collapsed');
      apikeyToggleBtn.textContent = isCollapsed ? '펼치기 ▼' : '접기 ▲';
    });

    // 6. API 키 눈동자(표시/숨김) 토글
    apikeyEyeBtn.addEventListener('click', () => {
      if (webApikeyInput.type === 'password') {
        webApikeyInput.type = 'text';
        apikeyEyeBtn.textContent = '🔒';
      } else {
        webApikeyInput.type = 'password';
        apikeyEyeBtn.textContent = '👁️';
      }
    });

    // 7. 웹 API 키 저장 및 적용
    function saveWebKey() {
      const val = webApikeyInput.value.trim();
      if (val) {
        localStorage.setItem(STORAGE_KEY_API_KEY, val);
        updateApiKeyStatusUI();
        appendMessage('bot', `✅ **API 키가 정상 적용되었습니다!**\n이제 질문을 보내시면 \`${OPENAI_MODEL}\` 모델로부터 실시간 답변을 받아보실 수 있습니다.`, 'normal');
      } else {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
        updateApiKeyStatusUI();
      }
    }

    apikeySaveBtn.addEventListener('click', saveWebKey);

    webApikeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveWebKey();
      }
    });

    // 8. 웹 API 키 삭제
    apikeyClearBtn.addEventListener('click', () => {
      if (confirm('저장된 API 키를 삭제하시겠습니까?')) {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
        webApikeyInput.value = '';
        updateApiKeyStatusUI();
        appendMessage('bot', `🗑️ API 키가 삭제되었습니다. 새로운 키를 입력해주세요.`, 'warning');
      }
    });

    // 9. 메시지 전송 버튼
    sendBtn.addEventListener('click', () => handleSendMessage());

    // 10. 텍스트 입력창 키 입력 (Enter로 전송, Shift+Enter는 줄바꿈)
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // 텍스트 영역 높이 자동 조절
    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
    });
  }

  // 창 열기/닫기 토글
  function toggleChatWindow() {
    const isOpen = chatWindow.classList.contains('is-open');
    if (isOpen) {
      closeChatWindow();
    } else {
      openChatWindow();
    }
  }

  function openChatWindow() {
    chatWindow.classList.add('is-open');
    floatBtn.classList.add('is-open');
    // 알림 배지 숨기기
    const badge = document.getElementById('chatbot-alert-badge');
    if (badge) badge.style.display = 'none';

    updateApiKeyStatusUI();

    const key = getEffectiveApiKey();
    if (!key) {
      highlightApiKeyBar();
    } else {
      messageInput.focus();
    }
    scrollToBottom();
  }

  function closeChatWindow() {
    chatWindow.classList.remove('is-open');
    floatBtn.classList.remove('is-open');
  }

  // DOM 로드 완료 시 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatbotUI);
  } else {
    createChatbotUI();
  }

  // 전역 접근 편의 (디버깅 또는 외부 연동용)
  window.FreshKeeperChatbot = {
    open: openChatWindow,
    close: closeChatWindow,
    sendMessage: handleSendMessage,
    reset: resetConversation,
    setApiKey: (key) => {
      localStorage.setItem(STORAGE_KEY_API_KEY, key);
      updateApiKeyStatusUI();
    }
  };
})();
