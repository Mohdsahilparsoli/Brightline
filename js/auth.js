/* ==========================================================================
   AUTH.JS — login, signup, session management, route guards
   ========================================================================== */

const Auth = {
  currentUser(){ return DB.get(DB_KEYS.session, null); },

  login(email, password, role){
    const users = DB.get(DB_KEYS.users, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
    if(!user) return { ok:false, message:'Invalid email, password or role.' };
    const session = { id:user.id, name:user.name, email:user.email, role:user.role };
    DB.set(DB_KEYS.session, session);
    return { ok:true, user:session };
  },

  signup({name, email, password, role}){
    const users = DB.get(DB_KEYS.users, []);
    if(users.some(u => u.email.toLowerCase() === email.toLowerCase())){
      return { ok:false, message:'An account with this email already exists.' };
    }
    const user = { id: DB.uid('u'), name, email, password, role };
    users.push(user);
    DB.set(DB_KEYS.users, users);

    if(role === 'teacher'){
      const teachers = DB.get(DB_KEYS.teachers, []);
      teachers.push({ id:user.id, name, email, subject:'General', batches:[] });
      DB.set(DB_KEYS.teachers, teachers);
    }
    return { ok:true };
  },

  logout(){
    localStorage.removeItem(DB_KEYS.session);
    window.location.href = 'index.html';
  },

  /* Call at the top of every protected page. requiredRole = 'admin' | 'teacher' | null (any logged-in role) */
  guard(requiredRole){
    const user = this.currentUser();
    if(!user){ window.location.href = 'index.html'; return null; }
    if(requiredRole && user.role !== requiredRole){
      window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'teacher-dashboard.html';
      return null;
    }
    return user;
  },

  initials(name){
    return name.split(' ').filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('');
  }
};
