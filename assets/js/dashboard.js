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
      
      // Render Charts
      renderCharts(counts, docs);
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

let categoryChartInstance = null;
let uploadHistoryChartInstance = null;

function renderCharts(counts, docs) {
  // 1. Category Distribution Chart (Doughnut)
  const categoryCtx = document.getElementById('categoryChart');
  if (categoryCtx) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    
    const currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
    const isDark = currentTheme === 'dark';
    const textPrimary = isDark ? '#e0e0e0' : '#2d3436';
    
    categoryChartInstance = new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: ['College', 'High School', 'Land Records', 'Certificates', 'Others'],
        datasets: [{
          data: [counts.college, counts.school, counts.land, counts.certs, counts.others],
          backgroundColor: [
            '#9c27b0', // purple
            '#ff9800', // orange
            '#4caf50', // green
            '#e63946', // red
            '#ec4899'  // pink
          ],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1a1d2e' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textPrimary,
              font: { size: 11, family: 'Segoe UI' },
              padding: 15
            }
          }
        }
      }
    });
  }

  // 2. Upload History Chart (Bar Chart for last 6 months)
  const historyCtx = document.getElementById('uploadHistoryChart');
  if (historyCtx) {
    if (uploadHistoryChartInstance) uploadHistoryChartInstance.destroy();
    
    const currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
    const isDark = currentTheme === 'dark';
    const textPrimary = isDark ? '#e0e0e0' : '#2d3436';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    
    // Calculate last 6 months labels & values
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months = [];
    const uploadCounts = [0, 0, 0, 0, 0, 0];
    
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const tempDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
      last6Months.push({
        name: monthNames[tempDate.getMonth()] + ' ' + tempDate.getFullYear().toString().substr(-2),
        month: tempDate.getMonth(),
        year: tempDate.getFullYear()
      });
    }
    
    // Group upload count
    docs.forEach(doc => {
      if (doc.created_at) {
        const createdDate = new Date(doc.created_at);
        const m = createdDate.getMonth();
        const y = createdDate.getFullYear();
        
        for (let i = 0; i < 6; i++) {
          if (last6Months[i].month === m && last6Months[i].year === y) {
            uploadCounts[i]++;
            break;
          }
        }
      }
    });
    
    uploadHistoryChartInstance = new Chart(historyCtx, {
      type: 'bar',
      data: {
        labels: last6Months.map(m => m.name),
        datasets: [{
          label: 'Documents Uploaded',
          data: uploadCounts,
          backgroundColor: '#4361ee',
          borderRadius: 6,
          maxBarThickness: 35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textPrimary, font: { family: 'Segoe UI', size: 10 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textPrimary,
              font: { family: 'Segoe UI', size: 10 },
              stepSize: 1,
              precision: 0
            }
          }
        }
      }
    });
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
