// Supabase Client Initialization
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient && window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    try {
      supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
    } catch (e) {
      console.error('Supabase initialization error:', e);
    }
  }
  return supabaseClient;
}

// Unified API Wrapper (Supabase Database + Google Drive File Storage)
async function apiRequest(action, params = {}, method = 'GET') {
  try {
    const sb = getSupabase();

    // 1. Google Drive File Storage: Always handled by Google Apps Script backend
    if (action === 'uploadFile') {
      const uploadUrl = CONFIG.DRIVE_UPLOAD_URL || CONFIG.API_URL;
      const user = getUser();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'uploadFile',
          base64Data: params.base64Data,
          mimeType: params.mimeType,
          fileName: params.fileName,
          userId: (user && user.id) || 'default_user'
        })
      });
      return await response.json();
    }

    if (action === 'deleteFile' && params.fileId) {
      const uploadUrl = CONFIG.DRIVE_UPLOAD_URL || CONFIG.API_URL;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteFile',
          fileId: params.fileId
        })
      });
      return await response.json();
    }

    // 2. Supabase Database Operations
    if (sb) {
      switch (action) {
        case 'login': {
          const { data, error } = await sb.auth.signInWithPassword({
            email: params.email,
            password: params.password
          });
          if (error) {
            // If user doesn't exist, try auto sign up
            if (error.message && (error.message.includes('Invalid login') || error.message.includes('not found') || error.status === 400)) {
              const { data: suData, error: suErr } = await sb.auth.signUp({
                email: params.email,
                password: params.password,
                options: { data: { name: params.email.split('@')[0] } }
              });
              if (!suErr && suData && suData.user) {
                if (suData.session) {
                  const user = {
                    id: suData.user.id,
                    email: suData.user.email,
                    name: suData.user.user_metadata?.name || suData.user.email.split('@')[0],
                    profile_photo: suData.user.user_metadata?.profile_photo || suData.user.user_metadata?.avatar_url || '',
                    role: 'admin'
                  };
                  setToken(suData.session.access_token);
                  setUser(user);
                  return { success: true, data: { token: suData.session.access_token, user } };
                } else {
                  return {
                    success: false,
                    message: 'Account created! Please check your email to verify, or turn OFF "Confirm email" in Supabase Dashboard.'
                  };
                }
              }
            }
            return { success: false, message: error.message };
          }
          const user = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email.split('@')[0],
            profile_photo: data.user.user_metadata?.profile_photo || data.user.user_metadata?.avatar_url || '',
            role: data.user.role || 'admin'
          };
          setToken(data.session.access_token);
          setUser(user);
          return { success: true, data: { token: data.session.access_token, user } };
        }

        case 'logout': {
          try { await sb.auth.signOut(); } catch (e) {}
          clearToken();
          clearUser();
          return { success: true, message: 'Logged out' };
        }

        case 'getProfile': {
          try {
            const { data: { user } } = await sb.auth.getUser();
            if (user) {
              const localUser = getUser() || {};
              const photo = user.user_metadata?.profile_photo || user.user_metadata?.avatar_url || localUser.profile_photo || '';
              return {
                success: true,
                data: {
                  id: user.id,
                  email: user.email,
                  name: user.user_metadata?.name || user.email.split('@')[0],
                  profile_photo: photo,
                  role: user.role || 'Admin',
                  created_at: user.created_at
                }
              };
            }
          } catch (e) {
            console.warn('Supabase getProfile error:', e);
          }
          const localUser = getUser() || {};
          return { success: true, data: localUser };
        }

        case 'updateProfile': {
          const nameVal = params.name !== undefined ? params.name : (params.data && params.data.name);
          const photoVal = params.profile_photo !== undefined ? params.profile_photo : (params.data && params.data.profile_photo);
          const updateData = {};
          if (nameVal !== undefined) updateData.name = nameVal;
          if (photoVal !== undefined) updateData.profile_photo = photoVal;
          
          try {
            await sb.auth.updateUser({ data: updateData });
          } catch (e) {
            console.warn('Supabase updateUser error:', e);
          }
          
          const cur = getUser() || {};
          if (nameVal !== undefined) cur.name = nameVal;
          if (photoVal !== undefined) cur.profile_photo = photoVal;
          setUser(cur);
          return { success: true, message: 'Profile updated', data: cur };
        }

        case 'changePassword': {
          const { error } = await sb.auth.updateUser({ password: params.newPassword });
          if (error) return { success: false, message: error.message };
          return { success: true, message: 'Password updated successfully' };
        }

        case 'getDocuments': {
          let query = sb.from('documents').select('*', { count: 'exact' });
          if (params.category) query = query.eq('category', params.category);
          if (params.favorite === true || params.favorite === 'true') query = query.eq('favorite', true);

          const page = parseInt(params.page || 1);
          const pageSize = parseInt(params.pageSize || 20);
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;

          query = query.order('created_at', { ascending: false }).range(from, to);
          const { data, count, error } = await query;
          if (error) throw error;
          return {
            success: true,
            data: {
              documents: data || [],
              total: count !== null ? count : (data ? data.length : 0),
              page,
              pageSize
            }
          };
        }

        case 'getDocument': {
          const { data, error } = await sb.from('documents').select('*').eq('id', params.docId).single();
          if (error) throw error;
          return { success: true, data };
        }

        case 'addDocument': {
          const docData = { ...params.data };
          const user = getUser();
          if (user && user.id) docData.user_id = user.id;
          docData.created_at = new Date().toISOString();
          docData.updated_at = new Date().toISOString();
          const { data, error } = await sb.from('documents').insert([docData]).select().single();
          if (error) throw error;
          return { success: true, message: 'Document added successfully', data };
        }

        case 'updateDocument': {
          const docData = { ...params.data };
          delete docData.id;
          docData.updated_at = new Date().toISOString();
          const { data, error } = await sb.from('documents').update(docData).eq('id', params.docId).select().single();
          if (error) throw error;
          return { success: true, message: 'Document updated successfully', data };
        }

        case 'deleteDocument': {
          if (params.deleteDriveFile && params.driveFileId) {
            try {
              const uploadUrl = CONFIG.DRIVE_UPLOAD_URL || CONFIG.API_URL;
              await fetch(uploadUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'deleteFile', fileId: params.driveFileId })
              });
            } catch (e) {
              console.warn('Drive file deletion failed:', e);
            }
          }
          const { error } = await sb.from('documents').delete().eq('id', params.docId);
          if (error) throw error;
          return { success: true, message: 'Document deleted successfully' };
        }

        case 'toggleFavorite': {
          const { data: cur, error: fetchErr } = await sb.from('documents').select('favorite').eq('id', params.docId).single();
          if (fetchErr) throw fetchErr;
          const nextFav = !(cur && cur.favorite);
          const { error: updErr } = await sb.from('documents').update({ favorite: nextFav }).eq('id', params.docId);
          if (updErr) throw updErr;
          return { success: true, data: { favorite: nextFav } };
        }

        case 'searchDocuments': {
          const q = `%${params.query}%`;
          const { data, error } = await sb.from('documents')
            .select('*')
            .or(`title.ilike.${q},document_number.ilike.${q},institution_name.ilike.${q},tags.ilike.${q},description.ilike.${q}`)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return { success: true, data: { documents: data || [] } };
        }

        case 'filterDocuments': {
          let q = sb.from('documents').select('*');
          const f = params.filters || {};
          if (f.category) q = q.eq('category', f.category);
          if (f.sub_category) q = q.ilike('sub_category', `%${f.sub_category}%`);
          if (f.semester) q = q.eq('semester', f.semester);
          if (f.month) q = q.eq('month', f.month);
          if (f.year) q = q.eq('year', f.year);
          if (f.favorite) q = q.eq('favorite', true);
          if (f.date_from) q = q.gte('created_at', f.date_from);
          if (f.date_to) q = q.lte('created_at', f.date_to + 'T23:59:59.999Z');
          const isAsc = f.sort === 'oldest';
          q = q.order('created_at', { ascending: isAsc });
          const { data, error } = await q;
          if (error) throw error;
          return { success: true, data: { documents: data || [] } };
        }

        case 'getCategories': {
          const { data, error } = await sb.from('categories').select('*').order('name');
          if (!error && data && data.length > 0) {
            return { success: true, data };
          }
          return { success: true, data: CONFIG.CATEGORIES.map(c => ({ name: c, icon: 'fa-folder' })) };
        }

        case 'addCategory': {
          const { data, error } = await sb.from('categories').insert([{ name: params.name, icon: params.icon || 'fa-folder' }]).select().single();
          if (error) throw error;
          return { success: true, data };
        }
      }
    }

    // Fallback to Google Apps Script endpoint if Supabase is unavailable
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
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    showToast('error', 'Error', error.message || 'Failed to complete request.');
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

  // Toggle mobile drawer or desktop sidebar
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth < 992) {
        sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('active');
      } else {
        document.body.classList.toggle('sidebar-collapsed');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
        if (collapseIcon) {
          collapseIcon.className = isCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
        }
      }
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


