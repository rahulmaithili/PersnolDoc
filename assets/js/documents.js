// Documents Logic

const state = {
  documents: [],
  total: 0,
  page: 1,
  pageSize: CONFIG.PAGE_SIZE,
  filters: {},
  searchQuery: '',
  loading: false
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
  const emptyEl = document.getElementById('docsEmpty');
  if (!tbody) return;
  
  if (docs.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('d-none');
    return;
  }
  
  if (emptyEl) emptyEl.classList.add('d-none');
  
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
          <button class="btn-icon-action fav-btn" data-bs-toggle="tooltip" title="Favorite" onclick="toggleFavorite('${doc.id}', ${isFav})">
            <i class="fa-solid fa-star ${isFav ? 'text-warning' : 'text-muted'}"></i>
          </button>
          <button class="btn-icon-action" data-bs-toggle="tooltip" title="Delete" onclick="deleteDocument('${doc.id}')"><i class="fa-solid fa-trash text-danger"></i></button>
        </td>
      </tr>
    `;
  }).join('');
  
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

function loadCategories() {
  const selects = [document.getElementById('filterCategory'), document.getElementById('docCategory')];
  
  selects.forEach(select => {
    if (select) {
      // Clear existing options except first
      while(select.options.length > 1) select.remove(1);
      
      CONFIG.CATEGORIES.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
      });
    }
  });
}

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
      issue_date,
      expiry_date,
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
      if (document.getElementById('documentsTableBody')) {
        loadDocuments();
      } else {
        // Redirection on standalone page
        setTimeout(() => {
          window.location.href = 'documents.html';
        }, 1200);
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
      text: `Are you sure you want to delete "${doc.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
      // Prompt for Drive deletion as well
      const driveResult = await Swal.fire({
        title: 'Delete from Drive?',
        text: 'Do you also want to delete the file from Google Drive?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete file too',
        cancelButtonText: 'No, keep file'
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
  showLoading();
  const response = await apiRequest('toggleFavorite', { docId: docId, isFavorite: !currentVal }, 'POST');
  hideLoading();
  
  if (response.success) {
    showToast('success', 'Success', `Document ${!currentVal ? 'added to' : 'removed from'} favorites`);
    if (document.getElementById('documentsBody')) {
      loadDocuments();
    } else if (typeof loadRecentDocuments === 'function') {
      loadRecentDocuments();
    }
  } else {
    showToast('error', 'Error', response.message || 'Failed to update favorite status');
  }
};

window.openViewModal = async function(docId) {
  let doc = state.documents ? state.documents.find(d => String(d.id) === String(docId)) : null;
  
  if (!doc) {
    showLoading('Loading document...');
    const response = await apiRequest('getDocument', { docId }, 'GET');
    hideLoading();
    if (response.success && response.data) {
      doc = response.data;
    }
  }
  
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
  
  const previewContainer = document.getElementById('viewDocPreview');
  if (previewContainer) {
    if (doc.drive_file_id) {
      previewContainer.innerHTML = `
        <iframe src="https://drive.google.com/file/d/${doc.drive_file_id}/preview" style="width:100%; height:450px; border:none; border-radius:6px;"></iframe>
      `;
    } else if (doc.document_url) {
      const url = doc.document_url;
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)/)) {
        previewContainer.innerHTML = `<img src="${url}" class="img-fluid rounded" style="max-height:450px;" alt="Preview"/>`;
      } else {
        previewContainer.innerHTML = `
          <div class="text-center p-4">
            <i class="fa-solid fa-file-pdf fa-4x text-danger mb-3"></i>
            <h6>External Link Attached</h6>
            <p class="text-secondary small">Cannot display iframe preview for external URL. Click below to open original link.</p>
            <a href="${url}" target="_blank" class="btn btn-sm btn-primary mt-2"><i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Open in New Tab</a>
          </div>
        `;
      }
    } else {
      previewContainer.innerHTML = `
        <div class="text-center p-4">
          <i class="fa-solid fa-eye-slash fa-3x text-muted opacity-50 mb-3"></i>
          <p class="text-secondary small mb-0">No preview available for this document.</p>
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
    const url = doc.document_url || (doc.drive_file_id ? `https://drive.google.com/file/d/${doc.drive_file_id}/view` : '');
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
    const bsModal = new bootstrap.Modal(modalEl);
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

window.downloadDocument = async function(docId) {
  let doc = state.documents ? state.documents.find(d => String(d.id) === String(docId)) : null;
  if (!doc) {
    const res = await apiRequest('getDocument', { docId }, 'GET');
    if (res.success) doc = res.data;
  }
  if (!doc) return;
  
  if (doc.document_url) {
    window.open(doc.document_url, '_blank');
  } else if (doc.drive_file_id) {
    window.open(`https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`, '_blank');
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
    navigator.clipboard.writeText(url).then(() => {
      showToast('success', 'Link Copied', 'Document link copied to clipboard.');
    }).catch(err => {
      console.error('Could not copy text: ', err);
      showToast('error', 'Error', 'Failed to copy link.');
    });
  } else {
    showToast('info', 'Not Available', 'No file attached to this document.');
  }
};
