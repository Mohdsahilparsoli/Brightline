/* ==========================================================================
   results.js — Results / marks management page
   ========================================================================== */

function renderResultsPage(root) {
  root.innerHTML = `
    <div class="toolbar">
      <div></div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" id="addMarksBtn"><i class="fa-solid fa-plus"></i> Add Marks</button>
      </div>
    </div>

    <div class="panel" style="padding:0;">
      <div id="resultsTableWrap"></div>
    </div>

    <div class="modal-overlay" id="marksModal">
      <div class="modal" style="max-width:440px;">
        <div class="modal-header">
          <h3>Add Marks</h3>
          <button class="modal-close" data-close-modal="marksModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <form id="marksForm" novalidate>
            <div class="field" style="margin-bottom:14px;">
              <label for="marksStudent">Student</label>
              <select id="marksStudent" style="padding-left:14px;"></select>
              <div class="field-error" id="marksStudentError"></div>
            </div>
            <div class="field" style="margin-bottom:14px;">
              <label for="marksExam">Exam name</label>
              <input type="text" id="marksExam" style="padding-left:14px;" placeholder="e.g. Mid-Term">
              <div class="field-error" id="marksExamError"></div>
            </div>
            <div class="field" style="margin-bottom:14px;">
              <label for="marksSubject">Subject</label>
              <input type="text" id="marksSubject" style="padding-left:14px;" placeholder="e.g. Mathematics">
              <div class="field-error" id="marksSubjectError"></div>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="marksScored">Marks obtained</label>
                <input type="number" id="marksScored" min="0" style="padding-left:14px;" placeholder="e.g. 85">
                <div class="field-error" id="marksScoredError"></div>
              </div>
              <div class="field">
                <label for="marksTotal">Total marks</label>
                <input type="number" id="marksTotal" min="1" style="padding-left:14px;" value="100">
                <div class="field-error" id="marksTotalError"></div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" data-close-modal="marksModal">Cancel</button>
          <button class="btn btn-primary" id="saveMarksBtn"><i class="fa-solid fa-check"></i> Save Result</button>
        </div>
      </div>
    </div>
  `;

  bindModalDismiss();
  renderResultsTable();

  document.getElementById('addMarksBtn').addEventListener('click', openMarksModal);
  document.getElementById('saveMarksBtn').addEventListener('click', saveMarksForm);
}

function renderResultsTable() {
  const wrap = document.getElementById('resultsTableWrap');
  const results = getResults();

  if (!results.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-award"></i>
        <h4>No results yet</h4>
        <p>Click "Add Marks" to record exam results for your students.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap" style="border:none; border-radius:0;">
      <table>
        <thead>
          <tr><th>Student</th><th>Exam</th><th>Subject</th><th>Marks</th><th>Percentage</th><th style="text-align:right;">Actions</th></tr>
        </thead>
        <tbody>
          ${results.slice().reverse().map(r => {
            const pct = Math.round((Number(r.marks) / Number(r.total)) * 100);
            const cls = pct >= 75 ? 'paid' : pct >= 40 ? 'partial' : 'overdue';
            return `
              <tr>
                <td><div class="cell-name"><div class="avatar" style="width:32px;height:32px;font-size:.72rem;">${initials(getStudentName(r.studentId))}</div>${getStudentName(r.studentId)}</div></td>
                <td>${r.examName}</td>
                <td>${r.subject}</td>
                <td>${r.marks} / ${r.total}</td>
                <td><span class="badge ${cls}">${pct}%</span></td>
                <td>
                  <div class="table-actions" style="justify-content:flex-end;">
                    <button class="icon-action danger delete-result" data-id="${r.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('.delete-result').forEach(btn => {
    btn.addEventListener('click', () => {
      const results = getResults().filter(r => r.id !== btn.getAttribute('data-id'));
      saveResults(results);
      renderResultsTable();
      showToast('Result deleted', 'The result entry has been removed.', 'success');
    });
  });
}

function openMarksModal() {
  const students = getStudents();
  const select = document.getElementById('marksStudent');
  select.innerHTML = students.length
    ? students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
    : `<option value="">Add students first</option>`;

  ['marksStudentError', 'marksExamError', 'marksSubjectError', 'marksScoredError', 'marksTotalError'].forEach(e => showFieldError(e, ''));
  document.getElementById('marksForm').reset();
  document.getElementById('marksTotal').value = 100;
  openModal('marksModal');
}

function saveMarksForm() {
  ['marksStudentError', 'marksExamError', 'marksSubjectError', 'marksScoredError', 'marksTotalError'].forEach(e => showFieldError(e, ''));

  const studentId = document.getElementById('marksStudent').value;
  const examName = document.getElementById('marksExam').value.trim();
  const subject = document.getElementById('marksSubject').value.trim();
  const marks = document.getElementById('marksScored').value;
  const total = document.getElementById('marksTotal').value;

  let valid = true;
  if (!studentId) { showFieldError('marksStudentError', 'Please select a student'); valid = false; }
  if (!examName) { showFieldError('marksExamError', 'Exam name is required'); valid = false; }
  if (!subject) { showFieldError('marksSubjectError', 'Subject is required'); valid = false; }
  if (marks === '' || Number(marks) < 0) { showFieldError('marksScoredError', 'Enter valid marks'); valid = false; }
  if (!total || Number(total) <= 0) { showFieldError('marksTotalError', 'Enter valid total'); valid = false; }
  if (valid && Number(marks) > Number(total)) { showFieldError('marksScoredError', 'Cannot exceed total marks'); valid = false; }

  if (!valid) return;

  const results = getResults();
  results.push({ id: uid('res'), studentId, examName, subject, marks: Number(marks), total: Number(total) });
  saveResults(results);
  showToast('Result added', `${subject} result saved for ${getStudentName(studentId)}.`, 'success');
  closeModal('marksModal');
  renderResultsTable();
}
