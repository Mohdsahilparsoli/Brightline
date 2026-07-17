/* ==========================================================================
   students.js — Students management page
   ========================================================================== */

let studentsSearchTerm = '';
let editingStudentId = null;

function renderStudentsPage(root) {
  root.innerHTML = `
    <div class="toolbar">
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="studentSearch" placeholder="Search by name or phone...">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" id="addStudentBtn"><i class="fa-solid fa-plus"></i> Add Student</button>
      </div>
    </div>

    <div class="panel" style="padding:0;">
      <div id="studentsTableWrap"></div>
    </div>

    <div class="modal-overlay" id="studentModal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="studentModalTitle">Add Student</h3>
          <button class="modal-close" data-close-modal="studentModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <form id="studentForm" novalidate>
            <div class="form-grid">
              <div class="field">
                <label for="stuName">Full name</label>
                <input type="text" id="stuName" style="padding-left:14px;" placeholder="e.g. Aarav Sharma">
                <div class="field-error" id="stuNameError"></div>
              </div>
              <div class="field">
                <label for="stuPhone">Phone number</label>
                <input type="tel" id="stuPhone" style="padding-left:14px;" placeholder="e.g. 9876543210">
                <div class="field-error" id="stuPhoneError"></div>
              </div>
              <div class="field">
                <label for="stuBatch">Batch</label>
                <select id="stuBatch" style="padding-left:14px;"></select>
                <div class="field-error" id="stuBatchError"></div>
              </div>
              <div class="field">
                <label for="stuFees">Fees amount</label>
                <input type="number" id="stuFees" min="0" style="padding-left:14px;" placeholder="e.g. 12000">
                <div class="field-error" id="stuFeesError"></div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" data-close-modal="studentModal">Cancel</button>
          <button class="btn btn-primary" id="saveStudentBtn"><i class="fa-solid fa-check"></i> Save Student</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="deleteStudentModal">
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h3>Delete Student</h3>
          <button class="modal-close" data-close-modal="deleteStudentModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:.9rem;color:var(--text-muted);">Are you sure you want to delete <b id="deleteStudentName" style="color:var(--text)"></b>? This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" data-close-modal="deleteStudentModal">Cancel</button>
          <button class="btn btn-danger" id="confirmDeleteStudentBtn"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>
    </div>
  `;

  bindModalDismiss();
  populateBatchSelect();
  renderStudentsTable();

  document.getElementById('studentSearch').addEventListener('input', (e) => {
    studentsSearchTerm = e.target.value.trim().toLowerCase();
    renderStudentsTable();
  });

  document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal(null));
  document.getElementById('saveStudentBtn').addEventListener('click', saveStudentForm);
}

function populateBatchSelect() {
  const batches = getBatches();
  const select = document.getElementById('stuBatch');
  select.innerHTML = batches.length
    ? batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')
    : `<option value="">No batches yet — create one first</option>`;
}

function renderStudentsTable() {
  const wrap = document.getElementById('studentsTableWrap');
  let students = getStudents();

  if (studentsSearchTerm) {
    students = students.filter(s =>
      s.name.toLowerCase().includes(studentsSearchTerm) || s.phone.includes(studentsSearchTerm)
    );
  }

  if (!students.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-user-graduate"></i>
        <h4>No students found</h4>
        <p>${studentsSearchTerm ? 'Try a different search term.' : 'Click "Add Student" to enroll your first student.'}</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Batch</th><th>Fees Status</th><th style="text-align:right;">Actions</th></tr>
        </thead>
        <tbody>
          ${students.map(s => {
            const paid = getStudentPaidTotal(s.id);
            const status = feeStatusInfo(paid, s.feesAmount);
            return `
              <tr>
                <td><div class="cell-name"><div class="avatar" style="width:32px;height:32px;font-size:.72rem;">${initials(s.name)}</div>${s.name}</div></td>
                <td>${s.phone}</td>
                <td>${getBatchName(s.batch)}</td>
                <td><span class="badge ${status.cls}">${status.label}</span></td>
                <td>
                  <div class="table-actions" style="justify-content:flex-end;">
                    <button class="icon-action edit-student" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-action danger delete-student" data-id="${s.id}" data-name="${s.name}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', () => openStudentModal(btn.getAttribute('data-id')));
  });
  wrap.querySelectorAll('.delete-student').forEach(btn => {
    btn.addEventListener('click', () => {
      editingStudentId = btn.getAttribute('data-id');
      document.getElementById('deleteStudentName').textContent = btn.getAttribute('data-name');
      openModal('deleteStudentModal');
    });
  });

  document.getElementById('confirmDeleteStudentBtn').onclick = () => {
    const students = getStudents().filter(s => s.id !== editingStudentId);
    saveStudents(students);
    const batches = getBatches();
    batches.forEach(b => { b.studentIds = (b.studentIds || []).filter(id => id !== editingStudentId); });
    saveBatches(batches);
    closeModal('deleteStudentModal');
    renderStudentsTable();
    showToast('Student removed', 'The student record has been deleted.', 'success');
  };
}

function openStudentModal(id) {
  editingStudentId = id;
  populateBatchSelect();
  ['stuNameError', 'stuPhoneError', 'stuBatchError', 'stuFeesError'].forEach(e => showFieldError(e, ''));

  if (id) {
    const s = getStudents().find(x => x.id === id);
    document.getElementById('studentModalTitle').textContent = 'Edit Student';
    document.getElementById('stuName').value = s.name;
    document.getElementById('stuPhone').value = s.phone;
    document.getElementById('stuBatch').value = s.batch;
    document.getElementById('stuFees').value = s.feesAmount;
  } else {
    document.getElementById('studentModalTitle').textContent = 'Add Student';
    document.getElementById('studentForm').reset();
  }
  openModal('studentModal');
}

function saveStudentForm() {
  ['stuNameError', 'stuPhoneError', 'stuBatchError', 'stuFeesError'].forEach(e => showFieldError(e, ''));

  const name = document.getElementById('stuName').value.trim();
  const phone = document.getElementById('stuPhone').value.trim();
  const batch = document.getElementById('stuBatch').value;
  const feesAmount = document.getElementById('stuFees').value;

  let valid = true;
  if (!name) { showFieldError('stuNameError', 'Name is required'); valid = false; }
  if (!phone) { showFieldError('stuPhoneError', 'Phone is required'); valid = false; }
  else if (!/^\d{7,15}$/.test(phone)) { showFieldError('stuPhoneError', 'Enter a valid phone number'); valid = false; }
  if (!batch) { showFieldError('stuBatchError', 'Please select a batch'); valid = false; }
  if (feesAmount === '' || Number(feesAmount) < 0) { showFieldError('stuFeesError', 'Enter a valid fees amount'); valid = false; }

  if (!valid) return;

  const students = getStudents();
  const batches = getBatches();

  if (editingStudentId) {
    const s = students.find(x => x.id === editingStudentId);
    const oldBatch = s.batch;
    s.name = name; s.phone = phone; s.batch = batch; s.feesAmount = Number(feesAmount);
    if (oldBatch !== batch) {
      const oldB = batches.find(b => b.id === oldBatch);
      if (oldB) oldB.studentIds = (oldB.studentIds || []).filter(id => id !== s.id);
      const newB = batches.find(b => b.id === batch);
      if (newB) { newB.studentIds = newB.studentIds || []; if (!newB.studentIds.includes(s.id)) newB.studentIds.push(s.id); }
      saveBatches(batches);
    }
    saveStudents(students);
    showToast('Student updated', `${name}'s details were saved.`, 'success');
  } else {
    const newStudent = { id: uid('stu'), name, phone, batch, feesAmount: Number(feesAmount), feesPaid: 0 };
    students.push(newStudent);
    saveStudents(students);
    const b = batches.find(x => x.id === batch);
    if (b) { b.studentIds = b.studentIds || []; b.studentIds.push(newStudent.id); saveBatches(batches); }
    pushActivity('fa-user-plus', 'purple', `New student <b>${name}</b> was enrolled`, 'Just now');
    showToast('Student added', `${name} has been enrolled successfully.`, 'success');
  }

  closeModal('studentModal');
  renderStudentsTable();
}
