// ===================================================================
// Reports — Fixed: query parameter matching, date formatting
// ===================================================================

let reportData=[];

async function initReportsPage(){
    const classSel=document.getElementById('report-class');
    const subSel=document.getElementById('report-subject');

    if(currentUser.role==='admin'){
        const classes=await api('/api/classes');
        classSel.innerHTML='<option value="">All Classes</option>'+classes.map(c=>`<option value="${c._id}">${c.name}</option>`).join('');
        const subjects=await api('/api/subjects');
        subSel.innerHTML='<option value="">All Subjects</option>'+subjects.map(s=>`<option value="${s._id}">${s.name} (${s.code})</option>`).join('');
    }else if(currentUser.role==='teacher'){
        if(currentUser.assignedClasses){
            classSel.innerHTML='<option value="">All Classes</option>'+currentUser.assignedClasses.map(c=>`<option value="${c._id}">${c.name}</option>`).join('');
        }
        if(currentUser.assignedSubjects){
            subSel.innerHTML='<option value="">All Subjects</option>'+currentUser.assignedSubjects.map(s=>`<option value="${s._id}">${s.name} (${s.code})</option>`).join('');
        }
    }else{
        document.getElementById('report-class-filter').classList.add('hidden');
        document.getElementById('report-subject-filter').classList.add('hidden');
    }
    document.getElementById('report-results').innerHTML='<p class="empty-state">Select filters and click Generate</p>';
}

function handleReportPeriodChange(){
    const p=document.getElementById('report-period').value;
    document.getElementById('custom-range-start').classList.toggle('hidden',p!=='custom');
    document.getElementById('custom-range-end').classList.toggle('hidden',p!=='custom');
}

async function generateReport(){
    const period=document.getElementById('report-period').value;
    const classId=document.getElementById('report-class').value;
    const subjectId=document.getElementById('report-subject').value;
    const dateFrom=document.getElementById('report-from').value;
    const dateTo=document.getElementById('report-to').value;

    let endpoint='/api/attendance?';
    const params=[];

    if(period!=='custom'){
        params.push(`period=${period}`);
    }else{
        if(!dateFrom||!dateTo){showToast('Select both from and to dates','warning');return}
        params.push(`dateFrom=${dateFrom}`);
        params.push(`dateTo=${dateTo}`);
    }
    if(classId) params.push(`classId=${classId}`);
    if(subjectId) params.push(`subjectId=${subjectId}`);

    try{
        showLoading();
        reportData=await api(endpoint+params.join('&'));
        hideLoading();
        renderReport();
    }catch(e){hideLoading();showToast('Error: '+e.message,'error')}
}

function renderReport(){
    const container=document.getElementById('report-results');
    if(!reportData.length){container.innerHTML='<p class="empty-state">No records found</p>';return}

    const present=reportData.filter(r=>r.status==='Present').length;
    const absent=reportData.filter(r=>r.status==='Absent').length;
    const total=reportData.length;
    const pct=total>0?Math.round((present/total)*100):0;
    let pctColor='var(--accent3)';
    if(pct<50) pctColor='var(--accent4)';else if(pct<75) pctColor='var(--accent5)';

    const showStudent=currentUser.role!=='student';
    const showTeacher=currentUser.role!=='student';

    container.innerHTML=`
        <div class="report-summary">
            <div class="stat-card" style="--stat-glow-color:rgba(0,240,255,.08)"><div class="stat-icon cyan"><i class="fas fa-list"></i></div><div class="stat-info"><span class="stat-value">${total}</span><span class="stat-label">Total Records</span></div></div>
            <div class="stat-card" style="--stat-glow-color:rgba(0,229,160,.08)"><div class="stat-icon green"><i class="fas fa-check"></i></div><div class="stat-info"><span class="stat-value text-success">${present}</span><span class="stat-label">Present</span></div></div>
            <div class="stat-card" style="--stat-glow-color:rgba(255,107,107,.08)"><div class="stat-icon red"><i class="fas fa-times"></i></div><div class="stat-info"><span class="stat-value text-danger">${absent}</span><span class="stat-label">Absent</span></div></div>
            <div class="stat-card" style="--stat-glow-color:rgba(251,191,36,.08)"><div class="stat-icon gold"><i class="fas fa-percentage"></i></div><div class="stat-info"><span class="stat-value" style="color:${pctColor}">${pct}%</span><span class="stat-label">Attendance Rate</span></div></div>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Date</th>${showStudent?'<th>Student</th><th>Roll No</th>':''}<th>Subject</th><th>Class</th>${showTeacher?'<th>Marked By</th>':''}<th>Status</th></tr></thead>
                <tbody>${reportData.map(r=>`<tr><td>${formatDate(r.date)}</td>${showStudent?`<td><strong>${r.student?.name||'-'}</strong></td><td>${r.student?.rollNumber||'-'}</td>`:''}<td>${r.subject?.name||'-'} <span style="color:var(--text-muted);font-size:.76rem">(${r.subject?.code||''})</span></td><td>${r.class?.name||'-'}</td>${showTeacher?`<td>${r.teacher?.name||'-'}</td>`:''}<td><span class="badge badge-${r.status==='Present'?'present':'absent'}">${r.status}</span></td></tr>`).join('')}</tbody>
            </table>
        </div>`;
}

function printReport(){
    if(!reportData.length){showToast('Generate a report first','warning');return}
    window.print();
}

function exportReportCSV(){
    if(!reportData.length){showToast('Generate a report first','warning');return}
    const showStudent=currentUser.role!=='student';
    const headers=['Date'];
    if(showStudent){headers.push('Student','Roll No')}
    headers.push('Subject','Class');
    if(currentUser.role!=='student') headers.push('Teacher');
    headers.push('Status');

    const rows=reportData.map(r=>{
        const row=[formatDate(r.date)];
        if(showStudent){row.push(r.student?.name||'',r.student?.rollNumber||'')}
        row.push(r.subject?.name||'',r.class?.name||'');
        if(currentUser.role!=='student') row.push(r.teacher?.name||'');
        row.push(r.status);
        return row;
    });

    let csv=headers.join(',')+'\n';
    rows.forEach(r=>{csv+=r.map(c=>`"${c}"`).join(',')+'\n'});

    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`attendance_report_${getTodayDate()}.csv`;a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported','success');
}