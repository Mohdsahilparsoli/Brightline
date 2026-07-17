/* ==========================================================================
   notifications.js — Send Reminder / notifications page
   ========================================================================== */

function renderNotificationsPage(root) {
  const students = getStudents();

  root.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Send Reminder</h3>
            <div class="sub">Compose a message and select students to notify</div>
          </div>
        </div>
        <form id="notifForm" novalidate>
          <div class="field" style="margin-bottom:14px;">
            <label for="notifMessage">Message</label>
            <textarea id="notifMessage" placeholder="e.g. Reminder: Your pending fees are due by the 30th of this month."></textarea>
            <div class="field-error" id="notifMessageError"></div>
          </div>
          <div class="field">
            <label>Select students</label>
            <div class="checkbox-list" id="notifStudentList">
              ${students.length ? `
                <label style="border-bottom:1px solid var(--border); border-radius:0; margin-bottom:4px;">
                  <input type="checkbox" id="notifSelectAll">
                  <b>Select all</b>
                </label>
                ${students.map(s => `
                  <label>
                    <input type="checkbox" class="notif-student-cb" value="${s.id}">
                    ${s.name} <span style="color:var(--text-muted); font-size:.78rem;">— ${getBatchName(s.batch)}</span>
                  </label>
                `).join('')}
              ` : `<p style="font-size:.85rem;color:var(--text-muted); padding:8px;">Add students first to send reminders.</p>`}
            </div>
            <div class="notif-select-summary" id="notifSelectSummary">0 student(s) selected</div>
          </div>
          <button type="button" class="btn btn-primary" id="sendReminderBtn" style="margin-top:18px;"><i class="fa-solid fa-paper-plane"></i> Send Reminder</button>
        </form>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Notification History</h3>
            <div class="sub">Previously sent reminders</div>
          </div>
        </div>
        <div id="notifHistoryWrap"></div>
      </div>
    </div>
  `;

  const list = document.getElementById('notifStudentList');
  const summary = document.getElementById('notifSelectSummary');

  function updateSummary() {
    const count = list.querySelectorAll('.notif-student-cb:checked').length;
    summary.textContent = `${count} student${count === 1 ? '' : 's'} selected`;
  }

  const selectAll = document.getElementById('notifSelectAll');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      list.querySelectorAll('.notif-student-cb').forEach(cb => { cb.checked = selectAll.checked; });
      updateSummary();
    });
  }
  list.querySelectorAll('.notif-student-cb').forEach(cb => cb.addEventListener('change', updateSummary));

  document.getElementById('sendReminderBtn').addEventListener('click', () => {
    showFieldError('notifMessageError', '');
    const message = document.getElementById('notifMessage').value.trim();
    const selected = Array.from(list.querySelectorAll('.notif-student-cb:checked')).map(el => el.value);

    let valid = true;
    if (!message) { showFieldError('notifMessageError', 'Please enter a message'); valid = false; }
    if (!selected.length) { showToast('No students selected', 'Select at least one student to send a reminder.', 'warning'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('sendReminderBtn');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    setTimeout(() => {
      const notifications = getNotifications();
      notifications.unshift({ id: uid('notif'), message, studentIds: selected, date: new Date().toISOString() });
      saveNotifications(notifications);
      pushActivity('fa-bell', 'orange', `Reminder sent to ${selected.length} student${selected.length === 1 ? '' : 's'}`, 'Just now');

      btn.disabled = false;
      btn.innerHTML = original;
      document.getElementById('notifForm').reset();
      updateSummary();
      showToast('Reminder sent', `Your message was sent to ${selected.length} student(s).`, 'success');
      renderNotifHistory();
    }, 700);
  });

  renderNotifHistory();
}

function renderNotifHistory() {
  const wrap = document.getElementById('notifHistoryWrap');
  const notifications = getNotifications();

  if (!notifications.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-bell-slash"></i>
        <h4>No reminders sent yet</h4>
        <p>Reminders you send will show up here.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="activity-list">
      ${notifications.slice(0, 8).map(n => `
        <div class="activity-item">
          <div class="activity-dot stat-icon orange" style="width:34px;height:34px;"><i class="fa-solid fa-paper-plane"></i></div>
          <div>
            <div class="activity-text">${n.message}</div>
            <div class="activity-time">Sent to ${n.studentIds.length} student(s) — ${formatDate(n.date)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
