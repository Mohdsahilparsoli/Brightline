/* ==========================================================================
   dashboard.js — Dashboard page rendering
   ========================================================================== */

function renderDashboardPage(root) {
  const students = getStudents();
  const batches = getBatches();
  const attendance = getAttendance();
  const activity = dbGet(DB_KEYS.activity, []);

  const totalStudents = students.length;

  const today = todayISO();
  const todayRecord = attendance[today] || {};
  const presentToday = Object.values(todayRecord).filter(v => v === 'present').length;
  const attendanceMarked = Object.keys(todayRecord).length > 0;
  const attendancePct = totalStudents ? Math.round((presentToday / totalStudents) * 100) : 0;

  let totalFees = 0, totalPaid = 0;
  students.forEach(s => {
    totalFees += Number(s.feesAmount || 0);
    totalPaid += getStudentPaidTotal(s.id);
  });
  const pendingFees = Math.max(totalFees - totalPaid, 0);

  // Dummy weekly attendance chart data (deterministic-ish, based on totalStudents)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const base = Math.max(totalStudents, 4);
  const weekData = [0.72, 0.85, 0.66, 0.9, 0.78, 0.55, 0.4].map(f => Math.round(base * f));
  const maxVal = Math.max(...weekData, 1);

  root.innerHTML = `
    <div class="grid-cards">
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon purple"><i class="fa-solid fa-user-graduate"></i></div>
          <div class="stat-trend up"><i class="fa-solid fa-arrow-up"></i> +${Math.min(totalStudents, 8)}</div>
        </div>
        <div class="stat-value">${totalStudents}</div>
        <div class="stat-label">Total Students</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon blue"><i class="fa-solid fa-calendar-check"></i></div>
          <div class="stat-trend up"><i class="fa-solid fa-arrow-up"></i> ${attendancePct}%</div>
        </div>
        <div class="stat-value">${presentToday}/${totalStudents}</div>
        <div class="stat-label">${attendanceMarked ? "Today's Attendance" : "Attendance not marked yet"}</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon orange"><i class="fa-solid fa-indian-rupee-sign"></i></div>
          <div class="stat-trend down"><i class="fa-solid fa-arrow-down"></i> Due</div>
        </div>
        <div class="stat-value">${currency(pendingFees)}</div>
        <div class="stat-label">Pending Fees</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon green"><i class="fa-solid fa-layer-group"></i></div>
          <div class="stat-trend up"><i class="fa-solid fa-arrow-up"></i> Active</div>
        </div>
        <div class="stat-value">${batches.length}</div>
        <div class="stat-label">Active Batches</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Weekly Attendance Overview</h3>
            <div class="sub">Student check-ins over the last 7 days</div>
          </div>
        </div>
        <div class="chart-box">
          ${weekData.map((v, i) => `
            <div class="chart-bar-wrap">
              <div class="chart-bar" style="height:${Math.max((v / maxVal) * 100, 4)}%" title="${v} students"></div>
              <div class="chart-bar-label">${days[i]}</div>
            </div>
          `).join('')}
        </div>
        <div class="chart-legend"><span><span class="legend-dot" style="background:var(--primary)"></span> Students present</span></div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Recent Activity</h3>
            <div class="sub">Latest updates from your institute</div>
          </div>
        </div>
        <div class="activity-list">
          ${activity.length ? activity.slice(0, 6).map(a => `
            <div class="activity-item">
              <div class="activity-dot stat-icon ${a.color}" style="width:34px;height:34px;"><i class="fa-solid ${a.icon}"></i></div>
              <div>
                <div class="activity-text">${a.text}</div>
                <div class="activity-time">${a.time}</div>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state">
              <i class="fa-solid fa-inbox"></i>
              <h4>No activity yet</h4>
              <p>Actions you take across the app will show up here.</p>
            </div>
          `}
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:20px;">
      <div class="panel-header">
        <div>
          <h3>Fees Collection Snapshot</h3>
          <div class="sub">Overview of collected vs pending fees this term</div>
        </div>
      </div>
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(var(--success) 0% ${totalFees ? (totalPaid / totalFees) * 100 : 0}%, var(--warning) 0)">
          <div class="donut-center"><b>${totalFees ? Math.round((totalPaid / totalFees) * 100) : 0}%</b><span>Collected</span></div>
        </div>
        <div class="donut-legend">
          <div><span class="legend-dot" style="background:var(--success)"></span> Paid — ${currency(totalPaid)}</div>
          <div><span class="legend-dot" style="background:var(--warning)"></span> Pending — ${currency(pendingFees)}</div>
          <div><span class="legend-dot" style="background:var(--border)"></span> Total — ${currency(totalFees)}</div>
        </div>
      </div>
    </div>
  `;
}
