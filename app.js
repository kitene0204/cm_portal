// app.js - Gemini WebApp Hub Application Logic

// ==========================================================================
// 1. State Management & Initial Mock Data
// ==========================================================================

const LOCAL_STORAGE_KEY = 'gemini_webapp_hub_state';
const KVDB_BUCKET_URL = 'https://kvdb.io/NLaSVGy1qZviT2sPLomUpd/portal_data';

let state = {
  pageTitle: '창민의 웹앱 허브',
  layout: 'grid', // 'grid', 'list', 'compact'
  theme: 'theme-glass-dark', // 'theme-glass-dark', 'theme-emerald-school', 'theme-sunset-violet', 'theme-minimal-light'
  apps: []
};

// Canvas Helper: Create a premium gradient image for apps that don't have custom thumbnails
function generateGradientThumbnail(title, category) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  // Gradient Colors based on category
  let grad;
  if (category === 'personal') {
    grad = ctx.createLinearGradient(0, 0, 400, 200);
    grad.addColorStop(0, '#ec4899'); // pink-500
    grad.addColorStop(1, '#8b5cf6'); // violet-500
  } else {
    // School category
    grad = ctx.createLinearGradient(0, 0, 400, 200);
    grad.addColorStop(0, '#10b981'); // emerald-500
    grad.addColorStop(1, '#0284c7'); // sky-600
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 200);

  // Decorative Shapes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(320, 100, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(80, 150, 110, 0, Math.PI * 2);
  ctx.fill();

  // Draw Logo Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Outfit, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Extract up to 2 characters for logo icon
  const letters = title ? title.trim().substring(0, 2) : 'WA';
  ctx.fillText(letters, 200, 100);

  // Subtle border highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 400, 200);

  return canvas.toDataURL('image/png');
}

function loadState() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      state = JSON.parse(saved);
      // Ensure key elements exist in state
      if (!state.apps) state.apps = [];
      if (!state.pageTitle) state.pageTitle = '창민의 웹앱 허브';
      if (!state.layout) state.layout = 'grid';
      if (!state.theme) state.theme = 'theme-glass-dark';
    } catch (e) {
      console.error("Failed to load local storage state, using defaults.", e);
      loadDefaults();
    }
  } else {
    loadDefaults();
  }
}

function loadDefaults() {
  state.pageTitle = '창민의 웹앱 허브';
  state.layout = 'grid';
  state.theme = 'theme-glass-dark';
  
  // Default mock apps
  state.apps = [
    {
      id: '1',
      title: '일일 플래너 & 시간 관리자',
      url: 'https://canvas.gemini.google.com/planner-mock',
      category: 'personal',
      thumbnail: '',
      order: 1
    },
    {
      id: '2',
      title: '나만의 프라이빗 독서 클럽',
      url: 'https://canvas.gemini.google.com/reading-mock',
      category: 'personal',
      thumbnail: '',
      order: 2
    },
    {
      id: '3',
      title: '수학 실력 향상 워크시트',
      url: 'https://canvas.gemini.google.com/math-mock',
      category: 'school',
      thumbnail: '',
      order: 1
    },
    {
      id: '4',
      title: '초중등 필수 영단어 퀴즈 메이커',
      url: 'https://canvas.gemini.google.com/english-mock',
      category: 'school',
      thumbnail: '',
      order: 2
    },
    {
      id: '5',
      title: '자동 슬라이드(PPT) 생성기',
      url: 'https://canvas.gemini.google.com/slide-generator-placeholder',
      category: 'school',
      thumbnail: '',
      order: 3
    }
  ];

  // Auto generate gradients for defaults
  state.apps.forEach(app => {
    app.thumbnail = generateGradientThumbnail(app.title, app.category);
  });
  
  saveState();
}

// ==========================================================================
// Cloud Sync & Toast Notification Helpers
// ==========================================================================

let toastTimeout;
function showToast(message, type = 'success') {
  if (!toastNotification || !toastMessage || !toastIcon) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  
  toastMessage.innerText = message;
  toastNotification.classList.remove('hidden');
  
  if (type === 'error') {
    toastIcon.setAttribute('data-lucide', 'alert-circle');
  } else {
    toastIcon.setAttribute('data-lucide', 'cloud');
  }
  initIcons();
  
  toastTimeout = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 2500);
}

async function syncToCloud() {
  if (!syncStatusEl || !syncIndicatorEl || !syncTextEl) return;
  
  syncIndicatorEl.className = 'status-indicator syncing';
  syncTextEl.innerText = '동기화 중...';
  
  try {
    const response = await fetch(KVDB_BUCKET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(state)
    });
    
    if (response.ok) {
      syncIndicatorEl.className = 'status-indicator success';
      syncTextEl.innerText = '동기화 완료';
      showToast('클라우드 동기화 완료!');
    } else {
      throw new Error('Cloud response not OK');
    }
  } catch (error) {
    console.error("Cloud Sync write failed:", error);
    syncIndicatorEl.className = 'status-indicator error';
    syncTextEl.innerText = '동기화 실패 (로컬 저장)';
    showToast('클라우드 동기화 실패 (로컬 저장됨)', 'error');
  }
}

async function loadFromCloud() {
  if (!syncStatusEl || !syncIndicatorEl || !syncTextEl) return;
  
  syncIndicatorEl.className = 'status-indicator syncing';
  syncTextEl.innerText = '동기화 로드 중...';
  
  try {
    const response = await fetch(KVDB_BUCKET_URL);
    if (response.ok) {
      const cloudState = await response.json();
      
      if (cloudState && cloudState.apps) {
        state = cloudState;
        // Cache to local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        
        // Re-render UI
        renderUI();
        
        syncIndicatorEl.className = 'status-indicator success';
        syncTextEl.innerText = '동기화 완료';
        showToast('클라우드 데이터 연동 성공!');
      }
    } else if (response.status === 404) {
      console.log("Cloud store empty. Initializing with local state...");
      await syncToCloud();
    } else {
      throw new Error('Cloud response status: ' + response.status);
    }
  } catch (error) {
    console.error("Cloud Sync load failed:", error);
    syncIndicatorEl.className = 'status-indicator error';
    syncTextEl.innerText = '오프라인 (로컬 데이터)';
    showToast('클라우드 데이터 로드 실패 (로컬 로드)', 'error');
  }
}

function saveState() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  syncToCloud();
}

// ==========================================================================
// 2. DOM Selection & Navigation State
// ==========================================================================

let currentTab = 'personal'; // 'personal' or 'school'
let currentManageTab = 'personal';

// Cache elements
const appTitleEl = document.getElementById('app-title');
const webappsContainer = document.getElementById('webapps-container');
const emptyStateEl = document.getElementById('empty-state');
const settingsModal = document.getElementById('settings-modal');

// Cloud Sync & Toast Elements
const syncStatusEl = document.getElementById('sync-status');
const syncIndicatorEl = syncStatusEl?.querySelector('.status-indicator');
const syncTextEl = syncStatusEl?.querySelector('.status-text');
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');

// Settings Form Fields
const inputPageTitle = document.getElementById('input-page-title');
const editAppId = document.getElementById('edit-app-id');
const appNameInput = document.getElementById('app-name');
const appUrlInput = document.getElementById('app-url');
const appThumbnailFile = document.getElementById('app-thumbnail-file');
const appThumbnailData = document.getElementById('app-thumbnail-data');
const thumbnailPreviewBox = document.getElementById('thumbnail-preview-box');
const formActionTitle = document.getElementById('form-action-title');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnSaveApp = document.getElementById('btn-save-app');
const manageAppListEl = document.getElementById('manage-app-list');

// Initialize Lucide icons on render
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ==========================================================================
// 3. UI Rendering
// ==========================================================================

function applyThemeAndLayout() {
  // Theme
  document.body.className = state.theme;
  
  // Layout class on container
  webappsContainer.className = `layout-${state.layout}`;
  
  // Apply changes back to settings control values (radios)
  const themeRadios = document.getElementsByName('theme-choice');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === state.theme;
  });

  const layoutRadios = document.getElementsByName('layout-choice');
  layoutRadios.forEach(radio => {
    radio.checked = radio.value === state.layout;
  });
}

function renderUI() {
  // Title
  appTitleEl.innerText = state.pageTitle;
  inputPageTitle.value = state.pageTitle;
  
  applyThemeAndLayout();
  renderApps();
}

function renderApps() {
  // Filter apps by current tab & sort by order
  const filteredApps = state.apps
    .filter(app => app.category === currentTab)
    .sort((a, b) => a.order - b.order);

  webappsContainer.innerHTML = '';

  if (filteredApps.length === 0) {
    webappsContainer.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    return;
  }

  webappsContainer.classList.remove('hidden');
  emptyStateEl.classList.add('hidden');

  filteredApps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'webapp-card';
    card.setAttribute('data-id', app.id);
    
    // Check if thumbnail is base64 or empty
    const thumbSrc = app.thumbnail || generateGradientThumbnail(app.title, app.category);
    
    card.innerHTML = `
      <div class="card-thumb-area">
        <img class="card-thumb" src="${thumbSrc}" alt="${app.title}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-category">${app.category === 'personal' ? '창민 개인' : '학교 교육'}</div>
        <h3 class="card-title">${escapeHTML(app.title)}</h3>
        ${state.layout === 'list' ? `<div class="card-url">${escapeHTML(app.url)}</div>` : ''}
        <div class="card-actions">
          <button class="btn btn-primary btn-go">
            <span>바로가기</span>
            <i data-lucide="external-link"></i>
          </button>
        </div>
      </div>
    `;

    // Handle clicks to navigate to target URL
    card.addEventListener('click', (e) => {
      // Don't trigger navigation if clicking other interactive sub-elements if any
      window.open(app.url, '_blank');
    });

    webappsContainer.appendChild(card);
  });

  initIcons();
}

// Render WebApp list inside Settings Panel 4 (Ordering & Editing)
function renderManageList() {
  const filteredApps = state.apps
    .filter(app => app.category === currentManageTab)
    .sort((a, b) => a.order - b.order);

  manageAppListEl.innerHTML = '';

  if (filteredApps.length === 0) {
    manageAppListEl.innerHTML = '<li class="manage-app-item" style="justify-content: center;color: var(--text-secondary);">등록된 앱이 없습니다.</li>';
    return;
  }

  filteredApps.forEach((app, index) => {
    const li = document.createElement('li');
    li.className = 'manage-app-item';
    
    const thumbSrc = app.thumbnail || generateGradientThumbnail(app.title, app.category);

    li.innerHTML = `
      <div class="item-title-area">
        <img class="item-thumb" src="${thumbSrc}" alt="thumb">
        <div>
          <div class="item-name">${escapeHTML(app.title)}</div>
          <div class="item-url">${escapeHTML(app.url)}</div>
        </div>
      </div>
      
      <div class="order-controls">
        <button class="icon-control-btn btn-move-up" data-id="${app.id}" title="위로" ${index === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
          <i data-lucide="chevron-up"></i>
        </button>
        <button class="icon-control-btn btn-move-down" data-id="${app.id}" title="아래로" ${index === filteredApps.length - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
          <i data-lucide="chevron-down"></i>
        </button>
      </div>

      <div class="action-buttons">
        <button class="icon-control-btn btn-edit" data-id="${app.id}" title="수정">
          <i data-lucide="edit"></i>
        </button>
        <button class="icon-control-btn btn-delete" data-id="${app.id}" title="삭제">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    // Bind Event Listeners
    li.querySelector('.btn-move-up')?.addEventListener('click', (e) => {
      e.stopPropagation();
      moveAppOrder(app.id, -1);
    });

    li.querySelector('.btn-move-down')?.addEventListener('click', (e) => {
      e.stopPropagation();
      moveAppOrder(app.id, 1);
    });

    li.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      loadAppIntoForm(app.id);
    });

    li.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteApp(app.id);
    });

    manageAppListEl.appendChild(li);
  });

  initIcons();
}

// Helper to escape HTML characters
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================================================
// 4. Modal Tab & Section Handlers
// ==========================================================================

function setupModalTabs() {
  const sidebarButtons = document.querySelectorAll('.sidebar-tab');
  const panels = document.querySelectorAll('.modal-panel');

  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all tabs
      sidebarButtons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Active selected
      btn.classList.add('active');
      const targetSectionId = btn.getAttribute('data-section');
      document.getElementById(targetSectionId).classList.add('active');
    });
  });

  // Inner management tabs (Personal / School list in ordering panel)
  const manageTabs = document.querySelectorAll('.manage-tab-btn');
  manageTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      manageTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentManageTab = tab.getAttribute('data-manage-tab');
      renderManageList();
    });
  });
}

function openSettingsModal(targetSection = 'sec-general') {
  settingsModal.classList.remove('hidden');
  
  // Set target section active
  const sidebarButtons = document.querySelectorAll('.sidebar-tab');
  const panels = document.querySelectorAll('.modal-panel');
  
  sidebarButtons.forEach(b => {
    if (b.getAttribute('data-section') === targetSection) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  panels.forEach(p => {
    if (p.id === targetSection) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  renderManageList();
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
  resetForm();
}

// ==========================================================================
// 5. App Data Mutations (Add, Edit, Delete, Reorder)
// ==========================================================================

// Handle App Form submission (Add / Edit)
function handleFormSubmit() {
  const id = editAppId.value;
  const name = appNameInput.value.trim();
  const url = appUrlInput.value.trim();
  const category = document.querySelector('input[name="app-category"]:checked').value;
  let thumbnail = appThumbnailData.value;

  if (!name || !url) return;

  // If no custom thumbnail was uploaded, create a gradient
  if (!thumbnail) {
    thumbnail = generateGradientThumbnail(name, category);
  }

  if (id) {
    // Edit Mode
    const appIndex = state.apps.findIndex(app => app.id === id);
    if (appIndex !== -1) {
      const prevCategory = state.apps[appIndex].category;
      
      // Update data
      state.apps[appIndex].title = name;
      state.apps[appIndex].url = url;
      state.apps[appIndex].thumbnail = thumbnail;
      
      // If category changed, assign new order at end of that category
      if (prevCategory !== category) {
        state.apps[appIndex].category = category;
        state.apps[appIndex].order = getNextOrder(category);
      }
    }
  } else {
    // Add Mode
    const nextOrder = getNextOrder(category);
    const newApp = {
      id: Date.now().toString(),
      title: name,
      url: url,
      category: category,
      thumbnail: thumbnail,
      order: nextOrder
    };
    state.apps.push(newApp);
  }

  saveState();
  resetForm();
  renderUI();
  
  // Switch to list view panel in settings to verify changes
  openSettingsModal('sec-list');
}

function getNextOrder(category) {
  const categoryApps = state.apps.filter(app => app.category === category);
  if (categoryApps.length === 0) return 1;
  const maxOrder = Math.max(...categoryApps.map(app => app.order));
  return maxOrder + 1;
}

function loadAppIntoForm(id) {
  const app = state.apps.find(a => a.id === id);
  if (!app) return;

  // Set values to form
  editAppId.value = app.id;
  appNameInput.value = app.title;
  appUrlInput.value = app.url;
  
  // Category Radio
  const catRadios = document.getElementsByName('app-category');
  catRadios.forEach(radio => {
    radio.checked = radio.value === app.category;
  });

  // Thumbnail Preview
  appThumbnailData.value = app.thumbnail;
  if (app.thumbnail) {
    thumbnailPreviewBox.innerHTML = `<img src="${app.thumbnail}" alt="Preview">`;
  } else {
    thumbnailPreviewBox.innerHTML = `<i data-lucide="image"></i><span>미리보기 없음</span>`;
    initIcons();
  }

  // Change action titles and buttons
  formActionTitle.innerText = "웹앱 정보 수정";
  btnCancelEdit.classList.remove('hidden');
  
  // Move to form panel
  openSettingsModal('sec-manage');
}

function deleteApp(id) {
  const app = state.apps.find(a => a.id === id);
  if (!app) return;

  if (confirm(`'${app.title}' 웹앱을 삭제하시겠습니까?`)) {
    // Filter out app
    state.apps = state.apps.filter(a => a.id !== id);
    
    // Re-index order within same category to keep contiguous
    reindexCategoryOrders(app.category);
    
    saveState();
    renderUI();
    renderManageList();
  }
}

function reindexCategoryOrders(category) {
  const categoryApps = state.apps
    .filter(app => app.category === category)
    .sort((a, b) => a.order - b.order);
  
  categoryApps.forEach((app, index) => {
    app.order = index + 1;
  });
}

function moveAppOrder(id, direction) {
  const app = state.apps.find(a => a.id === id);
  if (!app) return;

  const category = app.category;
  const categoryApps = state.apps
    .filter(a => a.category === category)
    .sort((a, b) => a.order - b.order);

  const currentIndex = categoryApps.findIndex(a => a.id === id);
  const targetIndex = currentIndex + direction;

  // Out of bounds safety checks
  if (targetIndex < 0 || targetIndex >= categoryApps.length) return;

  // Swap orders
  const tempOrder = categoryApps[currentIndex].order;
  categoryApps[currentIndex].order = categoryApps[targetIndex].order;
  categoryApps[targetIndex].order = tempOrder;

  saveState();
  renderUI();
  renderManageList();
}

function resetForm() {
  editAppId.value = '';
  appNameInput.value = '';
  appUrlInput.value = '';
  appThumbnailFile.value = '';
  appThumbnailData.value = '';
  thumbnailPreviewBox.innerHTML = `<i data-lucide="image"></i><span>미리보기 없음</span>`;
  
  formActionTitle.innerText = "새로운 웹앱 추가";
  btnCancelEdit.classList.add('hidden');
  
  // Default to personal category radio
  document.querySelector('input[name="app-category"][value="personal"]').checked = true;
  initIcons();
}

// ==========================================================================
// 6. Event Binding & Initialization
// ==========================================================================

function bindEvents() {
  // Open / Close Settings Modal
  document.getElementById('btn-settings').addEventListener('click', () => openSettingsModal('sec-general'));
  document.getElementById('btn-close-settings').addEventListener('click', closeSettingsModal);
  
  // Also close modal when clicking overlay background outside container
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  // Empty State Add Button
  document.getElementById('btn-empty-add').addEventListener('click', () => {
    // Open setting modal directly on webapp management tab
    openSettingsModal('sec-manage');
  });

  // Tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');
      renderApps();
    });
  });

  // Settings Panel 1: Save Page Title
  document.getElementById('btn-save-general').addEventListener('click', () => {
    const titleVal = inputPageTitle.value.trim();
    if (titleVal) {
      state.pageTitle = titleVal;
      saveState();
      renderUI();
      closeSettingsModal();
    }
  });

  // Settings Panel 2: Theme choices
  const themeChoices = document.getElementsByName('theme-choice');
  themeChoices.forEach(choice => {
    choice.addEventListener('change', (e) => {
      state.theme = e.target.value;
      saveState();
      applyThemeAndLayout();
    });
  });

  // Settings Panel 2: Layout choices
  const layoutChoices = document.getElementsByName('layout-choice');
  layoutChoices.forEach(choice => {
    choice.addEventListener('change', (e) => {
      state.layout = e.target.value;
      saveState();
      applyThemeAndLayout();
    });
  });

  // Settings Panel 3: Thumbnail upload controls
  const btnTriggerUpload = document.getElementById('btn-trigger-upload');
  btnTriggerUpload.addEventListener('click', () => {
    appThumbnailFile.click();
  });

  appThumbnailFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: LocalStorage limit is ~5MB total. Compress/warn if huge, recommend under 300KB
    if (file.size > 500 * 1024) {
      alert("이미지 크기가 큽니다. 브라우저 저장 한도로 인해 500KB 이하의 이미지를 업로드하는 것이 권장됩니다.");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      appThumbnailData.value = dataUrl;
      thumbnailPreviewBox.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  });

  // Reset/Use default gradient button inside form
  document.getElementById('btn-use-placeholder').addEventListener('click', () => {
    appThumbnailData.value = '';
    appThumbnailFile.value = '';
    thumbnailPreviewBox.innerHTML = `<i data-lucide="image"></i><span>미리보기 없음</span>`;
    initIcons();
  });

  // Form submit
  document.getElementById('webapp-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit();
  });

  // Form edit cancel
  btnCancelEdit.addEventListener('click', () => {
    resetForm();
    openSettingsModal('sec-list');
  });

  // Handle ESC key to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsModal.classList.contains('hidden')) {
      closeSettingsModal();
    }
  });
}

// Entrypoint
async function init() {
  // 1. Load from local cache immediately for fast initial rendering
  loadState();
  bindEvents();
  setupModalTabs();
  renderUI();
  
  // 2. Fetch latest data from cloud asynchronously
  await loadFromCloud();
}

window.addEventListener('DOMContentLoaded', init);
