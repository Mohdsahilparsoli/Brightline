/* ==========================================================================
   attendance.js — Attendance marking page
   ========================================================================== */

let attendanceSelectedDate = todayISO();
let attendanceDraft = {};

function renderAttendancePage(root) {
  root.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Mark Attendance</h3>
          <div class="sub">Select a date, toggle each student, then save.</div>
        </div>
        <div class="toolbar-actions">
          <input type="date" id="attendanceDate" style="padding-left:14px; width:auto;" value="${attendanceSelectedDate}">
          <button class="btn btn-primary" id="saveAttendanceBtn"><i class="fa-solid fa-check"></i> Save Attendance</button>
        </div>
      </div>
      <div id="attendanceListWrap"></div>
    </div>
  `;

  document.getElementById('attendanceDate').addEventListener('change', (e) => {
    attendanceSelectedDate = e.target.value || todayISO();
    loadAttendanceDraft();
    renderAttendanceList();
  });

  document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendanceDraft);

  loadAttendanceDraft();
  renderAttendanceList();
}

function loadAttendanceDraft() {
  const all = getAttendance();
  attendanceDraft = Object.assign({}, all[attendanceSelectedDate] || {});
}

function renderAttendanceList() {
  const wrap = document.getElementById('attendanceListWrap');
  const students = getStudents();

  if (!students.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-user-graduate"></i>
        <h4>No students yet</h4>
        <p>Add students first to start marking attendance.</p>
      </div>
    `;
    return;
  }

  const presentCount = Object.values(attendanceDraft).filter(v => v === 'present').length;

  wrap.innerHTML = `
    <div class="notif-select-summary" style="margin-bottom:14px;">
      <i class="fa-solid fa-circle-info"></i> ${presentCount} of ${students.length} marked present for <b>${formatDate(attendanceSelectedDate)}</b>
    </div>
    <div class="attend-list">
      ${students.map(s => {
        const status = attendanceDraft[s.id] || null;
        return `
          <div class="attend-row">
            <div class="cell-name">
              <div class="avatar" style="width:36px;height:36px;font-size:.75rem;">${initials(s.name)}</div>
              <div>
                <div style="font-weight:600;">${s.name}</div>
                <div style="font-size:.76rem;color:var(--text-muted);">${getBatchName(s.batch)}</div>
              </div>
            </div>
            <div class="attend-toggle" data-id="${s.id}">
              <button type="button" class="present-btn ${status === 'present' ? 'active present' : ''}" data-status="present">Present</button>
              <button type="button" class="absent-btn ${status === 'absent' ? 'active absent' : ''}" data-status="absent">Absent</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  wrap.querySelectorAll('.attend-toggle').forEach(toggle => {
    const id = toggle.getAttribute('data-id');
    toggle.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        attendanceDraft[id] = btn.getAttribute('data-status');
        renderAttendanceList();
      });
    });
  });
}

function saveAttendanceDraft() {
  const all = getAttendance();
  all[attendanceSelectedDate] = attendanceDraft;
  saveAttendance(all);
  pushActivity('fa-clipboard-check', 'blue', `Attendance marked for <b>${formatDate(attendanceSelectedDate)}</b>`, 'Just now');
  showToast('Attendance saved', `Attendance for ${formatDate(attendanceSelectedDate)} has been recorded.`, 'success');
}
