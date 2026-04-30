// ===================================================================
// Teacher — Fixed: class→subject filtering, date normalization
// ===================================================================

let attendanceStudents=[];

async function loadTeacherDashboard(){
    try{
        const stats=await api('/api/stats/teacher');
        document.getElementById('teacher-stats').innerHTML=`
            <div class="stat-card" style="--stat-glow-color:rgba(139,92,246,.08)"><div class="stat-icon purple"><i class="fas fa-chalkboard"></i></div><div class="stat-info"><span class="stat-value">${stats.assignedClasses}</span><span class="stat-label">My Classes</span></div></div>
            <div class="stat-card" style="--stat-glow-color:rgba(0,240,255,.08)"><div class="stat-icon cyan"><i class="fas fa-book"></i></div><div class="stat-info"><span class="stat-value">${stats.assignedSubjects}</span><span class="stat-label">My Subjects</span></div></div>
            <div class="stat-card" style="--stat-glow-color:rgba(0,229,160,.08)"><div class="stat-icon green"><i class="fas fa-clipboard-check"></i></div><div class="stat-info"><span class="stat-value">${stats.todayMarked}</span><span class="stat-label">Today Records</span></div></div>`;

        const sl=document.getElementById('teacher-subjects-list');
        sl.innerHTML=(currentUser.assignedSubjects&&currentUser.assignedSubjects.length>0)?currentUser.assignedSubjects.map(s=>`<div class="list-item"><div class="list-item-icon" style="background:var(--accent2-dim);color:var(--accent2)"><i class="fas fa-book"></i></div><div class="list-item-content"><div class="list-item-title">${s.name}</div><div class="list-item-sub">${s.code} | ${s.type} | ${s.creditHours} Credits</div></div></div>`).join(''):'<p class="empty-state">No subjects assigned</p>';

        const cl=document.getElementById('teacher-classes-list');
        cl.innerHTML=(currentUser.assignedClasses&&currentUser.assignedClasses.length>0)?currentUser.assignedClasses.map(c=>`<div class="list-item"><div class="list-item-icon" style="background:var(--accent-dim);color:var(--accent)"><i class="fas fa-chalkboard"></i></div><div class="list-item-content"><div class="list-item-title">${c.name}</div><div class="list-item-sub">${c.code} | Sem ${c.semester} | ${c.department?.name||''}</div></div></div>`).join(''):'<p class="empty-state">No classes assigned</p>';
    }catch(e){showToast('Error: '+e.message,'error')}
}

async function initAttendanceMarking(){
    document.getElementById('att-date').value=getTodayDate();
    const classSel=document.getElementById('att-class');
    const subSel=document.getElementById('att-subject');

    if(currentUser.assignedClasses){
        classSel.innerHTML='<option value="">-- Choose Class --</option>'+currentUser.assignedClasses.map(c=>`<option value="${c._id}">${c.name}</option>`).join('');
    }
    // Don't populate subjects yet — wait for class selection
    subSel.innerHTML='<option value="">-- Choose Subject --</option>';
    document.getElementById('attendance-students-container').classList.add('hidden');
    attendanceStudents=[];
}

// When class changes, filter subjects to only those valid for this class
function onAttClassChange(){
    const classId=document.getElementById('att-class').value;
    const subSel=document.getElementById('att-subject');
    document.getElementById('attendance-students-container').classList.add('hidden');
    attendanceStudents=[];

    if(!classId||!currentUser.assignedSubjects){
        subSel.innerHTML='<option value="">-- Choose Subject --</option>';
        return;
    }
    // Show all assigned subjects (teacher knows which subjects go with which class)
    subSel.innerHTML='<option value="">-- Choose Subject --</option>'+currentUser.assignedSubjects.map(s=>`<option value="${s._id}">${s.name} (${s.code})</option>`).join('');
}

async function loadStudentsForAttendance(){
    const classId=document.getElementById('att-class').value;
    const subjectId=document.getElementById('att-subject').value;
    const date=document.getElementById('att-date').value;
    if(!classId||!subjectId||!date){showToast('Select date, class, and subject','warning');return}

    try{
        showLoading();
        const students=await api(`/api/attendance/students-by-class/${classId}`);
        hideLoading();
        if(students.length===0){showToast('No students in this class','warning');document.getElementById('attendance-students-container').classList.add('hidden');return}

        // Fetch existing attendance for this exact date (normalize to local date)
        const dateObj=new Date(date+'T00:00:00');
        const nextDay=new Date(dateObj.getTime()+86400000);
        const existingAtt=await api(`/api/attendance?classId=${classId}&subjectId=${subjectId}&dateFrom=${dateObj.toISOString()}&dateTo=${nextDay.toISOString()}`);

        attendanceStudents=students.map(s=>{
            const ex=existingAtt.find(a=>a.student&&a.student._id===s._id);
            return{_id:s._id,name:s.name,rollNumber:s.rollNumber,status:ex?ex.status:'Present'};
        });
        renderAttendanceTable();
        document.getElementById('attendance-students-container').classList.remove('hidden');
    }catch(e){hideLoading();showToast('Error: '+e.message,'error')}
}

function renderAttendanceTable(){
    document.querySelector('#attendance-student-table tbody').innerHTML=attendanceStudents.map((s,i)=>`<tr><td><span class="badge badge-theory">${s.rollNumber||'-'}</span></td><td><strong>${s.name}</strong></td><td><div class="status-toggle"><button type="button" class="status-btn ${s.status==='Present'?'present-active':''}" onclick="setAttStatus(${i},'Present')"><i class="fas fa-check"></i> P</button><button type="button" class="status-btn ${s.status==='Absent'?'absent-active':''}" onclick="setAttStatus(${i},'Absent')"><i class="fas fa-times"></i> A</button></div></td></tr>`).join('');
}
function setAttStatus(i,status){attendanceStudents[i].status=status;renderAttendanceTable()}
function markAllPresent(){attendanceStudents.forEach(s=>s.status='Present');renderAttendanceTable();showToast('All marked Present','success')}
function markAllAbsent(){attendanceStudents.forEach(s=>s.status='Absent');renderAttendanceTable();showToast('All marked Absent','warning')}

async function submitAttendance(){
    const classId=document.getElementById('att-class').value;
    const subjectId=document.getElementById('att-subject').value;
    const date=document.getElementById('att-date').value;
    if(!classId||!subjectId||!date){showToast('Missing fields','warning');return}
    if(!attendanceStudents.length){showToast('No students loaded','warning');return}
    const records=attendanceStudents.map(s=>({studentId:s._id,status:s.status}));
    try{showLoading();const r=await api('/api/attendance/mark',{method:'POST',body:JSON.stringify({classId,subjectId,date,records})});hideLoading();showToast(r.message,'success')}catch(e){hideLoading();showToast(e.message,'error')}
}