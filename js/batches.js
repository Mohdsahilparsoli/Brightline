/* ==========================================================================
   batches.js — Batches management page
   ========================================================================== */

let editingBatchId = null;
let assigningBatchId = null;
let deletingBatchId = null;

function renderBatchesPage(root) {
  root.innerHTML = `
    <div class="toolbar">
      <div></div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" id="addBatchBtn"><i class="fa-solid fa-plus"></i> Create Batch</button>
      </div>
    </div>

    <div id="batchesGridWrap"></div>

    <div class="modal-overlay" id="batchModal">
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h3 id="batchModalTitle">Create Batch</h3>
          <button class="modal-close" data-close-modal="batchModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <form id="batchForm" novalidate>
            <div class="field" style="margin-bottom:14px;">
              <label for="batchName">Batch name</label>
              <input type="text" id="batchName" style="padding-left:14px;" placeholder="e.g. Class 11 - Physics">
              <div class="field-error" id="batchNameError"></div>
            </div>
            <div class="field">
              <label for="batchTiming">Timing</label>
              <input type="text" id="batchTiming" style="padding-left:14px;" placeholder="e.g. Mon-Fri, 5:00 PM - 6:30 PM">
              <div class="field-error" id="batchTimingError"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" data-close-modal="batchModal">Cancel</button>
          <button class="btn btn-primary" id="saveBatchBtn"><i class="fa-solid fa-check"></i> Save Batch</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="assignModal">
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h3>Assign Students</h3>
          <button class="modal-close" data-close-modal="assignModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="checkbox-list" id="assignStudentList"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" data-close-modal="assignModal">Cancel</button>
          <button class="btn btn-primary" id="saveAssignBtn"><i class="fa-solid fa-check"></i> Save</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="deleteBatchModal">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h3>Delete Batch</h3>
          <button class="modal-close" data-close-modal="deleteBatchModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:.9rem;color:var(--text-muted);">Are you sure you want to delete <b id="deleteBatchName" style="color:var(--text)"></b>? Students in this batch will remain but become unassigned.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" data-close-modal="deleteBatchModal">Cancel</button>
          <button class="btn btn-danger" id="confirmDeleteBatchBtn"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>
    </div>
  `;

  bindModalDismiss();
  renderBatchesGrid();

  document.getElementById('addBatchBtn').addEventListener('click', () => openBatchModal(null));
  document.getElementById('saveBatchBtn').addEventListener('click', saveBatchForm);
  document.getElementById('saveAssignBtn').addEventListener('click', saveAssignStudents);
}

function renderBatchesGrid() {
  const wrap = document.getElementById('batchesGridWrap');
  const batches = getBatches();

  if (!batches.length) {
    wrap.innerHTML = `
      <div class="panel">
        <div class="empty-state">
          <i class="fa-solid fa-layer-group"></i>
          <h4>No batches yet</h4>
          <p>Create your first batch to start organizing students by timing and subject.</p>
        </div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="batch-grid">
      ${batches.map(b => {
        const studentIds = b.studentIds || [];
        return `
          <div class="batch-card">
            <div class="batch-card-top">
              <h4>${b.name}</h4>
              <div class="table-actions">
                <button class="icon-action edit-batch" data-id="${b.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-action danger delete-batch" data-id="${b.id}" data-name="${b.name}" title="Delete"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
            <div class="batch-meta">
              <div><i class="fa-solid fa-clock"></i>${b.timing || 'No timing set'}</div>
              <div><i class="fa-solid fa-user-group"></i>${studentIds.length} student${studentIds.length === 1 ? '' : 's'} enrolled</div>
            </div>
            <div class="batch-students">
              ${studentIds.length
                ? studentIds.map(id => `<span class="chip">${getStudentName(id)}</span>`).join('')
                : `<span style="font-size:.78rem;color:var(--text-muted);">No students assigned yet</span>`}
            </div>
            <button class="btn btn-outline btn-sm assign-batch" data-id="${b.id}" style="margin-top:16px; width:100%;"><i class="fa-solid fa-user-plus"></i> Assign Students</button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  wrap.querySelectorAll('.edit-batch').forEach(btn => btn.addEventListener('click', () => openBatchModal(btn.getAttribute('data-id'))));
  wrap.querySelectorAll('.assign-batch').forEach(btn => btn.addEventListener('click', () => openAssignModal(btn.getAttribute('data-id'))));
  wrap.querySelectorAll('.delete-batch').forEach(btn => {
    btn.addEventListener('click', () => {
      deletingBatchId = btn.getAttribute('data-id');
      document.getElementById('deleteBatchName').textContent = btn.getAttribute('data-name');
      openModal('deleteBatchModal');
    });
  });

  document.getElementById('confirmDeleteBatchBtn').onclick = () => {
    const batches = getBatches().filter(b => b.id !== deletingBatchId);
    saveBatches(batches);
    closeModal('deleteBatchModal');
    renderBatchesGrid();
    showToast('Batch deleted', 'The batch has been removed.', 'success');
  };
}

function openBatchModal(id) {
  editingBatchId = id;
  showFieldError('batchNameError', '');
  showFieldError('batchTimingError', '');

  if (id) {
    const b = getBatches().find(x => x.id === id);
    document.getElementById('batchModalTitle').textContent = 'Edit Batch';
    document.getElementById('batchName').value = b.name;
    document.getElementById('batchTiming').value = b.timing || '';
  } else {
    document.getElementById('batchModalTitle').textContent = 'Create Batch';
    document.getElementById('batchForm').reset();
  }
  openModal('batchModal');
}

function saveBatchForm() {
  showFieldError('batchNameError', '');
  showFieldError('batchTimingError', '');

  const name = document.getElementById('batchName').value.trim();
  const timing = document.getElementById('batchTiming').value.trim();

  let valid = true;
  if (!name) { showFieldError('batchNameError', 'Batch name is required'); valid = false; }
  if (!timing) { showFieldError('batchTimingError', 'Timing is required'); valid = false; }
  if (!valid) return;

  const batches = getBatches();
  if (editingBatchId) {
    const b = batches.find(x => x.id === editingBatchId);
    b.name = name; b.timing = timing;
    showToast('Batch updated', `${name} was updated.`, 'success');
  } else {
    batches.push({ id: uid('batch'), name, timing, studentIds: [] });
    showToast('Batch created', `${name} is ready — assign students to it.`, 'success');
  }
  saveBatches(batches);
  closeModal('batchModal');
  renderBatchesGrid();
}

function openAssignModal(batchId) {
  assigningBatchId = batchId;
  const batch = getBatches().find(b => b.id === batchId);
  const students = getStudents();
  const listEl = document.getElementById('assignStudentList');

  listEl.innerHTML = students.length
    ? students.map(s => `
        <label>
          <input type="checkbox" value="${s.id}" ${(batch.studentIds || []).includes(s.id) ? 'checked' : ''}>
          ${s.name} <span style="color:var(--text-muted); font-size:.78rem;">— ${getBatchName(s.batch)}</span>
        </label>
      `).join('')
    : `<p style="font-size:.85rem;color:var(--text-muted);">No students available. Add students first.</p>`;

  openModal('assignModal');
}

function saveAssignStudents() {
  const checked = Array.from(document.querySelectorAll('#assignStudentList input:checked')).map(el => el.value);
  const batches = getBatches();
  const students = getStudents();
  const batch = batches.find(b => b.id === assigningBatchId);

  batch.studentIds = checked;

  // Remove these students from any other batch's list, and update their batch field
  batches.forEach(b => {
    if (b.id !== assigningBatchId) {
      b.studentIds = (b.studentIds || []).filter(id => !checked.includes(id));
    }
  });

  students.forEach(s => {
    if (checked.includes(s.id)) s.batch = assigningBatchId;
    else if (s.batch === assigningBatchId) s.batch = '';
  });

  saveBatches(batches);
  saveStudents(students);
  closeModal('assignModal');
  renderBatchesGrid();
  showToast('Students assigned', `${checked.length} student(s) assigned to ${batch.name}.`, 'success');
}
