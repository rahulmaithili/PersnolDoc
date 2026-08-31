// API Wrapper
async function apiRequest(action, params = {}, method = 'GET') {
  try {
    let url = CONFIG.API_URL;
    let options = { method };

    if (method === 'GET') {
      const searchParams = new URLSearchParams();
      searchParams.append('action', action);
      if (getToken()) searchParams.append('token', getToken());
      
      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          searchParams.append(key, params[key]);
        }
      }
      url += '?' + searchParams.toString();
    } else {
      options.body = JSON.stringify({
        action,
        token: getToken(),
        ...params
      });
      // options.headers = { 'Content-Type': 'application/json' };
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      if (data.message === 'Invalid or expired session' || data.message === 'Authentication required') {
        clearToken();
        clearUser();
        showToast('error', 'Session Expired', 'Please login again.');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
        return data;
      }
      showToast('error', 'Error', data.message || 'An error occurred');
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    showToast('error', 'Network Error', 'Failed to connect to the server.');
    return { success: false, message: error.message };
  }
}

// SweetAlert2 wrappers
function showToast(icon, title, message = '') {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: icon,
      title: title,
      text: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  } else {
    alert(`${title}: ${message}`);
  }
}

function showLoading(message = 'Loading...') {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }
}

function hideLoading() {
  if (typeof Swal !== 'undefined') {
    Swal.close();
  }
}

// Token and User Management
function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
}

function getUser() {
  const user = localStorage.getItem(CONFIG.USER_KEY);
  return user ? JSON.parse(user) : null;
}

function setUser(user) {
  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(CONFIG.USER_KEY);
}

// Utilities
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function getCategoryBadgeClass(category) {
  const mapping = {
    'College': 'badge-college',
    'High School': 'badge-high-school',
    'Intermediate': 'badge-high-school',
    'Land Records': 'badge-land-records',
    'Certificates': 'badge-certificates',
    'Others': 'badge-others'
  };
  return mapping[category] || 'badge-others';
}

function initTooltips() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, { trigger: 'hover' });
  });
}

// Theme & Palette Management
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CONFIG.THEME_KEY, theme);
  updateThemeUI();
}

function setPalette(palette) {
  document.documentElement.setAttribute('data-palette', palette);
  localStorage.setItem('dv_palette', palette);
  updatePaletteUI();
}

function toggleTheme() {
  const currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

function toggleDarkMode() {
  toggleTheme();
}

function initTheme() {
  // Load Theme (Light/Dark)
  const savedTheme = localStorage.getItem(CONFIG.THEME_KEY);
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }

  // Load Palette
  const savedPalette = localStorage.getItem('dv_palette') || 'graphite-cyan';
  setPalette(savedPalette);
  
  // Render Palette Grid if panel exists
  renderPaletteSelector();
}

function updateThemeUI() {
  const theme = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
  
  // Update header/nav icons if they exist
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  const darkModeIcon = document.getElementById('darkModeIcon');
  if (darkModeIcon) {
    darkModeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  const darkModeSwitch = document.getElementById('darkModeSwitch');
  if (darkModeSwitch) {
    darkModeSwitch.checked = (theme === 'dark');
  }
}

function updatePaletteUI() {
  const activePalette = localStorage.getItem('dv_palette') || 'graphite-cyan';
  document.querySelectorAll('.palette-card').forEach(card => {
    if (card.getAttribute('data-palette-name') === activePalette) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

// 15 Theme Palettes definitions
const PALETTES = [
  { name: 'enterprise-navy', label: 'Enterprise Navy', sidebar: '#0f2044', primary: '#4a90d9' },
  { name: 'graphite-cyan', label: 'Graphite & Cyan', sidebar: '#1e2139', primary: '#00bcd4' },
  { name: 'forest-executive', label: 'Forest Executive', sidebar: '#1a2e1a', primary: '#4caf50' },
  { name: 'walnut-sand', label: 'Walnut & Sand', sidebar: '#2d1f14', primary: '#bc8f58' },
  { name: 'emerald-corporate', label: 'Emerald Corporate', sidebar: '#0d2418', primary: '#009688' },
  { name: 'mocha-executive', label: 'Mocha Executive', sidebar: '#2c1810', primary: '#d2691e' },
  { name: 'charcoal-gold', label: 'Charcoal & Gold', sidebar: '#1c1c1c', primary: '#ffc107' },
  { name: 'zinc-sky', label: 'Zinc & Sky', sidebar: '#2c3444', primary: '#03a9f4' },
  { name: 'ink-violet', label: 'Ink & Violet', sidebar: '#1a0a2e', primary: '#9c27b0' },
  { name: 'slate-rose', label: 'Slate & Rose', sidebar: '#1e2030', primary: '#e91e63' },
  { name: 'stone-amber', label: 'Stone & Amber', sidebar: '#28211a', primary: '#ff9800' },
  { name: 'mineral-teal', label: 'Mineral Teal', sidebar: '#102020', primary: '#00796b' },
  { name: 'paper-copper', label: 'Paper & Copper', sidebar: '#3d2010', primary: '#bf5700' },
  { name: 'obsidian-mint', label: 'Obsidian & Mint', sidebar: '#080c10', primary: '#00bfa5' },
  { name: 'cloud-indigo', label: 'Cloud & Indigo', sidebar: '#1a1a3e', primary: '#3f51b5' }
];

function renderPaletteSelector() {
  const grid = document.getElementById('paletteGrid');
  if (!grid) return;

  const activePalette = localStorage.getItem('dv_palette') || 'graphite-cyan';

  grid.innerHTML = PALETTES.map(p => `
    <div class="palette-card ${p.name === activePalette ? 'active' : ''}" 
         data-palette-name="${p.name}" 
         onclick="setPalette('${p.name}')" 
         title="${p.label}">
      <div class="palette-preview">
        <div class="palette-sidebar" style="background: ${p.sidebar}"></div>
        <div class="palette-content">
          <div class="palette-bar" style="background: ${p.primary}; width: 60%;"></div>
          <div class="palette-bar" style="background: var(--text-secondary); width: 40%; opacity: 0.5;"></div>
        </div>
      </div>
      <div class="palette-name">${p.label}</div>
    </div>
  `).join('');
}

// Global functions to open/close theme panel
window.openThemePanel = function() {
  const panel = document.getElementById('themePanel');
  const overlay = document.getElementById('themePanelOverlay');
  if (panel && overlay) {
    renderPaletteSelector();
    panel.classList.add('open');
    overlay.classList.add('active');
  }
};

window.closeThemePanel = function() {
  const panel = document.getElementById('themePanel');
  const overlay = document.getElementById('themePanelOverlay');
  if (panel && overlay) {
    panel.classList.remove('open');
    overlay.classList.remove('active');
  }
};

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || sidebar.dataset.initialized === 'true') return;
  sidebar.dataset.initialized = 'true';

  const overlay = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const closeBtn = document.getElementById('sidebarCloseBtn');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const collapseIcon = document.getElementById('collapseIcon');

  // Toggle mobile drawer
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      if (overlay) overlay.classList.toggle('active');
    });
  }

  // Close mobile drawer
  const closeMobile = () => {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeMobile);
  if (overlay) overlay.addEventListener('click', closeMobile);

  // Desktop sidebar collapse
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
      
      // Update icon
      if (collapseIcon) {
        collapseIcon.className = isCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
      }
    });
  }

  // Restore desktop sidebar state on load
  const isCollapsedSaved = localStorage.getItem('sidebar_collapsed') === 'true';
  if (isCollapsedSaved) {
    document.body.classList.add('sidebar-collapsed');
    if (collapseIcon) {
      collapseIcon.className = 'fa-solid fa-chevron-right';
    }
  }

  // Set active link highlight based on current pathname and category query params
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  const favParam = urlParams.get('favorite');

  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const linkUrl = new URL(href, window.location.origin);
    const linkPath = linkUrl.pathname.split('/').pop();
    const linkParams = linkUrl.searchParams;

    let isActive = false;
    if (linkPath === currentPath) {
      if (linkParams.has('category')) {
        isActive = linkParams.get('category') === catParam;
      } else if (linkParams.has('favorite')) {
        isActive = favParam === 'true';
      } else {
        // No specific filter in link, highlight only if current page has no specific category/fav filter
        isActive = !catParam && !favParam;
      }
    }

    if (isActive) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Set active mobile bottom nav item
  const mobDashboard = document.getElementById('mNavDashboard');
  const mobDocuments = document.getElementById('mNavDocuments');
  const mobProfile = document.getElementById('mNavProfile');

  if (mobDashboard) mobDashboard.classList.remove('active');
  if (mobDocuments) mobDocuments.classList.remove('active');
  if (mobProfile) mobProfile.classList.remove('active');

  if (currentPath === 'dashboard.html' && mobDashboard) mobDashboard.classList.add('active');
  if (currentPath === 'documents.html' && mobDocuments) mobDocuments.classList.add('active');
  if (currentPath === 'profile.html' && mobProfile) mobProfile.classList.add('active');
}


