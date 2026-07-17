/* ==========================================================================
   UI.JS — shared shell (sidebar/navbar), toasts, modals, theme, dropdowns
   ========================================================================== */

const NAV_ITEMS = {
  admin: [
    { key:'dashboard', label:'Dashboard', icon:'fa-solid fa-gauge', href:'admin-dashboard.html' },
    { key:'students', label:'Students', icon:'fa-user-graduate', href:'students.html' },
    { key:'teachers', label:'Teachers', icon:'fa-chalkboard-user', href:'teachers.html' },
    { key:'attendance', label:'Attendance', icon:'fa-clipboard-check', href:'attendance.html' },
    { key:'fees', label:'Fees', icon:'fa-sack-dollar', href:'fees.html' },
    { key:'batches', label:'Batches', icon:'fa-layer-group', href:'batches.html' },
    { key:'results', label:'Results', icon:'fa-chart-line', href:'results.html' },
    { key:'notifications', label:'Notifications', icon:'fa-bullhorn', href:'notifications.html' },
    { key:'settings', label:'Settings', icon:'fa-gear', href:'settings.html' }
  ],
  teacher: [
    { key:'dashboard', label:'Dashboard', icon:'fa-solid fa-gauge', href:'teacher-dashboard.html' },
    { key:'students', label:'My Students', icon:'fa-user-graduate', href:'students.html' },
    { key:'attendance', label:'Attendance', icon:'fa-clipboard-check', href:'attendance.html' },
    { key:'results', label:'Results', icon:'fa-chart-line', href:'results.html' },
    { key:'notifications', label:'Notifications', icon:'fa-bullhorn', href:'notifications.html' }
  ]
};

const PAGE_TITLES = {
  dashboard:'Dashboard', students:'Students', teachers:'Teachers', attendance:'Attendance',
  fees:'Fees Management', batches:'Batches', results:'Results', notifications:'Notifications', settings:'Settings'
};

function iconSvg(name){
  // FontAwesome-like fallback isn't needed; we use the FA CDN class names directly (fa-solid fa-...)
  return `<i class="fa-solid ${name}"></i>`;
}

function initShell(activeKey, user){
  const items = NAV_ITEMS[user.role];
  const sidebarRoot = document.getElementById('sidebarRoot');
  const topbarRoot = document.getElementById('topbarRoot');
  if(!sidebarRoot || !topbarRoot) return;

  sidebarRoot.innerHTML = `
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="logo-mark"><i class="fa-solid fa-graduation-cap" style="color:#fff;font-size:14px;"></i></div>
        <span>Brightline</span>
      </div>
      <div class="role-chip"><i class="fa-solid fa-circle"></i> ${user.role === 'admin' ? 'Institute Admin' : 'Teacher'}</div>
      <nav>
        ${items.map(it => `<a href="${it.href}" class="${it.key===activeKey?'active':''}">${iconSvg(it.icon)}<span>${it.label}</span></a>`).join('')}
      </nav>
      <div class="sidebar-foot">
        <p class="storage-note"><i class="fa-solid fa-database"></i> Demo data is stored locally in your browser (localStorage). No server involved.</p>
      </div>
    </aside>
  `;

  const notifs = DB.get(DB_KEYS.notifications, []).slice(0,4);
  topbarRoot.innerHTML = `
    <header class="topbar">
      <div class="tb-left">
        <button class="btn-icon sidebar-toggle" id="sidebarToggle"><i class="fa-solid fa-bars"></i></button>
        <span class="page-title-mobile">${PAGE_TITLES[activeKey] || ''}</span>
        <div class="search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="globalSearch" placeholder="Search students, teachers, batches...">
        </div>
      </div>
      <div class="tb-right">
        <button class="icon-btn" id="themeToggle" title="Toggle theme"><i class="fa-solid fa-moon"></i></button>
        <div class="profile-menu">
          <button class="icon-btn" id="notifBtn" style="position:relative;">
            <i class="fa-solid fa-bell"></i><span class="dot"></span>
          </button>
          <div class="dropdown notif-dropdown" id="notifDropdown">
            <div style="padding:6px 10px 10px;font-weight:700;font-size:13px;">Notifications</div>
            ${notifs.length ? notifs.map(n=>`
              <div class="notif-item">
                <div class="ic"><i class="fa-solid fa-bell"></i></div>
                <div class="tx"><div class="t">${n.message}</div><div class="d">${timeAgo(n.date)}</div></div>
              </div>`).join('') : '<div style="padding:14px;font-size:12.5px;color:var(--text-faint);">No notifications yet.</div>'}
          </div>
        </div>
        <div class="profile-menu">
          <button class="profile-btn" id="profileBtn">
            <div class="avatar">${Auth.initials(user.name)}</div>
            <div class="who"><div class="name">${user.name}</div><div class="role">${user.role==='admin'?'Admin':'Teacher'}</div></div>
            <i class="fa-solid fa-chevron-down" style="font-size:10px;color:var(--text-faint);"></i>
          </button>
          <div class="dropdown" id="profileDropdown">
            <a href="settings.html"><i class="fa-solid fa-user"></i> My Profile</a>
            <a href="settings.html"><i class="fa-solid fa-gear"></i> Settings</a>
            <hr>
            <button class="danger" id="logoutBtn"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
          </div>
        </div>
      </div>
    </header>
  `;

  // Sidebar mobile toggle
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('sidebarToggle').addEventListener('click', ()=>{
    sidebar.classList.add('open'); overlay.classList.add('show');
  });
  overlay.addEventListener('click', ()=>{ sidebar.classList.remove('open'); overlay.classList.remove('show'); });

  // Dropdowns
  setupDropdown('notifBtn','notifDropdown');
  setupDropdown('profileBtn','profileDropdown');

  document.getElementById('logoutBtn').addEventListener('click', ()=> Auth.logout());

  // Global search (simple: filters current page tables if present)
  document.getElementById('globalSearch').addEventListener('input', (e)=>{
    if(typeof onGlobalSearch === 'function') onGlobalSearch(e.target.value);
  });

  initTheme();
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function setupDropdown(btnId, dropId){
  const btn = document.getElementById(btnId);
  const drop = document.getElementById(dropId);
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    document.querySelectorAll('.dropdown.open').forEach(d=> d!==drop && d.classList.remove('open'));
    drop.classList.toggle('open');
  });
  document.addEventListener('click', ()=> drop.classList.remove('open'));
  drop.addEventListener('click', e=>e.stopPropagation());
}

/* ---------------- THEME ---------------- */
function initTheme(){
  const saved = localStorage.getItem(DB_KEYS.theme) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const icon = document.querySelector('#themeToggle i');
  if(icon) icon.className = saved==='dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(DB_KEYS.theme, next);
  const icon = document.querySelector('#themeToggle i');
  if(icon) icon.className = next==='dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  if(typeof onThemeChange === 'function') onThemeChange(next);
}
(function applyThemeEarly(){
  document.documentElement.setAttribute('data-theme', localStorage.getItem(DB_KEYS.theme) || 'light');
})();

/* ---------------- TOASTS ---------------- */
function toast(type, title, desc){
  let stack = document.querySelector('.toast-stack');
  if(!stack){ stack = document.createElement('div'); stack.className='toast-stack'; document.body.appendChild(stack); }
  const icons = { success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.success} t-ic"></i><div class="t-msg"><div class="tt">${title}</div>${desc?`<div class="td">${desc}</div>`:''}</div>`;
  stack.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 300); }, 3400);
}

/* ---------------- MODALS ---------------- */
function openModal(id){ document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id){ document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
document.addEventListener('click', (e)=>{
  if(e.target.classList && e.target.classList.contains('modal-backdrop')){
    e.target.classList.remove('open'); document.body.style.overflow='';
  }
});

/* ---------------- PAGE LOADER ---------------- */
function hidePageLoader(){
  const l = document.getElementById('pageLoader');
  if(l){ l.classList.add('hide'); setTimeout(()=>l.remove(), 400); }
}
window.addEventListener('DOMContentLoaded', ()=> setTimeout(hidePageLoader, 260));
