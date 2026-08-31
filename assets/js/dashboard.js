// Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('dashboard.html')) {
    checkAuth();
    initTheme();
    initTooltips();
    initUserAvatar();
    initSidebar();
    
    // Bind dark mode toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }
    
    // Bind logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
    
    loadDashboardStats();
    loadRecentDocuments();
  }
});

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => {
      document.body.classList.remove('sidebar-collapsed');
    });
  }
  
  // Set active nav item
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href && currentPath.includes(href)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

async function loadDashboardStats() {
  try {
    const response = await apiRequest('getDocuments', { pageSize: 1000 }, 'GET');
    
    if (response.success && (response.data || response.documents)) {
      const docs = (response.data && response.data.documents) ? response.data.documents : (response.documents || []);
      
      let counts = {
        total: docs.length,
        college: 0,
        school: 0,
        land: 0,
        certs: 0,
        favs: 0,
        month: 0
      };
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      docs.forEach(doc => {
        // Category counts
        if (doc.category === 'College') counts.college++;
        else if (doc.category === 'High School' || doc.category === 'Intermediate') counts.school++;
        else if (doc.category === 'Land Records') counts.land++;
        else if (doc.category === 'Certificates') counts.certs++;
        
        // Fav counts
        if (doc.favorite) counts.favs++;
        
        // Month counts
        if (doc.created_at) {
          const d = new Date(doc.created_at);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            counts.month++;
          }
        }
      });
      
      // Update DOM with animation
      countUp(document.getElementById('stat-total'), counts.total, 1000);
      countUp(document.getElementById('stat-college'), counts.college, 1000);
      countUp(document.getElementById('stat-school'), counts.school, 1000);
      countUp(document.getElementById('stat-land'), counts.land, 1000);
      countUp(document.getElementById('stat-certs'), counts.certs, 1000);
      countUp(document.getElementById('stat-favs'), counts.favs, 1000);
      countUp(document.getElementById('stat-month'), counts.month, 1000);
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

async function loadRecentDocuments() {
  const tbody = document.getElementById('recentDocsTableBody');
  if (!tbody) return;
  
  // Show skeleton
  tbody.innerHTML = Array(5).fill(`
    <tr class="skeleton-row">
      <td><div class="skeleton skeleton-text" style="width: 80%"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 60%"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 50%"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 100%"></div></td>
    </tr>
  `).join('');
  
  try {
    const response = await apiRequest('getDocuments', { page: 1, pageSize: 5 }, 'GET');
    
    if (response.success && (response.data || response.documents)) {
      const docs = (response.data && response.data.documents) ? response.data.documents : (response.documents || []);
      
      if (docs.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center">
              <div class="empty-state">
                <i class="fas fa-folder-open empty-icon"></i>
                <p>No documents found.</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = docs.map(doc => `
        <tr>
          <td>
            <strong>${doc.title || 'Untitled'}</strong>
          </td>
          <td>
            <span class="badge ${getCategoryBadgeClass(doc.category)}">${doc.category}</span>
          </td>
          <td>${formatDate(doc.created_at)}</td>
          <td>
            <button class="action-btn" title="View" onclick="openViewModal('${doc.id}')">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `).join('');
      
    }
  } catch (err) {
    console.error('Failed to load recent docs', err);
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load documents</td></tr>`;
  }
}

function countUp(element, target, duration) {
  if (!element) return;
  let start = 0;
  const increment = target / (duration / 16); // 60fps
  
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.innerText = target;
      clearInterval(timer);
    } else {
      element.innerText = Math.floor(start);
    }
  }, 16);
}

// Global modal and action functions for dashboard view
window.openViewModal = async function(docId) {
  showLoading('Loading document details...');
  const response = await apiRequest('getDocument', { docId }, 'GET');
  hideLoading();
  
  if (response.success && response.data) {
    const doc = response.data;
    
    // Populate modal fields
    const titleEl = document.getElementById('viewModalTitle');
    const catEl = document.getElementById('viewModalCategory');
    const dateEl = document.getElementById('viewModalDate');
    const descEl = document.getElementById('viewModalDesc');
    if (titleEl) titleEl.textContent = doc.title || 'Untitled';
    if (catEl) catEl.innerHTML = `<span class="badge ${getCategoryBadgeClass(doc.category)}">${doc.category || ''}</span>`;
    if (dateEl) dateEl.textContent = formatDate(doc.created_at);
    if (descEl) descEl.textContent = doc.description || 'No description provided.';
    
    const iframe = document.getElementById('viewModalIframe');
    if (iframe) {
      if (doc.drive_file_id) {
        iframe.src = `https://drive.google.com/file/d/${doc.drive_file_id}/preview`;
        iframe.style.display = 'block';
      } else if (doc.document_url) {
        iframe.src = doc.document_url;
        iframe.style.display = 'block';
      } else {
        iframe.style.display = 'none';
      }
    }
    
    // Show modal via Bootstrap API
    const modalEl = document.getElementById('viewDocModal') || document.getElementById('viewModal');
    if (modalEl) {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  } else {
    showToast('error', 'Error', response.message || 'Failed to load document details.');
  }
};

window.closeViewModal = function() {
  const modal = document.getElementById('viewModal');
  if(modal) {
    modal.classList.remove('show');
    // Clear iframe src to stop loading/playing
    const iframe = document.getElementById('viewModalIframe');
    if(iframe) iframe.src = '';
  }
};
