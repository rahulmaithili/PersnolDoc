// Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('stat-total')) {
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
        month: 0,
        others: 0
      };
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      docs.forEach(doc => {
        // Category counts
        if (doc.category === 'College') counts.college++;
        else if (doc.category === 'High School' || doc.category === 'Intermediate') counts.school++;
        else if (doc.category === 'Land Records') counts.land++;
        else if (doc.category === 'Certificates') counts.certs++;
        else if (doc.category === 'Others') counts.others++;
        else counts.others++; // Fallback
        
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
      countUp(document.getElementById('stat-others'), counts.others, 1000);
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

async function loadRecentDocuments() {
  const tbody = document.getElementById('recentDocsBody');
  const emptyEl = document.getElementById('recentDocsEmpty');
  if (!tbody) return;
  
  // Show skeleton
  tbody.innerHTML = Array(3).fill(`
    <tr class="skeleton-row">
      <td><div class="skeleton skeleton-text" style="width:20px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:150px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:80px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:40px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:80px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:80px"></div></td>
    </tr>
  `).join('');
  
  try {
    const response = await apiRequest('getDocuments', { page: 1, pageSize: 5 }, 'GET');
    
    if (response.success) {
      const docs = response.documents || (response.data && response.data.documents) || [];
      
      if (docs.length === 0) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('d-none');
        return;
      }
      
      if (emptyEl) emptyEl.classList.add('d-none');
      
      tbody.innerHTML = docs.map((doc, index) => {
        const title = doc.title || 'Untitled';
        const category = doc.category || 'Others';
        const sub_category = doc.sub_category ? `<br><small class="text-secondary">${doc.sub_category}</small>` : '';
        const year = doc.year || '—';
        const added = formatDate(doc.created_at);
        const badgeClass = getCategoryBadgeClass(category);
        
        return `
          <tr>
            <td>${index + 1}</td>
            <td>
              <span class="fw-semibold">${title}</span>
              ${sub_category}
            </td>
            <td><span class="badge ${badgeClass}">${category}</span></td>
            <td>${year}</td>
            <td>${added}</td>
            <td>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="View" onclick="openViewModal('${doc.id}')"><i class="fa-solid fa-eye text-info"></i></button>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="Edit" onclick="openEditModal('${doc.id}')"><i class="fa-solid fa-pencil text-warning"></i></button>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="Delete" onclick="deleteDocument('${doc.id}')"><i class="fa-solid fa-trash text-danger"></i></button>
            </td>
          </tr>
        `;
      }).join('');
      
      // Initialize tooltips
      if (typeof initTooltips === 'function') initTooltips();
    }
  } catch (err) {
    console.error('Failed to load recent docs', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load documents</td></tr>`;
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
