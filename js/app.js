/* ==========================================================================
   APP.JS — page-level rendering & interaction logic
   ========================================================================== */

function fmtMoney(n){ return '₹' + Number(n||0).toLocaleString('en-IN'); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ============================================================ ADMIN DASHBOARD */
function initAdminDashboard(user){
  const students = DB.get(DB_KEYS.students, []);
  const teachers = DB.get(DB_KEYS.teachers, []);
  const fees = DB.get(DB_KEYS.fees, []);
  const attendance = DB.get(DB_KEYS.attendance, []);

  const totalStudents = students.filter(s=>s.status==='Active').length;
  const totalTeachers = teachers.length;
  const totalRevenue = fees.reduce((a,f)=>a+f.paid,0);
  const pendingFees = fees.reduce((a,f)=>a+(f.total-f.paid),0);

  const today = new Date().toISOString().slice(0,10);
  const todayAtt = attendance.filter(a=>a.date===today);
  const presentToday = todayAtt.filter(a=>a.status==='Present').length;
  const attPct = todayAtt.length ? Math.round((presentToday/todayAtt.length)*100) : 92;

  document.getElementById('statTotalStudents').textContent = totalStudents;
  document.getElementById('statTotalTeachers').textContent = totalTeachers;
  document.getElementById('statAttendance').textContent = attPct + '%';
  document.getElementById('statRevenue').textContent = fmtMoney(totalRevenue);
  document.getElementById('statPendingFees').textContent = fmtMoney(pendingFees);

  // Charts
  const months = ['Feb','Mar','Apr','May','Jun','Jul'];
  const base = totalRevenue || 42000;
  const revenueSeries = months.map((m,i)=> Math.round(base*(0.55+ i*0.09) + (i%2? 4000:-2000)));
  drawBarChart(document.getElementById('revenueChart'), months, revenueSeries);

  const attSeries = [88, 91, 86, 94, 90, attPct || 92];
  drawLineChart(document.getElementById('attendanceChart'), months, attSeries);

  window.onThemeChange = ()=>{
    drawBarChart(document.getElementById('revenueChart'), months, revenueSeries);
    drawLineChart(document.getElementById('attendanceChart'), months, attSeries);
  };

  // Activity feed
  const activity = DB.get(DB_KEYS.activity, []);
  const feed = document.getElementById('activityFeed');
  feed.innerHTML = activity.slice(0,6).map(a=>`
    <div class="activity-item">
      <div class="dot-ic ic ${a.color}" style="background:var(--${a.color==='violet'?'primary-light':a.color==='green'?'success-bg':a.color==='teal'?'teacher-accent-light':'warning-bg'});color:var(--${a.color==='violet'?'primary':a.color==='green'?'success':a.color==='teal'?'teacher-accent':'warning'});">
        <i class="fa-solid ${a.icon}"></i>
      </div>
      <div class="body"><div class="t">${esc(a.text)}</div><div class="d">${timeAgo(a.time)}</div></div>
    </div>`).join('') || emptyStateHtml('fa-chart-simple','No activity yet','Actions across the platform will appear here.');
}

/* ============================================================ TEACHER DASHBOARD */
function initTeacherDashboard(user){
  const students = DB.get(DB_KEYS.students, []);
  const batches = DB.get(DB_KEYS.batches, []);
  const myBatches = batches.filter(b=>b.teacherId===user.id);
  const myStudentIds = new Set(myBatches.flatMap(b=>b.students));
  const attendance = DB.get(DB_KEYS.attendance, []);
  const today = new Date().toISOString().slice(0,10);
  const results = DB.get(DB_KEYS.results, []);

  document.getElementById('statMyStudents').textContent = myStudentIds.size;
  document.getElementById('statTodayClasses').textContent = myBatches.length;
  document.getElementById('statAttMarked').textContent = attendance.filter(a=>a.date===today && myStudentIds.has(a.studentId)).length;
  document.getElementById('statPendingTasks').textContent = Math.max(0, myStudentIds.size - results.filter(r=>myStudentIds.has(r.studentId)).length);

  const feed = document.getElementById('activityFeed');
  const activity = DB.get(DB_KEYS.activity, []).filter(a=> true).slice(0,5);
  feed.innerHTML = activity.map(a=>`
    <div class="activity-item">
      <div class="dot-ic ic ${a.color}" style="background:var(--primary-light);color:var(--primary);"><i class="fa-solid ${a.icon}"></i></div>
      <div class="body"><div class="t">${esc(a.text)}</div><div class="d">${timeAgo(a.time)}</div></div>
    </div>`).join('') || emptyStateHtml('fa-chart-simple','No activity yet','Your recent actions will show up here.');
}

function emptyStateHtml(icon,title,desc){
  return `<div class="empty-state"><div class="ic"><i class="fa-solid ${icon}"></i></div><div class="t">${title}</div><div class="d">${desc}</div></div>`;
}

/* ============================================================ STUDENTS */
function initStudentsPage(user){
  const isAdmin = user.role === 'admin';
  let students = DB.get(DB_KEYS.students, []);
  const batches = DB.get(DB_KEYS.batches, []);
  const teachers = DB.get(DB_KEYS.teachers, []);

  function myBatchIds(){ return batches.filter(b=>b.teacherId===user.id).map(b=>b.id); }
  function visibleStudents(){
    students = DB.get(DB_KEYS.students, []);
    return isAdmin ? students : students.filter(s=> myBatchIds().includes(s.batch));
  }
  function batchName(id){ const b = batches.find(x=>x.id===id); return b? b.name : '—'; }

  let search = '';
  let batchFilter = 'all';

  const tbody = document.getElementById('studentsTbody');
  const emptyEl = document.getElementById('studentsEmpty');
  const countEl = document.getElementById('studentsCount');

  function render(){
    let list = visibleStudents();
    if(batchFilter !== 'all') list = list.filter(s=>s.batch===batchFilter);
    if(search) list = list.filter(s=> s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));

    countEl.textContent = list.length + (list.length===1?' student':' students');
    if(!list.length){
      tbody.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    emptyEl.style.display = 'none';
    tbody.innerHTML = list.map(s=>{
      const initials = Auth.initials(s.name);
      return `
      <tr data-id="${s.id}">
        <td><div class="cell-name"><div class="mini-avatar">${initials}</div><div><div style="font-weight:600;">${esc(s.name)}</div><div class="text-faint" style="font-size:11.5px;">${s.id}</div></div></div></td>
        <td class="mono">${esc(s.phone)}</td>
        <td>${esc(batchName(s.batch))}</td>
        <td class="mono">${fmtMoney(s.fees)}</td>
        <td><span class="badge ${s.status==='Active'?'green':'gray'}"><i class="fa-solid fa-circle"></i>${s.status}</span></td>
        ${isAdmin? `<td>
          <div class="row-actions">
            <button class="btn-icon btn-sm edit-student" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon btn-sm del-student" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>` : ''}
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.edit-student').forEach(btn=>{
      btn.addEventListener('click', (e)=> openStudentModal(e.target.closest('tr').dataset.id));
    });
    tbody.querySelectorAll('.del-student').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = e.target.closest('tr').dataset.id;
        if(confirm('Remove this student? This cannot be undone.')){
          let all = DB.get(DB_KEYS.students, []);
          all = all.filter(s=>s.id!==id);
          DB.set(DB_KEYS.students, all);
          let allBatches = DB.get(DB_KEYS.batches, []);
          allBatches.forEach(b=> b.students = b.students.filter(sid=>sid!==id));
          DB.set(DB_KEYS.batches, allBatches);
          toast('success','Student removed');
          render();
        }
      });
    });
  }

  // Batch filter dropdown population
  const batchFilterSel = document.getElementById('batchFilterSel');
  if(batchFilterSel){
    const opts = isAdmin ? batches : batches.filter(b=>myBatchIds().includes(b.id));
    batchFilterSel.innerHTML = '<option value="all">All batches</option>' + opts.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
    batchFilterSel.addEventListener('change', e=>{ batchFilter = e.target.value; render(); });
  }

  document.getElementById('studentSearch').addEventListener('input', e=>{ search = e.target.value; render(); });
  window.onGlobalSearch = (v)=>{ document.getElementById('studentSearch').value = v; search=v; render(); };

  if(isAdmin){
    document.getElementById('addStudentBtn').addEventListener('click', ()=> openStudentModal(null));
    const batchSel = document.getElementById('studentBatch');
    batchSel.innerHTML = batches.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');

    document.getElementById('studentForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const id = document.getElementById('studentFormId').value;
      const data = {
        name: document.getElementById('studentName').value.trim(),
        phone: document.getElementById('studentPhone').value.trim(),
        batch: document.getElementById('studentBatch').value,
        fees: Number(document.getElementById('studentFees').value || 0),
        status: document.getElementById('studentStatus').value
      };
      if(!data.name || !data.phone){ toast('error','Missing details','Name and phone are required.'); return; }

      let all = DB.get(DB_KEYS.students, []);
      let allBatches = DB.get(DB_KEYS.batches, []);
      if(id){
        const idx = all.findIndex(s=>s.id===id);
        const oldBatch = all[idx].batch;
        all[idx] = { ...all[idx], ...data };
        if(oldBatch !== data.batch){
          allBatches.forEach(b=>{
            if(b.id===oldBatch) b.students = b.students.filter(sid=>sid!==id);
            if(b.id===data.batch && !b.students.includes(id)) b.students.push(id);
          });
        }
        toast('success','Student updated', data.name);
      }else{
        const newS = { id: DB.uid('s'), ...data };
        all.push(newS);
        allBatches.forEach(b=>{ if(b.id===data.batch) b.students.push(newS.id); });
        logActivity('fa-user-plus','violet', `New student ${data.name} enrolled`);
        toast('success','Student added', data.name);
      }
      DB.set(DB_KEYS.students, all);
      DB.set(DB_KEYS.batches, allBatches);
      closeModal('studentModal');
      render();
    });
  }

  function openStudentModal(id){
    document.getElementById('studentModalTitle').textContent = id ? 'Edit Student' : 'Add Student';
    document.getElementById('studentFormId').value = id || '';
    if(id){
      const s = students.find(x=>x.id===id);
      document.getElementById('studentName').value = s.name;
      document.getElementById('studentPhone').value = s.phone;
      document.getElementById('studentBatch').value = s.batch;
      document.getElementById('studentFees').value = s.fees;
      document.getElementById('studentStatus').value = s.status;
    }else{
      document.getElementById('studentForm').reset();
    }
    openModal('studentModal');
  }

  render();
}

/* ============================================================ TEACHERS (admin only) */
function initTeachersPage(user){
  const batches = DB.get(DB_KEYS.batches, []);
  const tbody = document.getElementById('teachersTbody');
  const emptyEl = document.getElementById('teachersEmpty');

  function batchNames(ids){ return ids.map(id=> batches.find(b=>b.id===id)?.name).filter(Boolean); }

  function render(){
    const teachers = DB.get(DB_KEYS.teachers, []);
    if(!teachers.length){ tbody.innerHTML=''; emptyEl.style.display='flex'; return; }
    emptyEl.style.display='none';
    tbody.innerHTML = teachers.map(t=>`
      <tr data-id="${t.id}">
        <td><div class="cell-name"><div class="mini-avatar">${Auth.initials(t.name)}</div><div style="font-weight:600;">${esc(t.name)}</div></div></td>
        <td>${esc(t.email)}</td>
        <td><span class="badge blue">${esc(t.subject)}</span></td>
        <td>${batchNames(t.batches||[]).map(n=>`<span class="badge gray" style="margin-right:4px;">${esc(n)}</span>`).join('') || '<span class="text-faint">Unassigned</span>'}</td>
        <td>
          <div class="row-actions">
            <button class="btn-icon btn-sm edit-teacher"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon btn-sm del-teacher"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.edit-teacher').forEach(btn=> btn.addEventListener('click', e=> openTeacherModal(e.target.closest('tr').dataset.id)));
    tbody.querySelectorAll('.del-teacher').forEach(btn=> btn.addEventListener('click', e=>{
      const id = e.target.closest('tr').dataset.id;
      if(confirm('Remove this teacher?')){
        DB.set(DB_KEYS.teachers, DB.get(DB_KEYS.teachers,[]).filter(t=>t.id!==id));
        const bs = DB.get(DB_KEYS.batches, []); bs.forEach(b=>{ if(b.teacherId===id) b.teacherId=null; }); DB.set(DB_KEYS.batches, bs);
        toast('success','Teacher removed');
        render();
      }
    }));
  }

  document.getElementById('addTeacherBtn').addEventListener('click', ()=> openTeacherModal(null));

  const batchChips = document.getElementById('teacherBatchChips');
  function renderChips(selected){
    batchChips.innerHTML = batches.map(b=>`
      <label><input type="checkbox" value="${b.id}" ${selected.includes(b.id)?'checked':''}> ${esc(b.name)}</label>
    `).join('');
  }

  document.getElementById('teacherForm').addEventListener('submit', e=>{
    e.preventDefault();
    const id = document.getElementById('teacherFormId').value;
    const name = document.getElementById('teacherName').value.trim();
    const email = document.getElementById('teacherEmail').value.trim();
    const subject = document.getElementById('teacherSubject').value.trim();
    const selectedBatches = Array.from(batchChips.querySelectorAll('input:checked')).map(i=>i.value);
    if(!name || !email){ toast('error','Missing details','Name and email are required.'); return; }

    let teachers = DB.get(DB_KEYS.teachers, []);
    let allBatches = DB.get(DB_KEYS.batches, []);
    if(id){
      const idx = teachers.findIndex(t=>t.id===id);
      teachers[idx] = { ...teachers[idx], name, email, subject, batches:selectedBatches };
      allBatches.forEach(b=>{ b.teacherId = selectedBatches.includes(b.id) ? id : (b.teacherId===id? null : b.teacherId); });
      toast('success','Teacher updated', name);
    }else{
      const newId = DB.uid('t');
      teachers.push({ id:newId, name, email, subject, batches:selectedBatches });
      allBatches.forEach(b=>{ if(selectedBatches.includes(b.id)) b.teacherId = newId; });
      logActivity('fa-chalkboard-user','teal', `New teacher ${name} added`);
      toast('success','Teacher added', name);
    }
    DB.set(DB_KEYS.teachers, teachers);
    DB.set(DB_KEYS.batches, allBatches);
    closeModal('teacherModal');
    render();
  });

  function openTeacherModal(id){
    document.getElementById('teacherModalTitle').textContent = id ? 'Edit Teacher' : 'Add Teacher';
    document.getElementById('teacherFormId').value = id || '';
    if(id){
      const t = DB.get(DB_KEYS.teachers,[]).find(x=>x.id===id);
      document.getElementById('teacherName').value = t.name;
      document.getElementById('teacherEmail').value = t.email;
      document.getElementById('teacherSubject').value = t.subject;
      renderChips(t.batches||[]);
    }else{
      document.getElementById('teacherForm').reset();
      renderChips([]);
    }
    openModal('teacherModal');
  }

  window.onGlobalSearch = (v)=>{
    v = v.toLowerCase();
    tbody.querySelectorAll('tr').forEach(tr=>{
      tr.style.display = tr.textContent.toLowerCase().includes(v) ? '' : 'none';
    });
  };

  render();
}

/* ============================================================ ATTENDANCE */
function initAttendancePage(user){
  const isAdmin = user.role === 'admin';
  const batches = DB.get(DB_KEYS.batches, []);
  const visibleBatches = isAdmin ? batches : batches.filter(b=>b.teacherId===user.id);

  const batchSel = document.getElementById('attBatchSelect');
  batchSel.innerHTML = visibleBatches.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
  const dateInput = document.getElementById('attDate');
  dateInput.value = new Date().toISOString().slice(0,10);

  const list = document.getElementById('attList');
  const pctEl = document.getElementById('attPercentLabel');
  const emptyEl = document.getElementById('attEmpty');
  let localMarks = {};

  function loadDay(){
    const batchId = batchSel.value;
    const date = dateInput.value;
    const students = DB.get(DB_KEYS.students, []).filter(s=>s.batch===batchId);
    const saved = DB.get(DB_KEYS.attendance, []).filter(a=>a.batchId===batchId && a.date===date);
    localMarks = {};
    saved.forEach(a=> localMarks[a.studentId] = a.status);
    students.forEach(s=>{ if(!localMarks[s.id]) localMarks[s.id]='Present'; });

    if(!students.length){ list.innerHTML=''; emptyEl.style.display='flex'; pctEl.textContent='—'; return; }
    emptyEl.style.display='none';

    list.innerHTML = students.map(s=>`
      <div class="att-row" data-id="${s.id}">
        <div class="who"><div class="mini-avatar" style="width:32px;height:32px;">${Auth.initials(s.name)}</div><div style="font-weight:600;font-size:13.5px;">${esc(s.name)}</div></div>
        <div class="att-toggle">
          <button class="present ${localMarks[s.id]==='Present'?'active':''}" data-status="Present">Present</button>
          <button class="absent ${localMarks[s.id]==='Absent'?'active':''}" data-status="Absent">Absent</button>
        </div>
      </div>`).join('');

    updatePct();

    list.querySelectorAll('.att-row').forEach(row=>{
      row.querySelectorAll('button').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          localMarks[row.dataset.id] = btn.dataset.status;
          row.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          updatePct();
        });
      });
    });
  }

  function updatePct(){
    const vals = Object.values(localMarks);
    if(!vals.length){ pctEl.textContent='—'; return; }
    const pct = Math.round((vals.filter(v=>v==='Present').length/vals.length)*100);
    pctEl.textContent = pct + '%';
  }

  batchSel.addEventListener('change', loadDay);
  dateInput.addEventListener('change', loadDay);

  document.getElementById('saveAttendanceBtn').addEventListener('click', ()=>{
    const batchId = batchSel.value, date = dateInput.value;
    if(!batchId){ toast('error','No batch','Select a batch first.'); return; }
    let all = DB.get(DB_KEYS.attendance, []);
    all = all.filter(a=>!(a.batchId===batchId && a.date===date));
    Object.entries(localMarks).forEach(([studentId,status])=>{
      all.push({ studentId, batchId, date, status });
    });
    DB.set(DB_KEYS.attendance, all);
    logActivity('fa-clipboard-check','teal', `Attendance marked for ${batches.find(b=>b.id===batchId)?.name || 'a batch'}`);
    toast('success','Attendance saved', `${Object.keys(localMarks).length} students recorded`);
  });

  if(visibleBatches.length) loadDay(); else { emptyEl.style.display='flex'; }
}

/* ============================================================ FEES (admin) */
function initFeesPage(user){
  const tbody = document.getElementById('feesTbody');
  const emptyEl = document.getElementById('feesEmpty');
  let statusFilter = 'all';

  function studentName(id){ return DB.get(DB_KEYS.students,[]).find(s=>s.id===id)?.name || 'Unknown'; }
  function statusOf(f){ if(f.paid<=0) return 'Pending'; if(f.paid>=f.total) return 'Paid'; return 'Partial'; }
  function badgeClass(st){ return st==='Paid' ? 'green' : st==='Partial' ? 'amber' : 'red'; }

  function render(){
    let fees = DB.get(DB_KEYS.fees, []);
    fees = fees.map(f=>({ ...f, status: statusOf(f) }));
    if(statusFilter!=='all') fees = fees.filter(f=>f.status===statusFilter);
    const search = (document.getElementById('feeSearch').value||'').toLowerCase();
    if(search) fees = fees.filter(f=> studentName(f.studentId).toLowerCase().includes(search));

    if(!fees.length){ tbody.innerHTML=''; emptyEl.style.display='flex'; return; }
    emptyEl.style.display='none';

    tbody.innerHTML = fees.map(f=>`
      <tr data-id="${f.studentId}">
        <td><div class="cell-name"><div class="mini-avatar">${Auth.initials(studentName(f.studentId))}</div>${esc(studentName(f.studentId))}</div></td>
        <td class="mono">${fmtMoney(f.total)}</td>
        <td class="mono">${fmtMoney(f.paid)}</td>
        <td class="mono">${fmtMoney(f.total-f.paid)}</td>
        <td><span class="badge ${badgeClass(f.status)}"><i class="fa-solid fa-circle"></i>${f.status}</span></td>
        <td><button class="btn btn-sm btn-outline add-payment-btn"><i class="fa-solid fa-plus"></i> Payment</button></td>
      </tr>`).join('');

    tbody.querySelectorAll('.add-payment-btn').forEach(btn=>{
      btn.addEventListener('click', e=> openPaymentModal(e.target.closest('tr').dataset.id));
    });
  }

  document.getElementById('feeStatusFilter').addEventListener('change', e=>{ statusFilter = e.target.value; render(); });
  document.getElementById('feeSearch').addEventListener('input', render);
  window.onGlobalSearch = (v)=>{ document.getElementById('feeSearch').value=v; render(); };

  function openPaymentModal(studentId){
    document.getElementById('paymentStudentId').value = studentId;
    document.getElementById('paymentModalName').textContent = studentName(studentId);
    const f = DB.get(DB_KEYS.fees,[]).find(x=>x.studentId===studentId);
    document.getElementById('paymentModalRemaining').textContent = fmtMoney(f.total-f.paid);
    document.getElementById('paymentAmount').value = '';
    openModal('paymentModal');
  }

  document.getElementById('paymentForm').addEventListener('submit', e=>{
    e.preventDefault();
    const studentId = document.getElementById('paymentStudentId').value;
    const amount = Number(document.getElementById('paymentAmount').value || 0);
    const mode = document.getElementById('paymentMode').value;
    if(amount<=0){ toast('error','Invalid amount'); return; }
    let fees = DB.get(DB_KEYS.fees, []);
    const idx = fees.findIndex(f=>f.studentId===studentId);
    fees[idx].paid = Math.min(fees[idx].total, fees[idx].paid + amount);
    fees[idx].payments = fees[idx].payments || [];
    fees[idx].payments.push({ amount, mode, date:new Date().toISOString().slice(0,10) });
    DB.set(DB_KEYS.fees, fees);
    logActivity('fa-money-bill-wave','green', `Fee payment of ${fmtMoney(amount)} received from ${studentName(studentId)}`);
    toast('success','Payment recorded', fmtMoney(amount) + ' via ' + mode);
    closeModal('paymentModal');
    render();
  });

  render();
}

/* ============================================================ BATCHES (admin) */
function initBatchesPage(user){
  const grid = document.getElementById('batchesGrid');
  const emptyEl = document.getElementById('batchesEmpty');

  function teacherName(id){ return DB.get(DB_KEYS.teachers,[]).find(t=>t.id===id)?.name; }

  function render(){
    const batches = DB.get(DB_KEYS.batches, []);
    if(!batches.length){ grid.innerHTML=''; emptyEl.style.display='flex'; return; }
    emptyEl.style.display='none';
    grid.innerHTML = batches.map(b=>`
      <div class="card card-pad" data-id="${b.id}">
        <div class="spread">
          <div>
            <h3 style="font-size:15px;">${esc(b.name)}</h3>
            <p class="text-soft" style="font-size:12.5px;margin-top:3px;">${esc(b.subject)} · ${esc(b.timing)}</p>
          </div>
          <div class="row-actions">
            <button class="btn-icon btn-sm edit-batch"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon btn-sm del-batch"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="mt-14" style="display:flex;align-items:center;justify-content:space-between;">
          <span class="badge blue"><i class="fa-solid fa-user-group"></i> ${b.students.length} students</span>
          <span class="badge ${b.teacherId? 'green':'gray'}">${b.teacherId ? esc(teacherName(b.teacherId)||'Assigned') : 'No teacher'}</span>
        </div>
      </div>`).join('');

    grid.querySelectorAll('.edit-batch').forEach(btn=> btn.addEventListener('click', e=> openBatchModal(e.target.closest('[data-id]').dataset.id)));
    grid.querySelectorAll('.del-batch').forEach(btn=> btn.addEventListener('click', e=>{
      const id = e.target.closest('[data-id]').dataset.id;
      if(confirm('Delete this batch? Students in it will remain but lose their batch link.')){
        DB.set(DB_KEYS.batches, DB.get(DB_KEYS.batches,[]).filter(b=>b.id!==id));
        toast('success','Batch deleted');
        render();
      }
    }));
  }

  document.getElementById('addBatchBtn').addEventListener('click', ()=> openBatchModal(null));

  const teacherSel = document.getElementById('batchTeacher');
  teacherSel.innerHTML = '<option value="">Unassigned</option>' + DB.get(DB_KEYS.teachers,[]).map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');

  const studentChips = document.getElementById('batchStudentChips');
  function renderStudentChips(selected){
    const students = DB.get(DB_KEYS.students, []);
    studentChips.innerHTML = students.map(s=>`<label><input type="checkbox" value="${s.id}" ${selected.includes(s.id)?'checked':''}> ${esc(s.name)}</label>`).join('');
  }

  document.getElementById('batchForm').addEventListener('submit', e=>{
    e.preventDefault();
    const id = document.getElementById('batchFormId').value;
    const name = document.getElementById('batchName').value.trim();
    const subject = document.getElementById('batchSubject').value.trim();
    const timing = document.getElementById('batchTiming').value.trim();
    const teacherId = teacherSel.value || null;
    const selectedStudents = Array.from(studentChips.querySelectorAll('input:checked')).map(i=>i.value);
    if(!name || !subject || !timing){ toast('error','Missing details'); return; }

    let batches = DB.get(DB_KEYS.batches, []);
    if(id){
      const idx = batches.findIndex(b=>b.id===id);
      batches[idx] = { ...batches[idx], name, subject, timing, teacherId, students:selectedStudents };
      toast('success','Batch updated', name);
    }else{
      batches.push({ id: DB.uid('b'), name, subject, timing, teacherId, students:selectedStudents });
      logActivity('fa-layer-group','violet', `New batch "${name}" created`);
      toast('success','Batch created', name);
    }
    DB.set(DB_KEYS.batches, batches);
    closeModal('batchModal');
    render();
  });

  function openBatchModal(id){
    document.getElementById('batchModalTitle').textContent = id ? 'Edit Batch' : 'Create Batch';
    document.getElementById('batchFormId').value = id || '';
    if(id){
      const b = DB.get(DB_KEYS.batches,[]).find(x=>x.id===id);
      document.getElementById('batchName').value = b.name;
      document.getElementById('batchSubject').value = b.subject;
      document.getElementById('batchTiming').value = b.timing;
      teacherSel.value = b.teacherId || '';
      renderStudentChips(b.students||[]);
    }else{
      document.getElementById('batchForm').reset();
      renderStudentChips([]);
    }
    openModal('batchModal');
  }

  render();
}

/* ============================================================ RESULTS */
function initResultsPage(user){
  const isAdmin = user.role === 'admin';
  const batches = DB.get(DB_KEYS.batches, []);
  const visibleBatches = isAdmin ? batches : batches.filter(b=>b.teacherId===user.id);

  const batchSel = document.getElementById('resultBatchSelect');
  batchSel.innerHTML = visibleBatches.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');

  const tbody = document.getElementById('resultsTbody');
  const emptyEl = document.getElementById('resultsEmpty');

  function render(){
    const batchId = batchSel.value;
    const students = DB.get(DB_KEYS.students, []).filter(s=>s.batch===batchId);
    const results = DB.get(DB_KEYS.results, []);
    if(!students.length){ tbody.innerHTML=''; emptyEl.style.display='flex'; return; }
    emptyEl.style.display='none';
    tbody.innerHTML = students.map(s=>{
      const r = results.find(x=>x.studentId===s.id && x.batchId===batchId);
      const marks = r? r.marks : '';
      const grade = r ? gradeFor(r.marks) : '—';
      return `
      <tr data-id="${s.id}">
        <td><div class="cell-name"><div class="mini-avatar">${Auth.initials(s.name)}</div>${esc(s.name)}</div></td>
        <td><input type="number" min="0" max="100" class="marks-input" style="width:90px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);background:var(--card);color:var(--text);" value="${marks}" placeholder="0-100"></td>
        <td><span class="badge ${grade==='A'?'green':grade==='B'?'blue':grade==='C'?'amber':grade==='—'?'gray':'red'}">${grade}</span></td>
      </tr>`;
    }).join('');
  }

  batchSel.addEventListener('change', render);

  document.getElementById('saveResultsBtn').addEventListener('click', ()=>{
    const batchId = batchSel.value;
    let results = DB.get(DB_KEYS.results, []);
    let count = 0;
    tbody.querySelectorAll('tr').forEach(tr=>{
      const studentId = tr.dataset.id;
      const val = tr.querySelector('.marks-input').value;
      if(val === '') return;
      const marks = Math.max(0, Math.min(100, Number(val)));
      const idx = results.findIndex(r=>r.studentId===studentId && r.batchId===batchId);
      if(idx>-1) results[idx].marks = marks; else results.push({ studentId, batchId, marks });
      count++;
    });
    DB.set(DB_KEYS.results, results);
    logActivity('fa-chart-line','violet', `Results updated for ${batches.find(b=>b.id===batchId)?.name || 'a batch'}`);
    toast('success','Results saved', `${count} entries updated`);
    render();
  });

  function gradeFor(m){ if(m>=85) return 'A'; if(m>=70) return 'B'; if(m>=50) return 'C'; return 'D'; }

  if(visibleBatches.length) render(); else emptyEl.style.display='flex';
}

/* ============================================================ NOTIFICATIONS */
function initNotificationsPage(user){
  const isAdmin = user.role === 'admin';
  const batches = DB.get(DB_KEYS.batches, []);
  const visibleBatches = isAdmin ? batches : batches.filter(b=>b.teacherId===user.id);

  const targetSel = document.getElementById('notifTarget');
  targetSel.innerHTML = `<option value="all">All students</option>` + visibleBatches.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');

  const list = document.getElementById('notifHistory');
  function render(){
    const notifs = DB.get(DB_KEYS.notifications, []).slice().reverse();
    list.innerHTML = notifs.length ? notifs.map(n=>`
      <div class="activity-item">
        <div class="dot-ic ic" style="background:var(--primary-light);color:var(--primary);"><i class="fa-solid fa-paper-plane"></i></div>
        <div class="body"><div class="t">${esc(n.message)}</div><div class="d">To: ${esc(n.target)} · ${timeAgo(n.date)}</div></div>
      </div>`).join('') : emptyStateHtml('fa-bullhorn','No notifications sent yet','Reminders and messages you send will be logged here.');
  }

  document.getElementById('notifForm').addEventListener('submit', e=>{
    e.preventDefault();
    const message = document.getElementById('notifMessage').value.trim();
    const targetId = targetSel.value;
    const targetLabel = targetId==='all' ? 'All Students' : (batches.find(b=>b.id===targetId)?.name || 'Batch');
    if(!message){ toast('error','Write a message first'); return; }
    let notifs = DB.get(DB_KEYS.notifications, []);
    notifs.push({ id:DB.uid('n'), message, target:targetLabel, date:new Date().toISOString() });
    DB.set(DB_KEYS.notifications, notifs);
    logActivity('fa-bullhorn','amber', `Reminder sent to ${targetLabel}`);
    toast('success','Notification sent', `Delivered to ${targetLabel}`);
    document.getElementById('notifMessage').value = '';
    render();
  });

  render();
}

/* ============================================================ SETTINGS */
function initSettingsPage(user){
  const settings = DB.get(DB_KEYS.settings, { instituteName:'Brightline Academy' });
  document.getElementById('instituteName').value = settings.instituteName || '';
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;

  document.querySelectorAll('.settings-nav button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.settings-nav button').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-'+btn.dataset.panel).classList.add('active');
    });
  });

  document.getElementById('instituteForm').addEventListener('submit', e=>{
    e.preventDefault();
    const s = DB.get(DB_KEYS.settings, {});
    s.instituteName = document.getElementById('instituteName').value.trim();
    DB.set(DB_KEYS.settings, s);
    toast('success','Institute settings saved');
  });

  document.getElementById('profileForm').addEventListener('submit', e=>{
    e.preventDefault();
    let users = DB.get(DB_KEYS.users, []);
    const idx = users.findIndex(u=>u.id===user.id);
    if(idx>-1){
      users[idx].name = document.getElementById('profileName').value.trim();
      DB.set(DB_KEYS.users, users);
      const session = DB.get(DB_KEYS.session, {});
      session.name = users[idx].name;
      DB.set(DB_KEYS.session, session);
    }
    toast('success','Profile updated');
    setTimeout(()=>location.reload(), 600);
  });

  const logoInput = document.getElementById('logoUpload');
  logoInput.addEventListener('change', ()=>{
    if(logoInput.files.length) toast('info','Logo selected', logoInput.files[0].name + ' (UI preview only)');
  });

  document.querySelectorAll('input[name="themePref"]').forEach(r=>{
    r.checked = r.value === (localStorage.getItem(DB_KEYS.theme) || 'light');
    r.addEventListener('change', ()=>{
      if(r.checked){
        document.documentElement.setAttribute('data-theme', r.value);
        localStorage.setItem(DB_KEYS.theme, r.value);
        const icon = document.querySelector('#themeToggle i');
        if(icon) icon.className = r.value==='dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
    });
  });

  document.getElementById('exportDataBtn').addEventListener('click', ()=>{
    toast('info','Export started', 'This demo does not persist exports — connect a backend to enable this.');
  });
}
