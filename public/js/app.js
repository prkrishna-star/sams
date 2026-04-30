const API_BASE='';
let currentUser=null;
let authToken=localStorage.getItem('attendEase_token');

async function api(endpoint,options={}){
    const url=API_BASE+endpoint;
    const headers={'Content-Type':'application/json'};
    if(authToken) headers['Authorization']='Bearer '+authToken;
    const config={...options,headers:{...headers,...options.headers}};
    try{
        const response=await fetch(url,config);
        const data=await response.json();
        if(!response.ok) throw new Error(data.message||'Something went wrong');
        return data;
    }catch(error){
        if(error.message==='Invalid or expired token.'||error.message==='Access denied. No token provided.') logout();
        throw error;
    }
}

function showToast(message,type='info'){
    const container=document.getElementById('toast-container');
    const icons={success:'fa-check-circle',error:'fa-times-circle',warning:'fa-exclamation-circle',info:'fa-info-circle'};
    const toast=document.createElement('div');
    toast.className=`toast toast-${type}`;
    toast.innerHTML=`<i class="fas ${icons[type]} toast-icon"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(()=>{toast.classList.add('removing');setTimeout(()=>toast.remove(),300);},3500);
}

function showLoading(){document.getElementById('loading-overlay').classList.remove('hidden')}
function hideLoading(){document.getElementById('loading-overlay').classList.add('hidden')}

// ========== PARTICLE CANVAS ==========
function initParticles(){
    const canvas=document.getElementById('particle-canvas');
    if(!canvas) return;
    const ctx=canvas.getContext('2d');
    let w,h,particles=[];
    function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
    resize();
    window.addEventListener('resize',resize);
    const count=Math.min(60,Math.floor(w*h/18000));
    for(let i=0;i<count;i++){
        particles.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.5+.5,dx:(Math.random()-.5)*.3,dy:(Math.random()-.5)*.3,o:Math.random()*.4+.1});
    }
    function draw(){
        ctx.clearRect(0,0,w,h);
        const isDark=document.documentElement.getAttribute('data-theme')!=='light';
        particles.forEach(p=>{
            p.x+=p.dx;p.y+=p.dy;
            if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;
            ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
            ctx.fillStyle=isDark?`rgba(0,240,255,${p.o})`:`rgba(100,100,200,${p.o*.5})`;
            ctx.fill();
        });
        // Draw connections
        for(let i=0;i<particles.length;i++){
            for(let j=i+1;j<particles.length;j++){
                const dx=particles[i].x-particles[j].x;
                const dy=particles[i].y-particles[j].y;
                const dist=Math.sqrt(dx*dx+dy*dy);
                if(dist<120){
                    ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);
                    ctx.strokeStyle=isDark?`rgba(0,240,255,${.06*(1-dist/120)})`:`rgba(100,100,200,${.04*(1-dist/120)})`;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// ========== THEME ==========
function initTheme(){
    const saved=localStorage.getItem('attendEase_theme')||'dark';
    document.documentElement.setAttribute('data-theme',saved);
    updateThemeIcon(saved);
}
function toggleTheme(){
    const current=document.documentElement.getAttribute('data-theme');
    const next=current==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    localStorage.setItem('attendEase_theme',next);
    updateThemeIcon(next);
    showToast(`Switched to ${next} mode`,'info');
}
function updateThemeIcon(theme){
    const icon=document.getElementById('theme-icon');
    if(icon) icon.className=theme==='dark'?'fas fa-sun':'fas fa-moon';
}

// ========== AUTH ==========
async function login(email,password){
    const data=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});
    authToken=data.token;currentUser=data.user;
    localStorage.setItem('attendEase_token',authToken);
    return data;
}
async function fetchCurrentUser(){
    try{const user=await api('/api/auth/me');currentUser=user;return user;}catch{return null;}
}
function logout(){
    authToken=null;currentUser=null;localStorage.removeItem('attendEase_token');
    const loginPage = document.getElementById('login-page');
    const dashPage = document.getElementById('dashboard-page');
    if(loginPage) loginPage.classList.add('active');
    if(dashPage) dashPage.classList.remove('active');
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    if(emailEl) emailEl.value='';
    if(passEl) passEl.value='';
    showToast('Logged out','info');
}
async function changePassword(e){
    e.preventDefault();
    const cur=document.getElementById('cp-current').value;
    const np=document.getElementById('cp-new').value;
    const cf=document.getElementById('cp-confirm').value;
    if(np!==cf){showToast('New passwords do not match','error');return}
    try{showLoading();await api('/api/auth/change-password',{method:'PUT',body:JSON.stringify({currentPassword:cur,newPassword:np})});hideLoading();closeModal('modal-change-password');showToast('Password changed','success');e.target.reset();}
    catch(error){hideLoading();showToast(error.message,'error');}
}

function togglePasswordVisibility(inputId,btn){
    const input=document.getElementById(inputId);const icon=btn.querySelector('i');
    if(input.type==='password'){input.type='text';icon.className='fas fa-eye-slash';}
    else{input.type='password';icon.className='fas fa-eye';}
}

// ========== NAVIGATION ==========
function setupNavigation(){
    const nav=document.getElementById('sidebar-nav');
    let items=[];
    if(currentUser.role==='admin'){
        items=[{id:'nav-dash',icon:'fas fa-th-large',label:'Dashboard',sec:'admin-dashboard'},{id:'nav-dept',icon:'fas fa-building',label:'Departments',sec:'admin-departments'},{id:'nav-cls',icon:'fas fa-chalkboard',label:'Classes',sec:'admin-classes'},{id:'nav-sub',icon:'fas fa-book',label:'Subjects',sec:'admin-subjects'},{id:'nav-tch',icon:'fas fa-chalkboard-teacher',label:'Teachers',sec:'admin-teachers'},{id:'nav-stu',icon:'fas fa-user-graduate',label:'Students',sec:'admin-students'},{divider:true},{id:'nav-rep',icon:'fas fa-chart-bar',label:'Reports',sec:'reports-page'}];
    }else if(currentUser.role==='teacher'){
        items=[{id:'nav-dash',icon:'fas fa-th-large',label:'Dashboard',sec:'teacher-dashboard'},{id:'nav-att',icon:'fas fa-clipboard-check',label:'Mark Attendance',sec:'attendance-marking'},{id:'nav-rep',icon:'fas fa-chart-bar',label:'Reports',sec:'reports-page'}];
    }else{
        items=[{id:'nav-dash',icon:'fas fa-th-large',label:'Dashboard',sec:'student-dashboard'}];
    }
    nav.innerHTML=items.map(i=>i.divider?'<div class="nav-divider"></div>':`<button class="nav-item" id="${i.id}" onclick="navigateTo('${i.sec}','${i.id}')"><i class="${i.icon}"></i><span>${i.label}</span></button>`).join('');
}

function navigateTo(sectionId,navId){
    document.querySelectorAll('.content-section').forEach(s=>s.classList.add('hidden'));
    const target=document.getElementById(sectionId);
    if(target){target.classList.remove('hidden');target.style.animation='none';target.offsetHeight;target.style.animation='';}
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    if(navId) document.getElementById(navId)?.classList.add('active');
    const titles={'admin-dashboard':'Dashboard','admin-departments':'Departments','admin-classes':'Classes','admin-subjects':'Subjects','admin-teachers':'Teachers','admin-students':'Students','teacher-dashboard':'Dashboard','attendance-marking':'Mark Attendance','reports-page':'Reports','student-dashboard':'My Attendance'};
    document.getElementById('page-title').textContent=titles[sectionId]||'Dashboard';
    loadSectionData(sectionId);
    if(window.innerWidth<=768) closeSidebar();
}

function loadSectionData(sectionId){
    const map={'admin-dashboard':loadAdminDashboard,'admin-departments':loadDepartments,'admin-classes':loadClasses,'admin-subjects':loadSubjects,'admin-teachers':loadTeachers,'admin-students':loadStudents,'teacher-dashboard':loadTeacherDashboard,'attendance-marking':initAttendanceMarking,'reports-page':initReportsPage,'student-dashboard':loadStudentDashboard};
    if(map[sectionId]) map[sectionId]();
}

// ========== SIDEBAR ==========
function toggleSidebar(){
    const sb=document.getElementById('sidebar');sb.classList.toggle('open');
    let ov=document.querySelector('.sidebar-overlay');
    if(!ov){ov=document.createElement('div');ov.className='sidebar-overlay';ov.onclick=closeSidebar;document.body.appendChild(ov);}
    ov.classList.toggle('active',sb.classList.contains('open'));
}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.querySelector('.sidebar-overlay')?.classList.remove('active');}

// ========== PROFILE ==========
function toggleProfileMenu(){document.getElementById('profile-dropdown').classList.toggle('hidden')}
document.addEventListener('click',e=>{const p=document.querySelector('.user-profile');const d=document.getElementById('profile-dropdown');if(p&&!p.contains(e.target)) d?.classList.add('hidden');});

// ========== MODALS ==========
function openModal(id){
    let modalEl = document.getElementById(id);
    if (!modalEl) {
        console.warn(`openModal: Element "${id}" not found yet.`);
        return; 
    }
    modalEl.classList.remove('hidden');
}

function closeModal(id){
    const modalEl = document.getElementById(id);
    if (modalEl) {
        modalEl.classList.add('hidden');
    }
}
// FIX: Made closeModal synchronous but safe against null
function closeModal(id){
    const modalEl = document.getElementById(id);
    if (modalEl) {
        modalEl.classList.add('hidden');
    }
}

function openChangePasswordModal(){document.getElementById('profile-dropdown')?.classList.add('hidden');document.getElementById('cp-current').value='';document.getElementById('cp-new').value='';document.getElementById('cp-confirm').value='';openModal('modal-change-password');}

let confirmCallback=null;
function showConfirm(message,callback){
    document.getElementById('confirm-message').textContent=message;
    confirmCallback=callback;
    document.getElementById('confirm-action-btn').onclick=()=>{closeModal('modal-confirm');if(confirmCallback) confirmCallback();};
    openModal('modal-confirm');
}

function setupUserProfile(){
    if(!currentUser) return;
    document.getElementById('user-avatar').textContent=currentUser.name.charAt(0).toUpperCase();
    document.getElementById('user-name').textContent=currentUser.name;
    document.getElementById('user-role').textContent={admin:'Administrator',teacher:'Faculty',student:'Student'}[currentUser.role]||currentUser.role;
}

function formatDate(d){const dt=new Date(d);return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function getTodayDate(){return new Date().toISOString().split('T')[0]}
function animateCounter(el,target){let cur=0;const inc=Math.max(1,Math.ceil(target/35));
    const t=setInterval(()=>{cur+=inc;if(cur>=target){cur=target;clearInterval(t)}el.textContent=cur;},25);}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded',async()=>{
    initTheme();initParticles();
    document.getElementById('login-form').addEventListener('submit',async(e)=>{
        e.preventDefault();
        const email=document.getElementById('login-email').value.trim();
        const password=document.getElementById('login-password').value;
        if(!email||!password){showToast('Please fill in all fields','warning');return}
        const btn=e.target.querySelector('button[type="submit"]');
        btn.querySelector('.btn-text').classList.add('hidden');btn.querySelector('.btn-loader').classList.remove('hidden');btn.disabled=true;
        try{
            await login(email,password);
            btn.querySelector('.btn-text').classList.remove('hidden');btn.querySelector('.btn-loader').classList.add('hidden');btn.disabled=false;
            showToast(`Welcome back, ${currentUser.name}!`,'success');
            document.getElementById('login-page').classList.remove('active');document.getElementById('dashboard-page').classList.add('active');
            setupUserProfile();setupNavigation();
            const def=document.querySelector('.nav-item');if(def) def.click();
        }catch(error){
            btn.querySelector('.btn-text').classList.remove('hidden');btn.querySelector('.btn-loader').classList.add('hidden');btn.disabled=false;
            showToast(error.message,'error');
        }
    });
    if(authToken){
        const user=await fetchCurrentUser();
        if(user){
            document.getElementById('login-page').classList.remove('active');document.getElementById('dashboard-page').classList.add('active');
            currentUser=user;setupUserProfile();setupNavigation();
            const def=document.querySelector('.nav-item');if(def) def.click();
        }
    }
});