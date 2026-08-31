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

// Theme Management
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CONFIG.THEME_KEY, theme);
}

function toggleTheme() {
  const currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

function initTheme() {
  const savedTheme = localStorage.getItem(CONFIG.THEME_KEY);
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    // Check OS preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }
}
