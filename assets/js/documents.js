// Documents Logic

const state = {
  documents: [],
  total: 0,
  page: 1,
  pageSize: CONFIG.PAGE_SIZE,
  filters: {},
  searchQuery: '',
  loading: false,
  viewMode: localStorage.getItem('dv_view_mode') || 'list'
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('documentsBody')) {
    checkAuth();
    initTheme();
    initTooltips();
    initUserAvatar();
    initSidebar();
    
    // Bind global buttons
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    readURLParams();
    loadCategories();
    initYearSelect();
    
    initSearchDebounce();
    initFilterForm();
    initAddEditModal();
    initViewMode();
    
    loadDocuments();
  }
});



function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('category')) state.filters.category = params.get('category');
  if (params.has('favorite')) state.filters.favorite = params.get('favorite') === 'true';
  if (params.has('sub_category')) state.filters.sub_category = params.get('sub_category');
}

async function loadDocuments() {
  state.loading = true;
  const tbody = document.getElementById('documentsBody');
  const gridContainer = document.getElementById('documentsGrid');
  const listView = document.getElementById('listViewContainer');
  const gridView = document.getElementById('gridViewContainer');
  
  if (state.viewMode === 'grid') {
    if (listView) listView.classList.add('d-none');
    if (gridView) gridView.classList.remove('d-none');
    if (gridContainer) {
      gridContainer.innerHTML = Array(8).fill(`
        <div class="col">
          <div class="card h-100 border-0 shadow-sm">
            <div class="skeleton" style="height: 130px; border-radius: 8px 8px 0 0;"></div>
            <div class="card-body p-3">
              <div class="skeleton skeleton-text" style="width: 50px; height: 16px; margin-bottom: 8px;"></div>
              <div class="skeleton skeleton-text" style="width: 150px; height: 20px; margin-bottom: 8px;"></div>
              <div class="skeleton skeleton-text" style="width: 100px; height: 14px; margin-bottom: 8px;"></div>
              <div class="d-flex justify-content-between mt-3 pt-2 border-top">
                <div class="skeleton skeleton-text" style="width: 60px; height: 12px; margin-bottom: 0;"></div>
                <div class="skeleton skeleton-text" style="width: 20px; height: 20px; margin-bottom: 0;"></div>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
  } else {
    if (listView) listView.classList.remove('d-none');
    if (gridView) gridView.classList.add('d-none');
    if (tbody) {
      tbody.innerHTML = Array(5).fill(`
        <tr class="skeleton-row">
          <td><div class="skeleton skeleton-text" style="width:20px"></div></td>
          <td><div class="skeleton skeleton-text" style="width:150px"></div></td>
          <td><div class="skeleton skeleton-text" style="width:80px"></div></td>
          <td><div class="skeleton skeleton-text" style="width:100px"></div></td>
          <td><div class="skeleton skeleton-text" style="width:40px"></div></td>
          <td><div class="skeleton skeleton-text" style="width:80px"></div></td>
          <td><div class="skeleton skeleton-text" style="width:120px"></div></td>
        </tr>
      `).join('');
    }
  }
  
  let action = 'getDocuments';
  let params = {
    page: state.page,
    pageSize: state.pageSize,
    ...state.filters
  };
  
  if (state.searchQuery) {
    action = 'searchDocuments';
    params = { query: state.searchQuery };
  } else if (Object.keys(state.filters).length > 0) {
    action = 'filterDocuments';
  }
  
  try {
    const response = await apiRequest(action, params, 'GET');
    
    if (response.success) {
      state.documents = response.documents || (response.data && response.data.documents) || [];
      state.total = response.total || (response.data && response.data.total) || state.documents.length;
      renderDocumentsTable(state.documents);
      renderPagination(state.total, state.page, state.pageSize);
    } else {
      throw new Error(response.message);
    }
  } catch (err) {
    console.error('Failed to load documents:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load documents</td></tr>`;
  } finally {
    state.loading = false;
  }
}

function renderDocumentsTable(docs) {
  const tbody = document.getElementById('documentsBody');
  const gridContainer = document.getElementById('documentsGrid');
  const emptyEl = document.getElementById('docsEmpty');
  
  const listView = document.getElementById('listViewContainer');
  const gridView = document.getElementById('gridViewContainer');
  
  if (state.viewMode === 'grid') {
    if (listView) listView.classList.add('d-none');
    if (gridView) gridView.classList.remove('d-none');
  } else {
    if (listView) listView.classList.remove('d-none');
    if (gridView) gridView.classList.add('d-none');
  }
  
  if (docs.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (gridContainer) gridContainer.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('d-none');
    return;
  }
  
  if (emptyEl) emptyEl.classList.add('d-none');
  
  if (state.viewMode === 'grid') {
    if (gridContainer) {
      gridContainer.innerHTML = docs.map((doc) => {
        const title = doc.title || 'Untitled';
        const category = doc.category || 'Others';
        const badgeClass = getCategoryBadgeClass(category);
        const addedDate = formatDate(doc.created_at);
        const isFav = !!doc.favorite;
        
        return `
          <div class="col">
            <div class="card h-100 border-0 shadow-sm doc-grid-card" style="border-radius:12px; overflow:hidden;">
              <div class="card-img-top d-flex align-items-center justify-content-center position-relative py-4" style="background: rgba(var(--primary-rgb, 67, 97, 238), 0.05); height: 130px; border-radius: 12px 12px 0 0;">
                <span class="position-absolute" style="top:10px; right:10px;">
                  <button class="btn btn-sm btn-light rounded-circle fav-btn ${isFav ? 'active' : ''}" style="width:30px; height:30px; padding:0; display:flex; align-items:center; justify-content:center; border:none; box-shadow:0 2px 5px rgba(0,0,0,0.15);" onclick="toggleFavorite('${doc.id}', ${isFav}); event.stopPropagation();">
                    <i class="fa-solid fa-star ${isFav ? 'text-warning' : 'text-muted'}"></i>
                  </button>
                </span>
                <i class="fa-solid ${getCategoryIcon(category)} fa-3x" style="color: ${getCategoryColor(category)}"></i>
              </div>
              <div class="card-body p-3 d-flex flex-column">
                <span class="badge ${badgeClass} align-self-start mb-2">${category}</span>
                <h6 class="card-title fw-bold text-truncate mb-1" style="font-size:0.95rem;" title="${title}">${title}</h6>
                ${doc.sub_category ? `<p class="text-muted small text-truncate mb-2" style="font-size:0.8rem;">${doc.sub_category}</p>` : '<p class="text-muted small mb-2">&nbsp;</p>'}
                <div class="mt-auto pt-2 border-top">
                  <div class="d-flex justify-content-between align-items-center">
                    <small class="text-secondary" style="font-size:0.75rem;"><i class="fa-regular fa-calendar me-1"></i>${addedDate}</small>
                    <div class="dropdown">
                      <button class="btn btn-sm btn-link p-0 text-decoration-none text-secondary" data-bs-toggle="dropdown" style="box-shadow:none;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                      <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                        <li><a class="dropdown-item py-2" href="#" onclick="openViewModal('${doc.id}'); return false;"><i class="fa-solid fa-eye text-info me-2"></i>View</a></li>
                        <li><a class="dropdown-item py-2" href="#" onclick="openEditModal('${doc.id}'); return false;"><i class="fa-solid fa-pencil text-warning me-2"></i>Edit</a></li>
                        <li><a class="dropdown-item py-2" href="#" onclick="downloadDocument('${doc.id}'); return false;"><i class="fa-solid fa-download text-success me-2"></i>Download</a></li>
                        <li><a class="dropdown-item py-2" href="#" onclick="printDocument('${doc.id}'); return false;"><i class="fa-solid fa-print text-secondary me-2"></i>Print</a></li>
                        <li><hr class="dropdown-divider my-1"></li>
                        <li><a class="dropdown-item py-2 text-danger" href="#" onclick="deleteDocument('${doc.id}'); return false;"><i class="fa-solid fa-trash me-2"></i>Delete</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } else {
    if (tbody) {
      tbody.innerHTML = docs.map((doc, index) => {
        const title = doc.title || 'Untitled';
        const category = doc.category || 'Others';
        const badgeClass = getCategoryBadgeClass(category);
        const docNumber = doc.document_number || '—';
        const institution = doc.institution_name || '—';
        const year = doc.year || '—';
        const addedDate = formatDate(doc.created_at);
        const sub_category = doc.sub_category ? `<br><small class="text-secondary">${doc.sub_category}</small>` : '';
        const isFav = !!doc.favorite;
        const offsetIndex = (state.page - 1) * state.pageSize + (index + 1);

        return `
          <tr>
            <td>${offsetIndex}</td>
            <td>
              <span class="fw-semibold">${title}</span>
              ${sub_category}
              <br>
              <span class="badge ${badgeClass} mt-1">${category}</span>
            </td>
            <td>${docNumber}</td>
            <td>${institution}</td>
            <td>${year}</td>
            <td>${addedDate}</td>
            <td>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="View" onclick="openViewModal('${doc.id}')"><i class="fa-solid fa-eye text-info"></i></button>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="Edit" onclick="openEditModal('${doc.id}')"><i class="fa-solid fa-pencil text-warning"></i></button>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="Download" onclick="downloadDocument('${doc.id}')"><i class="fa-solid fa-download text-success"></i></button>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="Print" onclick="printDocument('${doc.id}')"><i class="fa-solid fa-print text-secondary"></i></button>
              <button class="btn-icon-action fav-btn ${isFav ? 'active' : ''}" data-bs-toggle="tooltip" title="Favorite" onclick="toggleFavorite('${doc.id}', ${isFav})">
                <i class="fa-solid fa-star"></i>
              </button>
              <button class="btn-icon-action" data-bs-toggle="tooltip" title="Delete" onclick="deleteDocument('${doc.id}')"><i class="fa-solid fa-trash text-danger"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
  
  if (typeof initTooltips === 'function') initTooltips();
}

function renderPagination(total, page, pageSize) {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) return;
  
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let html = `<div style="display:flex; justify-content:center; gap:5px; margin-top:20px;">`;
  
  html += `<button class="btn btn-secondary" ${page === 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">Prev</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    // Basic implementation: show all pages (ideally should show ellipsis for large numbers)
    html += `<button class="btn ${i === page ? 'btn-primary' : 'btn-secondary'}" onclick="goToPage(${i})">${i}</button>`;
  }
  
  html += `<button class="btn btn-secondary" ${page === totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})">Next</button>`;
  
  html += `</div>`;
  paginationContainer.innerHTML = html;
}

window.goToPage = function(p) {
  state.page = p;
  loadDocuments();
};

function initSearchDebounce() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    const debouncedSearch = debounce((val) => {
      state.searchQuery = val.trim();
      state.page = 1; // Reset to page 1 on search
      loadDocuments();
    }, CONFIG.SEARCH_DEBOUNCE_MS);
    
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  }
}

function initFilterForm() {
  const applyBtn = document.getElementById('applyFilterBtn');
  const resetBtn = document.getElementById('resetFilterBtn');
  
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const category = document.getElementById('filterCategory').value;
      const month = document.getElementById('filterMonth').value;
      const year = document.getElementById('filterYear').value;
      
      state.filters = {};
      if (category) state.filters.category = category;
      if (month) state.filters.month = month;
      if (year) state.filters.year = year;
      
      state.page = 1;
      loadDocuments();
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.getElementById('filterCategory').value = '';
      document.getElementById('filterMonth').value = '';
      document.getElementById('filterYear').value = '';
      
      state.filters = {};
      state.page = 1;
      loadDocuments();
    });
  }
}

function initYearSelect() {
  const yearSelect = document.getElementById('filterYear');
  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 2010; y--) {
      const option = document.createElement('option');
      option.value = y;
      option.textContent = y;
      yearSelect.appendChild(option);
    }
  }
}

window.loadCategories = async function() {
  const defaultList = [
    { name: 'College', icon: 'fa-graduation-cap' },
    { name: 'High School', icon: 'fa-school' },
    { name: 'Semester Records', icon: 'fa-book-open' },
    { name: 'Land Records', icon: 'fa-map' },
    { name: 'Certificates', icon: 'fa-certificate' },
    { name: 'Others', icon: 'fa-folder' }
  ];

  let catMap = new Map();
  defaultList.forEach(c => catMap.set(c.name, c.icon));

  // 1. Read custom categories from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem('dv_custom_categories') || '[]');
    if (Array.isArray(saved)) {
      saved.forEach(item => {
        const name = typeof item === 'string' ? item : item.name;
        const icon = typeof item === 'object' && item.icon ? item.icon : 'fa-folder';
        if (name && !catMap.has(name)) {
          catMap.set(name, icon);
        }
      });
    }
  } catch (e) {}

  // 2. Fetch from Supabase / API
  try {
    const res = await apiRequest('getCategories', {}, 'GET');
    if (res && res.success && Array.isArray(res.data)) {
      res.data.forEach(item => {
        const name = typeof item === 'string' ? item : item.name;
        const icon = typeof item === 'object' && item.icon ? item.icon : 'fa-folder';
        if (name && !catMap.has(name)) {
          catMap.set(name, icon);
        }
      });
    }
  } catch (err) {
    console.warn('Error fetching categories from API:', err);
  }

  const categoryNames = Array.from(catMap.keys());

  // 3. Populate all category dropdown selects on the page
  const selects = [
    document.getElementById('fCategory'),
    document.getElementById('filterCategory'),
    document.getElementById('docCategory')
  ];

  selects.forEach(select => {
    if (select) {
      const currentVal = select.value;
      const firstOptText = (select.options[0] && select.options[0].text) || 'Select Category';
      select.innerHTML = `<option value="">${firstOptText}</option>`;
      
      categoryNames.forEach(catName => {
        const opt = document.createElement('option');
        opt.value = catName;
        opt.textContent = catName;
        select.appendChild(opt);
      });

      if (currentVal && categoryNames.includes(currentVal)) {
        select.value = currentVal;
      }
    }
  });

  // 4. Dynamically update Sidebar CATEGORIES menu
  updateSidebarCategories(catMap);

  return categoryNames;
};

function updateSidebarCategories(catMap) {
  const sidebarCategoryMenu = document.getElementById('sidebarCategoryMenu');
  if (!sidebarCategoryMenu) return;

  const currentUrl = window.location.href;
  const currentCategory = new URLSearchParams(window.location.search).get('category');

  let html = '';
  catMap.forEach((icon, name) => {
    const isActive = currentCategory === name;
    html += `
      <li>
        <a href="documents.html?category=${encodeURIComponent(name)}" 
           class="sidebar-link ${isActive ? 'active' : ''}" 
           data-bs-toggle="tooltip" 
           data-bs-placement="right" 
           title="${name}">
          <i class="fa-solid ${icon}"></i>
          <span>${name}</span>
        </a>
      </li>
    `;
  });

  // Favorites Link
  const isFavActive = new URLSearchParams(window.location.search).get('favorite') === 'true';
  html += `
    <li>
      <a href="documents.html?favorite=true" 
         class="sidebar-link ${isFavActive ? 'active' : ''}" 
         data-bs-toggle="tooltip" 
         data-bs-placement="right" 
         title="Favorites">
        <i class="fa-solid fa-star"></i>
        <span>Favorites</span>
      </a>
    </li>
  `;

  // "+ Add Custom Category" Button
  html += `
    <li class="mt-1">
      <a href="#" 
         class="sidebar-link text-primary fw-semibold" 
         onclick="promptAddCategory(); return false;" 
         data-bs-toggle="tooltip" 
         data-bs-placement="right" 
         title="Add Custom Category">
        <i class="fa-solid fa-plus-circle text-primary"></i>
        <span>+ Add Category</span>
      </a>
    </li>
  `;

  sidebarCategoryMenu.innerHTML = html;
  if (typeof initTooltips === 'function') initTooltips();
}

window.promptAddCategory = async function(preselectTargetId = 'fCategory') {
  if (typeof Swal === 'undefined') {
    const name = prompt('Enter new category name:');
    if (name) addNewCategory(name.trim(), 'fa-folder', preselectTargetId);
    return;
  }

  const { value: formValues } = await Swal.fire({
    title: '<i class="fa-solid fa-folder-plus text-primary me-2"></i>Add Custom Category',
    html: `
      <div class="text-start mt-2">
        <label class="form-label small fw-semibold">Category Name</label>
        <input id="swal-cat-name" class="form-control mb-3" placeholder="e.g. Vehicle, Medical, Bank, Tax" autofocus required>
        <label class="form-label small fw-semibold">Category Icon</label>
        <select id="swal-cat-icon" class="form-select">
          <option value="fa-folder">📁 Folder (Default)</option>
          <option value="fa-id-card">🪪 ID Cards & Passports</option>
          <option value="fa-car">🚗 Vehicle & Transport</option>
          <option value="fa-heart-pulse">🩺 Medical & Health</option>
          <option value="fa-building-columns">🏛️ Banking & Finance</option>
          <option value="fa-receipt">🧾 Bills & Tax Receipts</option>
          <option value="fa-house">🏠 Property & House</option>
          <option value="fa-briefcase">💼 Employment & Work</option>
          <option value="fa-file-shield">🛡️ Insurance & Legal</option>
          <option value="fa-graduation-cap">🎓 Education / Degree</option>
          <option value="fa-star">⭐ Important / Priority</option>
        </select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="fa-solid fa-plus me-1"></i>Create Category',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#4361ee',
    focusConfirm: false,
    preConfirm: () => {
      const name = document.getElementById('swal-cat-name').value.trim();
      const icon = document.getElementById('swal-cat-icon').value;
      if (!name) {
        Swal.showValidationMessage('Please enter a category name');
        return false;
      }
      return { name, icon };
    }
  });

  if (formValues && formValues.name) {
    await addNewCategory(formValues.name, formValues.icon, preselectTargetId);
  }
};

window.addNewCategory = async function(name, icon = 'fa-folder', preselectTargetId = 'fCategory') {
  showLoading('Saving category...');

  // 1. Immediately cache in localStorage
  try {
    let saved = JSON.parse(localStorage.getItem('dv_custom_categories') || '[]');
    if (!saved.some(c => (typeof c === 'string' ? c : c.name).toLowerCase() === name.toLowerCase())) {
      saved.push({ name, icon });
      localStorage.setItem('dv_custom_categories', JSON.stringify(saved));
    }
  } catch (e) {}

  // 2. Persist to Supabase / Backend API
  try {
    await apiRequest('addCategory', { name, icon }, 'POST');
  } catch (e) {
    console.warn('API addCategory error:', e);
  }
  hideLoading();

  // 3. Reload categories everywhere
  await loadCategories();

  // 4. Auto-select in form if dropdown is open
  const target = document.getElementById(preselectTargetId);
  if (target) {
    target.value = name;
  }

  showToast('success', 'Category Created', `Category "${name}" added successfully!`);
};

function initAddEditModal() {
  const form = document.getElementById('docForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitDocumentForm();
    });
  }

  // Smart Auto-Tagging logic
  const titleInput = document.getElementById('fTitle');
  const tagsInput = document.getElementById('fTags');
  if (titleInput && tagsInput) {
    titleInput.addEventListener('input', () => {
      if (!tagsInput.value.trim() || tagsInput.dataset.isAutoGenerated === 'true') {
        const autoTags = generateAutoTags(titleInput.value);
        tagsInput.value = autoTags;
        tagsInput.dataset.isAutoGenerated = autoTags ? 'true' : 'false';
      }
    });
    tagsInput.addEventListener('input', () => {
      tagsInput.dataset.isAutoGenerated = 'false';
    });
  }
}

function generateAutoTags(titleText) {
  if (!titleText) return '';
  const text = titleText.toLowerCase();
  const tagsSet = new Set();
  
  const rules = {
    'college': ['education', 'college'],
    'school': ['education', 'school'],
    'intermediate': ['education', 'intermediate'],
    'marksheet': ['marksheet', 'academic'],
    'result': ['result', 'academic'],
    'certificate': ['certificate'],
    'receipt': ['receipt', 'invoice', 'payment'],
    'bill': ['bill', 'payment'],
    'invoice': ['invoice', 'payment'],
    'fees': ['fees', 'college', 'payment'],
    'land': ['property', 'land_records'],
    'plot': ['property', 'land_records'],
    'registry': ['property', 'land_records', 'legal'],
    'passport': ['identity', 'passport', 'travel'],
    'license': ['identity', 'license', 'driving'],
    'aadhar': ['identity', 'aadhaar'],
    'pan': ['identity', 'pan_card'],
    'visa': ['identity', 'visa', 'travel'],
    'insurance': ['insurance', 'finance'],
    'medical': ['medical', 'health'],
    'tax': ['tax', 'finance']
  };
  
  for (const keyword in rules) {
    if (text.includes(keyword)) {
      rules[keyword].forEach(t => tagsSet.add(t));
    }
  }
  
  return Array.from(tagsSet).map(t => '#' + t).join(', ');
}

window.openAddModal = function() {
  clearForm();
  if (document.getElementById('fDocId')) document.getElementById('fDocId').value = '';
  const titleEl = document.getElementById('docFormModalTitle');
  if (titleEl) titleEl.textContent = 'Add Document';
  
  const modalEl = document.getElementById('docFormModal');
  if (modalEl) {
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }
};

window.openEditModal = function(docId) {
  const doc = state.documents.find(d => String(d.id) === String(docId));
  if (!doc) {
    showToast('error', 'Error', 'Document not found');
    return;
  }
  
  populateEditForm(doc);
  const titleEl = document.getElementById('docFormModalTitle');
  if (titleEl) titleEl.textContent = 'Edit Document';
  
  const modalEl = document.getElementById('docFormModal');
  if (modalEl) {
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }
};

window.closeAddEditModal = function() {
  const modalEl = document.getElementById('docFormModal');
  if (modalEl) {
    const bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
  }
};

function clearForm() {
  const form = document.getElementById('docForm');
  if (form) form.reset();
  
  const progressWrap = document.getElementById('uploadProgressContainer');
  if (progressWrap) progressWrap.classList.add('d-none');
  const progressBar = document.getElementById('uploadProgress');
  if (progressBar) progressBar.style.width = '0%';
}

function populateEditForm(doc) {
  clearForm();
  if (document.getElementById('fDocId')) document.getElementById('fDocId').value = doc.id || '';
  if (document.getElementById('fTitle')) document.getElementById('fTitle').value = doc.title || '';
  if (document.getElementById('fCategory')) document.getElementById('fCategory').value = doc.category || '';
  if (document.getElementById('fSubCategory')) document.getElementById('fSubCategory').value = doc.sub_category || '';
  if (document.getElementById('fDocNumber')) document.getElementById('fDocNumber').value = doc.document_number || '';
  if (document.getElementById('fInstitution')) document.getElementById('fInstitution').value = doc.institution_name || '';
  if (document.getElementById('fCourse')) document.getElementById('fCourse').value = doc.course_name || '';
  if (document.getElementById('fSemester')) document.getElementById('fSemester').value = doc.semester || '';
  if (document.getElementById('fMonth')) document.getElementById('fMonth').value = doc.month || '';
  if (document.getElementById('fYear')) document.getElementById('fYear').value = doc.year || '';
  if (document.getElementById('fReceipt')) document.getElementById('fReceipt').value = doc.receipt_number || '';
  if (document.getElementById('fIssueDate')) {
    document.getElementById('fIssueDate').value = doc.issue_date ? doc.issue_date.split('T')[0] : '';
  }
  if (document.getElementById('fExpiryDate')) {
    document.getElementById('fExpiryDate').value = doc.expiry_date ? doc.expiry_date.split('T')[0] : '';
  }
  if (document.getElementById('fTags')) document.getElementById('fTags').value = doc.tags || '';
  if (document.getElementById('fNotes')) document.getElementById('fNotes').value = doc.notes || '';
  if (document.getElementById('fDescription')) document.getElementById('fDescription').value = doc.description || '';
  if (document.getElementById('fFavorite')) document.getElementById('fFavorite').checked = !!doc.favorite;
  if (document.getElementById('fDocUrl')) document.getElementById('fDocUrl').value = doc.document_url || '';
}

async function submitDocumentForm() {
  const id = document.getElementById('fDocId').value;
  const title = document.getElementById('fTitle').value;
  const category = document.getElementById('fCategory').value;
  const sub_category = document.getElementById('fSubCategory') ? document.getElementById('fSubCategory').value : '';
  const document_number = document.getElementById('fDocNumber') ? document.getElementById('fDocNumber').value : '';
  const institution_name = document.getElementById('fInstitution') ? document.getElementById('fInstitution').value : '';
  const course_name = document.getElementById('fCourse') ? document.getElementById('fCourse').value : '';
  const semester = document.getElementById('fSemester') ? document.getElementById('fSemester').value : '';
  const month = document.getElementById('fMonth') ? document.getElementById('fMonth').value : '';
  const year = document.getElementById('fYear') ? document.getElementById('fYear').value : '';
  const receipt_number = document.getElementById('fReceipt') ? document.getElementById('fReceipt').value : '';
  const issue_date = document.getElementById('fIssueDate') ? document.getElementById('fIssueDate').value : '';
  const expiry_date = document.getElementById('fExpiryDate') ? document.getElementById('fExpiryDate').value : '';
  const tags = document.getElementById('fTags') ? document.getElementById('fTags').value : '';
  const notes = document.getElementById('fNotes') ? document.getElementById('fNotes').value : '';
  const description = document.getElementById('fDescription') ? document.getElementById('fDescription').value : '';
  const favorite = document.getElementById('fFavorite') ? document.getElementById('fFavorite').checked : false;

  const fileInput = document.getElementById('fFileInput');
  const docUrlInput = document.getElementById('fDocUrl');

  if (!title || !category) {
    showToast('warning', 'Validation', 'Title and Category are required');
    return;
  }

  // Detect which file source is active
  let isUploadMode = false;
  const uploadTabBtn = document.querySelector('[data-bs-target="#tabUpload"]');
  if (uploadTabBtn && uploadTabBtn.classList.contains('active')) {
    isUploadMode = true;
  } else if (fileInput && fileInput.files.length > 0) {
    isUploadMode = true;
  }

  const saveBtn = document.getElementById('saveDocBtn');
  if (saveBtn) saveBtn.disabled = true;

  try {
    let drive_file_id = '';
    let document_url = docUrlInput ? docUrlInput.value.trim() : '';

    let file_name = '';
    let file_type = '';
    let ocr_text = '';

    if (isUploadMode && fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      
      // Validation
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error('Invalid file type. Allowed: ' + CONFIG.ALLOWED_EXTENSIONS.join(', '));
      }
      if (file.size > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`File size exceeds limit of ${CONFIG.MAX_FILE_SIZE_MB}MB`);
      }

      // Show upload progress
      const progressWrap = document.getElementById('uploadProgressContainer');
      const progressBar = document.getElementById('uploadProgress');
      if (progressWrap) progressWrap.classList.remove('d-none');
      if (progressBar) progressBar.style.width = '30%';

      const base64Data = await convertFileToBase64(file);
      if (progressBar) progressBar.style.width = '60%';
      const pureBase64 = base64Data.split(',')[1];

      const uploadResponse = await apiRequest('uploadFile', {
        base64Data: pureBase64,
        mimeType: file.type,
        fileName: file.name
      }, 'POST');

      if (progressBar) progressBar.style.width = '100%';

      if (!uploadResponse.success || !uploadResponse.data) {
        throw new Error(uploadResponse.message || 'File upload failed');
      }

      drive_file_id = uploadResponse.data.fileId;
      document_url = uploadResponse.data.fileUrl;
      file_name = file.name;
      file_type = file.type;
      ocr_text = uploadResponse.data.ocrText || '';
      
      setTimeout(() => {
        if (progressWrap) progressWrap.classList.add('d-none');
        if (progressBar) progressBar.style.width = '0%';
      }, 1000);
    }

    if (document_url && !drive_file_id) {
      const driveMatch = document_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                         document_url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                         document_url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/) ||
                         document_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        drive_file_id = driveMatch[1];
      }
    }

    const payload = {
      title,
      category,
      sub_category,
      document_number,
      institution_name,
      course_name,
      semester,
      month,
      year,
      receipt_number,
      issue_date: (issue_date && issue_date.trim() !== '') ? issue_date.trim() : null,
      expiry_date: (expiry_date && expiry_date.trim() !== '') ? expiry_date.trim() : null,
      tags,
      notes,
      description,
      favorite,
      document_url,
      drive_file_id,
      file_name,
      file_type,
      ocr_text
    };

    const action = id ? 'updateDocument' : 'addDocument';
    
    showLoading(id ? 'Updating document...' : 'Adding document...');
    const response = await apiRequest(action, { docId: id, data: payload }, 'POST');
    hideLoading();

    if (response.success) {
      showToast('success', 'Success', id ? 'Document updated successfully' : 'Document added successfully');
      
      // Close modal if on documents page
      const modalEl = document.getElementById('docFormModal');
      if (modalEl) {
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
      }
      
      // Reload documents if table exists
      if (document.getElementById('documentsBody')) {
        loadDocuments();
      } else {
        // Redirection on standalone page
        setTimeout(() => {
          window.location.href = 'documents.html';
        }, 800);
      }
    } else {
      throw new Error(response.message || 'Saving failed');
    }
  } catch (err) {
    console.error(err);
    showToast('error', 'Error', err.message || 'Failed to save document');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

window.deleteDocument = async function(docId) {
  const doc = state.documents.find(d => String(d.id) === String(docId));
  if (!doc) return;
  
  if (typeof Swal !== 'undefined') {
    const result = await Swal.fire({
      title: 'Delete Document?',
      text: `Are you sure you want to permanently delete "${doc.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      customClass: {
        confirmButton: 'btn-danger-confirm'
      },
      confirmButtonText: '<i class="fa-solid fa-trash me-2"></i>Delete',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      // Prompt for Drive deletion as well
      const driveResult = await Swal.fire({
        title: 'Delete from Drive?',
        text: 'Do you also want to remove this file permanently from Google Drive storage?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-cloud-arrow-down me-1"></i>Delete from Drive',
        cancelButtonText: 'Keep in Drive'
      });
      
      const deleteDriveFile = driveResult.isConfirmed;
      performDelete(docId, deleteDriveFile);
    }
  } else {
    if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      const deleteDriveFile = confirm("Do you also want to delete the file from Google Drive?");
      performDelete(docId, deleteDriveFile);
    }
  }
};

async function performDelete(docId, deleteDriveFile) {
  showLoading('Deleting...');
  const response = await apiRequest('deleteDocument', { docId: docId, deleteDriveFile }, 'POST');
  hideLoading();
  
  if (response.success) {
    showToast('success', 'Deleted!', 'Document has been deleted.');
    loadDocuments();
  } else {
    showToast('error', 'Error', response.message || 'Failed to delete');
  }
}

window.toggleFavorite = async function(docId, currentVal) {
  const newVal = !currentVal;
  
  // 1. Optimistic Update in State
  const doc = state.documents ? state.documents.find(d => String(d.id) === String(docId)) : null;
  if (doc) doc.favorite = newVal;
  
  // 2. Optimistic Update in DOM (0ms instant visual feedback)
  document.querySelectorAll(`[data-fav-id="${docId}"]`).forEach(btn => {
    if (newVal) {
      btn.classList.add('active');
      btn.querySelector('i').style.color = '#ffc107';
    } else {
      btn.classList.remove('active');
      btn.querySelector('i').style.color = '';
    }
  });

  // 3. Background API request without blocking full-screen loading
  try {
    const response = await apiRequest('toggleFavorite', { docId: docId, isFavorite: newVal }, 'POST');
    if (response.success) {
      showToast('success', 'Favorite Updated', `Document ${newVal ? 'added to' : 'removed from'} favorites`);
    } else {
      throw new Error(response.message);
    }
  } catch (err) {
    // Revert if failed
    if (doc) doc.favorite = currentVal;
    showToast('error', 'Error', 'Failed to update favorite status');
    if (document.getElementById('documentsBody')) loadDocuments();
  }
};

window.openViewModal = async function(docId) {
  hideLoading();
  
  let doc = state.documents ? state.documents.find(d => String(d.id) === String(docId)) : null;
  if (!doc && window.cachedDocs && window.cachedDocs[String(docId)]) {
    doc = window.cachedDocs[String(docId)];
  }
  
  const modalEl = document.getElementById('viewDocModal');
  const bsModal = modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;

  if (!doc) {
    if (bsModal) {
      document.getElementById('viewDocTitle').textContent = 'Loading Document...';
      const previewContainer = document.getElementById('viewDocPreview');
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="d-flex flex-column align-items-center justify-content-center p-5 w-100" style="min-height:480px; height:60vh;">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 2.8rem; height: 2.8rem;"></div>
            <p class="text-secondary small fw-medium">Loading document preview...</p>
          </div>
        `;
      }
      bsModal.show();
    }
    
    const response = await apiRequest('getDocument', { docId }, 'GET');
    if (response.success && response.data) {
      doc = response.data;
      if (!window.cachedDocs) window.cachedDocs = {};
      window.cachedDocs[String(docId)] = doc;
    }
  }
  
  hideLoading();
  
  if (!doc) {
    showToast('error', 'Error', 'Document not found');
    return;
  }
  
  document.getElementById('viewDocTitle').textContent = doc.title || 'Untitled';
  const badgeClass = getCategoryBadgeClass(doc.category);
  const badgeEl = document.getElementById('viewDocBadge');
  if (badgeEl) {
    badgeEl.className = `badge ${badgeClass} ms-2`;
    badgeEl.textContent = doc.category || 'Others';
  }
  
  const infoList = document.getElementById('viewDocInfoList');
  if (infoList) {
    const fields = [
      { label: 'Category', value: doc.category },
      { label: 'Sub Category', value: doc.sub_category },
      { label: 'Doc Number', value: doc.document_number },
      { label: 'Institution', value: doc.institution_name },
      { label: 'Course/Degree', value: doc.course_name },
      { label: 'Semester', value: doc.semester },
      { label: 'Month', value: doc.month },
      { label: 'Year', value: doc.year },
      { label: 'Receipt No', value: doc.receipt_number },
      { label: 'Issue Date', value: doc.issue_date ? formatDate(doc.issue_date) : '' },
      { label: 'Expiry Date', value: doc.expiry_date ? formatDate(doc.expiry_date) : '' },
      { label: 'Tags', value: doc.tags },
      { label: 'Notes', value: doc.notes },
      { label: 'Description', value: doc.description }
    ];
    
    let infoHtml = '<table class="table table-sm table-borderless mb-0">';
    fields.forEach(f => {
      if (f.value) {
        infoHtml += `
          <tr>
            <td class="fw-semibold text-secondary" style="width: 40%">${f.label}:</td>
            <td class="text-primary-emphasis">${f.value}</td>
          </tr>
        `;
      }
    });
    infoHtml += '</table>';
    infoList.innerHTML = infoHtml;
  }
  
  // Reset details column visibility on new modal open
  const detailsCol = document.getElementById('viewDocDetailsCol');
  const previewCol = document.getElementById('viewDocPreviewCol');
  const toggleBtn = document.getElementById('toggleDetailsBtn');
  if (detailsCol && previewCol) {
    detailsCol.classList.remove('d-none');
    previewCol.className = 'col-lg-8 col-md-7';
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-arrows-left-right me-1"></i><span>Full Preview</span>';
  }

  const previewContainer = document.getElementById('viewDocPreview');
  if (previewContainer) {
    const rawUrl = doc.document_url || '';
    const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                       rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                       rawUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/) ||
                       rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/) ||
                       rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const driveId = doc.drive_file_id || (driveMatch ? driveMatch[1] : null);
    const lowerUrl = rawUrl.toLowerCase();
    const fileType = (doc.file_type || '').toLowerCase();
    const isImage = fileType.startsWith('image/') || lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?)/);
    const isPdf = fileType === 'application/pdf' || lowerUrl.match(/\.pdf($|\?)/);

    if (driveId) {
      // 1. Google Drive Document / Image / PDF - Full Height
      previewContainer.innerHTML = `
        <div class="d-flex flex-column h-100 w-100">
          <div class="d-flex justify-content-between align-items-center mb-2 px-1">
            <span class="small fw-semibold text-secondary">
              <i class="fa-brands fa-google-drive text-primary me-1"></i> In-App Cloud Preview
            </span>
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="togglePreviewDetails()">
                <i class="fa-solid fa-expand me-1"></i>Full Screen View
              </button>
              <a href="https://drive.google.com/file/d/${driveId}/view" target="_blank" class="btn btn-outline-secondary btn-sm">
                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Open Drive Tab
              </a>
            </div>
          </div>
          <div style="position:relative; width:100%; height:72vh; min-height:580px; background:#f8fafc; border:1px solid rgba(0,0,0,0.08); border-radius:12px; overflow:hidden;">
            <iframe src="https://drive.google.com/file/d/${driveId}/preview" 
                    style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;" 
                    allow="autoplay"
                    allowfullscreen>
            </iframe>
          </div>
        </div>
      `;
    } else if (rawUrl) {
      if (isImage || rawUrl.startsWith('data:image/')) {
        // 2. Direct Image Link / Data URL (JPEG, PNG, WEBP, etc.) - Full Height
        previewContainer.innerHTML = `
          <div class="d-flex flex-column align-items-center justify-content-center p-3 rounded w-100" style="min-height:580px; height:72vh; background:rgba(0,0,0,0.02); border:1px solid rgba(0,0,0,0.06);">
            <img src="${rawUrl}" class="img-fluid rounded shadow" style="max-height:68vh; max-width:100%; object-fit:contain;" alt="${doc.title}" onerror="this.parentElement.innerHTML='<div class=\\'text-center p-4\\'><i class=\\'fa-solid fa-image fa-3x text-secondary mb-2\\'></i><p class=\\'text-muted small\\'>Image could not be rendered directly.</p><a href=\\'${rawUrl}\\' target=\\'_blank\\' class=\\'btn btn-sm btn-primary\\'>Open Image</a></div>';" />
            <div class="mt-2 text-center">
              <button type="button" class="btn btn-sm btn-outline-secondary me-2" onclick="togglePreviewDetails()"><i class="fa-solid fa-expand me-1"></i>Toggle Full Width</button>
              <a href="${rawUrl}" target="_blank" class="small text-decoration-none text-muted"><i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Original Size</a>
            </div>
          </div>
        `;
      } else if (isPdf) {
        // 3. Direct PDF Embed - Full Height
        previewContainer.innerHTML = `
          <div style="position:relative; width:100%; height:72vh; min-height:580px; background:#f8fafc; border:1px solid rgba(0,0,0,0.08); border-radius:12px; overflow:hidden;">
            <iframe src="${rawUrl}#toolbar=1" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
          </div>
        `;
      } else {
        // 4. Any other document (Docs, Sheets, web link) via Google Docs Viewer
        const encodedUrl = encodeURIComponent(rawUrl);
        previewContainer.innerHTML = `
          <div class="d-flex flex-column h-100 w-100">
            <div style="position:relative; width:100%; height:72vh; min-height:580px; background:#f8fafc; border:1px solid rgba(0,0,0,0.08); border-radius:12px; overflow:hidden;">
              <iframe src="https://docs.google.com/viewer?url=${encodedUrl}&embedded=true" style="width:100%; height:100%; border:none;"></iframe>
            </div>
            <div class="text-center mt-2">
              <a href="${rawUrl}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Open Original Document</a>
            </div>
          </div>
        `;
      }
    } else {
      previewContainer.innerHTML = `
        <div class="text-center p-5">
          <i class="fa-solid fa-file-circle-xmark fa-3x text-secondary opacity-50 mb-3"></i>
          <h6 class="fw-semibold">No File Attached</h6>
          <p class="text-secondary small mb-0">No document file or URL was attached to this record.</p>
        </div>
      `;
    }
  }
  
  const btnCopy = document.getElementById('btnViewCopy') || document.getElementById('viewCopyBtn');
  const btnOpen = document.getElementById('btnViewOpen') || document.getElementById('viewOpenBtn');
  const btnPrint = document.getElementById('btnViewPrint') || document.getElementById('viewPrintBtn');
  const btnDownload = document.getElementById('btnViewDownload') || document.getElementById('viewDownloadBtn');
  const btnEdit = document.getElementById('btnViewEdit') || document.getElementById('viewEditBtn');
  
  if (btnCopy) btnCopy.onclick = () => copyLink(doc.id);
  if (btnOpen) btnOpen.onclick = () => {
    const rawUrl = doc.document_url || '';
    const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const driveId = doc.drive_file_id || (driveMatch ? driveMatch[1] : null);
    const url = rawUrl || (driveId ? `https://drive.google.com/file/d/${driveId}/view` : '');
    if (url) window.open(url, '_blank');
    else showToast('info', 'Not Available', 'No link available');
  };
  if (btnPrint) btnPrint.onclick = () => printDocument(doc.id);
  if (btnDownload) btnDownload.onclick = () => downloadDocument(doc.id);
  if (btnEdit) btnEdit.onclick = () => {
    const modalEl = document.getElementById('viewDocModal');
    if (modalEl) {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }
    
    if (!document.getElementById('documentsBody')) {
      window.location.href = `documents.html?edit=${doc.id}`;
    } else {
      openEditModal(doc.id);
    }
  };
  
  const modalEl = document.getElementById('viewDocModal');
  if (modalEl) {
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
  }
};

window.closeViewModal = function() {
  const modalEl = document.getElementById('viewDocModal');
  if (modalEl) {
    const bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
  }
};

window.toggleModalFullscreen = function() {
  const modalEl = document.getElementById('viewDocModal');
  if (!modalEl) return;
  const modalDialog = modalEl.querySelector('.modal-dialog');
  const icon = document.getElementById('modalFullscreenIcon');
  if (modalDialog) {
    modalDialog.classList.toggle('modal-fullscreen');
    const isFull = modalDialog.classList.contains('modal-fullscreen');
    if (icon) icon.className = isFull ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
  }
};

window.togglePreviewDetails = function() {
  const detailsCol = document.getElementById('viewDocDetailsCol');
  const previewCol = document.getElementById('viewDocPreviewCol');
  const toggleBtn = document.getElementById('toggleDetailsBtn');
  if (detailsCol && previewCol) {
    if (detailsCol.classList.contains('d-none')) {
      detailsCol.classList.remove('d-none');
      previewCol.className = 'col-lg-8 col-md-7';
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-arrows-left-right me-1"></i><span>Full Preview</span>';
    } else {
      detailsCol.classList.add('d-none');
      previewCol.className = 'col-12';
      if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-table-columns me-1"></i><span>Show Details</span>';
    }
  }
};

window.downloadDocument = async function(docId) {
  let doc = state.documents ? state.documents.find(d => String(d.id) === String(docId)) : null;
  if (!doc) {
    const res = await apiRequest('getDocument', { docId }, 'GET');
    if (res.success) doc = res.data;
  }
  if (!doc) return;
  
  const rawUrl = doc.document_url || '';
  const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                     rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                     rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const driveId = doc.drive_file_id || (driveMatch ? driveMatch[1] : null);

  if (driveId) {
    window.open(`https://drive.google.com/uc?export=download&id=${driveId}`, '_blank');
  } else if (doc.document_url) {
    window.open(doc.document_url, '_blank');
  } else {
    showToast('info', 'Not Available', 'No file attached to this document.');
  }
};

window.printDocument = async function(docId) {
  let doc = state.documents ? state.documents.find(d => String(d.id) === String(docId)) : null;
  if (!doc) {
    const res = await apiRequest('getDocument', { docId }, 'GET');
    if (res.success) doc = res.data;
  }
  if (!doc) return;
  
  const url = doc.document_url || (doc.drive_file_id ? `https://drive.google.com/file/d/${doc.drive_file_id}/view` : null);
  if (url) {
    window.open(url, '_blank');
  } else {
    showToast('info', 'Not Available', 'No file attached to this document.');
  }
};

window.copyLink = async function(docId) {
  let doc = state.documents ? state.documents.find(d => String(d.id) === String(docId)) : null;
  if (!doc) {
    const res = await apiRequest('getDocument', { docId }, 'GET');
    if (res.success) doc = res.data;
  }
  if (!doc) return;
  
  const url = doc.document_url || (doc.drive_file_id ? `https://drive.google.com/file/d/${doc.drive_file_id}/view` : null);
  if (url) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('success', 'Link Copied', 'Document link copied to clipboard.');
      }).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  } else {
    showToast('info', 'Not Available', 'No file attached to this document.');
  }

  function fallbackCopy(text) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        showToast('success', 'Link Copied', 'Document link copied to clipboard.');
      } else {
        prompt('Copy link manually:', text);
      }
    } catch (e) {
      prompt('Copy link manually:', text);
    }
  }
};

function initViewMode() {
  const listBtn = document.getElementById('listViewBtn');
  const gridBtn = document.getElementById('gridViewBtn');
  
  if (listBtn && gridBtn) {
    listBtn.addEventListener('click', () => switchViewMode('list'));
    gridBtn.addEventListener('click', () => switchViewMode('grid'));
    
    // Set initial active state in UI
    const currentMode = state.viewMode;
    if (currentMode === 'grid') {
      listBtn.classList.remove('btn-primary');
      listBtn.classList.add('btn-outline-secondary');
      gridBtn.classList.remove('btn-outline-secondary');
      gridBtn.classList.add('btn-primary');
    } else {
      listBtn.classList.remove('btn-outline-secondary');
      listBtn.classList.add('btn-primary');
      gridBtn.classList.remove('btn-primary');
      gridBtn.classList.add('btn-outline-secondary');
    }
  }
}

window.switchViewMode = function(mode) {
  state.viewMode = mode;
  localStorage.setItem('dv_view_mode', mode);
  
  const listBtn = document.getElementById('listViewBtn');
  const gridBtn = document.getElementById('gridViewBtn');
  
  if (listBtn && gridBtn) {
    if (mode === 'grid') {
      listBtn.classList.remove('btn-primary');
      listBtn.classList.add('btn-outline-secondary');
      gridBtn.classList.remove('btn-outline-secondary');
      gridBtn.classList.add('btn-primary');
    } else {
      listBtn.classList.remove('btn-outline-secondary');
      listBtn.classList.add('btn-primary');
      gridBtn.classList.remove('btn-primary');
      gridBtn.classList.add('btn-outline-secondary');
    }
  }
  
  renderDocumentsTable(state.documents);
};

function getCategoryIcon(cat) {
  switch (cat) {
    case 'College': return 'fa-graduation-cap';
    case 'High School': return 'fa-school';
    case 'Semester Records': return 'fa-book-open';
    case 'Land Records': return 'fa-map';
    case 'Certificates': return 'fa-certificate';
    default: return 'fa-file-lines';
  }
}

function getCategoryColor(cat) {
  switch (cat) {
    case 'College': return '#8338ec';
    case 'High School': return '#ff006e';
    case 'Semester Records': return '#3a0ca3';
    case 'Land Records': return '#38b000';
    case 'Certificates': return '#ff5400';
    default: return '#4361ee';
  }
}
