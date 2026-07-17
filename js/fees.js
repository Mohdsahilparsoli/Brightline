/* ==========================================================================
   fees.js — Fees management page
   ========================================================================== */

let payingStudentId = null;

function renderFeesPage(root) {
  const students = getStudents();
  let totalFees = 0, totalPaid = 0;
  students.forEach(s => { totalFees += Number(s.feesAmount || 0); totalPaid += getStudentPaidTotal(s.id); });
  const totalPending = Math.max(totalFees - totalPaid, 0);

  root.innerHTML = `
    <div class="grid-cards">
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon purple"><i class="fa-solid fa-sack-dollar"></i></div></div>
        <div class="stat-value">${currency(totalFees)}</div>
        <div class="stat-label">Total Fees</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div></div>
        <div class="stat-value">${currency(totalPaid)}</div>
        <div class="stat-label">Paid</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-icon orange"><i class="fa-solid fa-hourglass-half"></i></div></div>
        <div class="stat-value">${currency(totalPending)}</div>
        <div class="stat-label">Pending</div>
      </div>
    </div>

    <div class="panel" style="padding:0;">
      <div style="padding:22px 22px 0;">
        <div class="panel-header">
          <div>
            <h3>Student Fees</h3>
            <div class="sub">Track and collect fee payments per student</div>
          </div>
        </div>
      </div>
      <div id="feesTableWrap"></div>
    </div>

    <div class="modal-overlay" id="paymentModal">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h3>Add Payment</h3>
          <button class="modal-close" data-close-modal="paymentModal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div id="paymentStudentInfo" style="margin-bottom:16px; font-size:.85rem; color:var(--text-muted);"></div>
          <form id="paymentForm" novalidate>
            <div class="field" style="margin-bottom:14px;">
              <label for="payAmount">Amount</label>
              <input type="number" id="payAmount" min="1" style="padding-left:14px;" placeholder="e.g. 5000">
              <div class="field-error" id="payAmountError"></div>
            </div>
            <div class="field" style="margin-bottom:14px;">
              <label for="payMode">Payment mode</label>
              <select id="payMode" style="padding-left:14px;">
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Bank Transfer</option>
              </select>
            </div>
            <div class="field">
              <label for="payDate">Date</label>
              <input type="date" id="payDate" style="padding-left:14px;" value="${todayISO()}">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" data-close-modal="paymentModal">Cancel</button>
          <button class="btn btn-primary" id="savePaymentBtn"><i class="fa-solid fa-check"></i> Record Payment</button>
        </div>
      </div>
    </div>
  `;

  bindModalDismiss();
  renderFeesTable();
  document.getElementById('savePaymentBtn').addEventListener('click', savePayment);
}

function renderFeesTable() {
  const wrap = document.getElementById('feesTableWrap');
  const students = getStudents();

  if (!students.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-indian-rupee-sign"></i>
        <h4>No fee records yet</h4>
        <p>Add students to start tracking their fee payments.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap" style="border:none; border-radius:0;">
      <table>
        <thead>
          <tr><th>Name</th><th>Batch</th><th>Total Fees</th><th>Paid</th><th>Pending</th><th>Status</th><th style="text-align:right;">Actions</th></tr>
        </thead>
        <tbody>
          ${students.map(s => {
            const paid = getStudentPaidTotal(s.id);
            const pending = Math.max(Number(s.feesAmount || 0) - paid, 0);
            const status = feeStatusInfo(paid, s.feesAmount);
            return `
              <tr>
                <td><div class="cell-name"><div class="avatar" style="width:32px;height:32px;font-size:.72rem;">${initials(s.name)}</div>${s.name}</div></td>
                <td>${getBatchName(s.batch)}</td>
                <td>${currency(s.feesAmount)}</td>
                <td>${currency(paid)}</td>
                <td>${currency(pending)}</td>
                <td><span class="badge ${status.cls}">${status.label}</span></td>
                <td>
                  <div class="table-actions" style="justify-content:flex-end;">
                    <button class="btn btn-sm btn-outline add-payment-btn" data-id="${s.id}" ${pending <= 0 ? 'disabled' : ''}><i class="fa-solid fa-plus"></i> Add Payment</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('.add-payment-btn').forEach(btn => {
    btn.addEventListener('click', () => openPaymentModal(btn.getAttribute('data-id')));
  });
}

function openPaymentModal(studentId) {
  payingStudentId = studentId;
  const s = getStudents().find(x => x.id === studentId);
  const paid = getStudentPaidTotal(studentId);
  const pending = Math.max(Number(s.feesAmount || 0) - paid, 0);

  showFieldError('payAmountError', '');
  document.getElementById('paymentStudentInfo').innerHTML =
    `Recording payment for <b style="color:var(--text)">${s.name}</b> — pending amount: <b style="color:var(--text)">${currency(pending)}</b>`;
  document.getElementById('paymentForm').reset();
  document.getElementById('payDate').value = todayISO();
  document.getElementById('payAmount').value = pending;
  openModal('paymentModal');
}

function savePayment() {
  showFieldError('payAmountError', '');
  const amount = document.getElementById('payAmount').value;
  const mode = document.getElementById('payMode').value;
  const date = document.getElementById('payDate').value;

  if (!amount || Number(amount) <= 0) {
    showFieldError('payAmountError', 'Enter a valid amount');
    return;
  }

  const s = getStudents().find(x => x.id === payingStudentId);
  addPaymentForStudent(payingStudentId, amount, mode, date);
  pushActivity('fa-indian-rupee-sign', 'green', `Fee payment of <b>${currency(amount)}</b> received from ${s.name}`, 'Just now');
  showToast('Payment recorded', `${currency(amount)} recorded for ${s.name}.`, 'success');
  closeModal('paymentModal');
  renderFeesTable();
}
