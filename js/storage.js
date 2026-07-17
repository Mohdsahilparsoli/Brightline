/* ==========================================================================
   STORAGE.JS — localStorage data layer
   All app data lives under these keys. This file seeds demo data on first
   run and exposes small CRUD helpers used across every page.
   ========================================================================== */

const DB_KEYS = {
  users: 'brl_users',
  session: 'brl_session',
  students: 'brl_students',
  teachers: 'brl_teachers',
  attendance: 'brl_attendance',
  fees: 'brl_fees',
  batches: 'brl_batches',
  results: 'brl_results',
  notifications: 'brl_notifications',
  activity: 'brl_activity',
  settings: 'brl_settings',
  theme: 'brl_theme'
};

const DB = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (fallback !== undefined ? fallback : null);
    }catch(e){ return fallback !== undefined ? fallback : null; }
  },
  set(key, value){ localStorage.setItem(key, JSON.stringify(value)); },
  uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }
};

function seedDatabase(){
  if(!localStorage.getItem(DB_KEYS.users)){
    DB.set(DB_KEYS.users, [
      { id:'u_admin', name:'Ananya Verma', email:'admin@demo.com', password:'123456', role:'admin' },
      { id:'u_teacher', name:'Rohit Sharma', email:'teacher@demo.com', password:'123456', role:'teacher', subject:'Physics' }
    ]);
  }

  if(!localStorage.getItem(DB_KEYS.teachers)){
    DB.set(DB_KEYS.teachers, [
      { id:'u_teacher', name:'Rohit Sharma', email:'teacher@demo.com', subject:'Physics', batches:['b1','b2'] },
      { id:DB.uid('t'), name:'Kavita Nair', email:'kavita.nair@demo.com', subject:'Chemistry', batches:['b2'] },
      { id:DB.uid('t'), name:'Sameer Khan', email:'sameer.khan@demo.com', subject:'Mathematics', batches:['b1','b3'] },
      { id:DB.uid('t'), name:'Priya Iyer', email:'priya.iyer@demo.com', subject:'English', batches:['b3'] }
    ]);
  }

  if(!localStorage.getItem(DB_KEYS.batches)){
    DB.set(DB_KEYS.batches, [
      { id:'b1', name:'NEET Morning', subject:'Physics', timing:'7:00 AM - 9:00 AM', teacherId:'u_teacher', students:[] },
      { id:'b2', name:'JEE Evening', subject:'Chemistry', timing:'5:00 PM - 7:00 PM', teacherId:null, students:[] },
      { id:'b3', name:'Foundation Batch', subject:'Mathematics', timing:'3:00 PM - 4:30 PM', teacherId:null, students:[] }
    ]);
  }

  if(!localStorage.getItem(DB_KEYS.students)){
    const names = ['Aarav Mehta','Isha Kapoor','Vivaan Joshi','Diya Reddy','Aditya Singh','Ananya Gupta','Kabir Malhotra','Myra Chawla','Reyansh Rao','Saanvi Pillai','Vihaan Das','Anika Bose'];
    const batches = ['b1','b2','b3'];
    const students = names.map((n,i)=>({
      id: DB.uid('s'),
      name:n,
      phone:'98' + (10000000+i*137).toString().slice(0,8),
      batch: batches[i % batches.length],
      fees: [8000,10000,12000][i%3],
      status: ['Active','Active','Active','Inactive'][i%4]
    }));
    DB.set(DB_KEYS.students, students);
    const b = DB.get(DB_KEYS.batches, []);
    b.forEach(batch=>{ batch.students = students.filter(s=>s.batch===batch.id).map(s=>s.id); });
    DB.set(DB_KEYS.batches, b);
  }

  if(!localStorage.getItem(DB_KEYS.fees)){
    const students = DB.get(DB_KEYS.students, []);
    DB.set(DB_KEYS.fees, students.map(s=>{
      const paid = s.status==='Inactive' ? 0 : [s.fees, Math.round(s.fees*0.5), 0][DB.get(DB_KEYS.students,[]).indexOf(s)%3];
      return { studentId:s.id, total:s.fees, paid: paid, payments: paid>0 ? [{amount:paid, date: new Date().toISOString().slice(0,10), mode:'Cash'}] : [] };
    }));
  }

  if(!localStorage.getItem(DB_KEYS.attendance)){
    DB.set(DB_KEYS.attendance, []);
  }

  if(!localStorage.getItem(DB_KEYS.results)){
    DB.set(DB_KEYS.results, []);
  }

  if(!localStorage.getItem(DB_KEYS.notifications)){
    DB.set(DB_KEYS.notifications, [
      { id:DB.uid('n'), message:'Fee reminder sent to NEET Morning batch', target:'NEET Morning', date:new Date(Date.now()-86400000).toISOString() },
      { id:DB.uid('n'), message:'Result uploaded for Foundation Batch', target:'Foundation Batch', date:new Date(Date.now()-3600000*5).toISOString() }
    ]);
  }

  if(!localStorage.getItem(DB_KEYS.activity)){
    DB.set(DB_KEYS.activity, [
      { icon:'fa-user-plus', color:'violet', text:'New student Aarav Mehta enrolled in NEET Morning', time:new Date(Date.now()-3600000*2).toISOString() },
      { icon:'fa-money-bill-wave', color:'green', text:'Fee payment of ₹6,000 received from Isha Kapoor', time:new Date(Date.now()-3600000*6).toISOString() },
      { icon:'fa-clipboard-check', color:'teal', text:'Attendance marked for Foundation Batch', time:new Date(Date.now()-3600000*9).toISOString() },
      { icon:'fa-bullhorn', color:'amber', text:'Reminder notification sent to JEE Evening batch', time:new Date(Date.now()-3600000*20).toISOString() }
    ]);
  }

  if(!localStorage.getItem(DB_KEYS.settings)){
    DB.set(DB_KEYS.settings, { instituteName:'Brightline Academy', logo:null });
  }
}

function logActivity(icon, color, text){
  const a = DB.get(DB_KEYS.activity, []);
  a.unshift({ icon, color, text, time:new Date().toISOString() });
  DB.set(DB_KEYS.activity, a.slice(0,20));
}

function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff/60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs/24);
  return days + 'd ago';
}

seedDatabase();
