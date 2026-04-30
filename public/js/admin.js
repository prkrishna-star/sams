// ===================================================================
// AttendEase - Admin Dashboard & Management Functions
// FINAL VERSION - Properly Fixed - All bugs resolved
// ===================================================================

var currentFilterDept = '';
var currentFilterClass = '';

function getField(idOrName) {
    var byId = document.getElementById(idOrName);
    if (byId && (byId.tagName === 'INPUT' || byId.tagName === 'SELECT' || byId.tagName === 'TEXTAREA')) {
        return byId;
    }
    var byName = document.querySelector('input[name="' + idOrName + '"], select[name="' + idOrName + '"], textarea[name="' + idOrName + '"]');
    if (byName) return byName;
    var byData = document.querySelector('[data-field="' + idOrName + '"]');
    if (byData && (byData.tagName === 'INPUT' || byData.tagName === 'SELECT' || byData.tagName === 'TEXTAREA')) {
        return byData;
    }
    return null;
}

// ==================== UNIVERSAL DEPT SELECT FINDER ====================
function findDeptSelectInModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return null;
    
    var searchRoot = modal || document;
    var docSelects = searchRoot.querySelectorAll('select');

    for (var i = 0; i < docSelects.length; i++) {
        var selId = (docSelects[i].id || docSelects[i].name || '').toLowerCase();
        if (selId.indexOf('dept') !== -1 || selId.indexOf('department') !== -1) {
            return docSelects[i];
        }
    }

    var guesses = ['student-dept','student-department','studentDept','studentDepartment',
                   'subject-dept','subject-department','subjectDept','subjectDepartment',
                   'class-dept','class-department','dept','department'];
    for (var g = 0; g < guesses.length; g++) {
        var found = getField(guesses[g]);
        if (found && modal.contains(found)) return found;
    }

    for (var j = 0; j < docSelects.length; j++) {
        var firstOpt = docSelects[j].options[0];
        if (firstOpt && firstOpt.text && firstOpt.text.toLowerCase().indexOf('department') !== -1) {
            return docSelects[j];
        }
    }

    var labels = searchRoot.querySelectorAll('label');
    for (var l = 0; l < labels.length; l++) {
        if (labels[l].textContent.toLowerCase().indexOf('department') !== -1) {
            var forId = labels[l].getAttribute('for');
            if (forId) {
                var target = document.getElementById(forId);
                if (target && target.tagName === 'SELECT') return target;
            }
            var wrapped = labels[l].querySelector('select');
            if (wrapped) return wrapped;
            var next = labels[l].nextElementSibling;
            if (next && next.tagName === 'SELECT') return next;
            var parent = labels[l].parentElement;
            if (parent) {
                var parentSel = parent.querySelector('select');
                if (parentSel) return parentSel;
            }
        }
    }

    for (var k = 0; k < docSelects.length; k++) {
        var nid = (docSelects[k].id || docSelects[k].name || '').toLowerCase();
        if (nid.indexOf('filter') === -1 && nid.indexOf('class') === -1 && nid.indexOf('sem') === -1 && nid.indexOf('type') === -1 && nid.indexOf('credit') === -1) {
            return docSelects[k];
        }
    }

    if (docSelects.length > 0) return docSelects[0];
    return null;
}

// ==================== ADMIN DASHBOARD ====================
async function loadAdminDashboard() {
    try {
        var container = document.getElementById('admin-stats');
        var attempts = 0;
        while (!container && attempts < 20) {
            await new Promise(r => setTimeout(r, 50));
            container = document.getElementById('admin-stats');
            attempts++;
        }

        if (!container) {
            console.error('loadAdminDashboard: admin-stats container not found after waiting.');
            return;
        }

        var stats = await api('/api/stats/admin');
        
        var statCards = [
            { label: 'Total Students', value: stats.totalStudents, icon: 'fas fa-user-graduate', color: 'green', glow: 'rgba(0,229,160,0.08)' },
            { label: 'Total Teachers', value: stats.totalTeachers, icon: 'fas fa-chalkboard-teacher', color: 'purple', glow: 'rgba(139,92,246,0.08)' },
            { label: 'Departments', value: stats.totalDepartments, icon: 'fas fa-building', color: 'cyan', glow: 'rgba(0,240,255,0.08)' },
            { label: 'Classes', value: stats.totalClasses, icon: 'fas fa-chalkboard', color: 'gold', glow: 'rgba(251,191,36,0.08)' },
            { label: 'Subjects', value: stats.totalSubjects, icon: 'fas fa-book', color: 'pink', glow: 'rgba(244,114,182,0.08)' },
            { label: 'Today\'s Attendance', value: stats.todayAttendance, icon: 'fas fa-clipboard-check', color: 'green', glow: 'rgba(0,229,160,0.08)' }
        ];
        
        container.innerHTML = statCards.map(function(s, i) {
            return '<div class="stat-card" style="--stat-glow-color: ' + s.glow + '; animation-delay: ' + (i * 0.1) + 's">' +
                '<div class="stat-icon ' + s.color + '"><i class="' + s.icon + '"></i></div>' +
                '<div class="stat-info">' +
                '<span class="stat-value" data-target="' + s.value + '">0</span>' +
                '<span class="stat-label">' + s.label + '</span>' +
                '</div></div>';
        }).join('');
        
        setTimeout(function() {
            container.querySelectorAll('.stat-value').forEach(function(el) {
                animateCounter(el, parseInt(el.dataset.target));
            });
        }, 200);
        
        var recentAtt = await api('/api/attendance?period=today');
        var activityEl = document.getElementById('recent-activity');
        if (activityEl) {
            if (recentAtt.length === 0) {
                activityEl.innerHTML = '<p class="empty-state">No attendance marked today</p>';
            } else {
                activityEl.innerHTML = recentAtt.slice(0, 8).map(function(a) {
                    var isPresent = a.status === 'Present';
                    return '<div class="list-item">' +
                        '<div class="list-item-icon" style="background: ' + (isPresent ? 'var(--accent3-dim)' : 'var(--accent4-dim)') + '; color: ' + (isPresent ? 'var(--accent3)' : 'var(--accent4)') + '">' +
                        '<i class="fas ' + (isPresent ? 'fa-check' : 'fa-times') + '"></i></div>' +
                        '<div class="list-item-content">' +
                        '<div class="list-item-title">' + (a.student?.name || 'Unknown') + '</div>' +
                        '<div class="list-item-sub">' + (a.subject?.name || '') + ' — ' + a.status + '</div>' +
                        '</div></div>';
                }).join('');
            }
        }
        
        var overviewEl = document.getElementById('quick-overview');
        if (overviewEl) {
            overviewEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px">' + 
                statCards.slice(0, 4).map(function(s) {
                    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:var(--bg-tertiary);border-radius:var(--radius-sm);border:1px solid var(--border-color);transition:all .25s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border-color)\'">' +
                        '<span style="color:var(--text-secondary);font-size:.88rem"><i class="' + s.icon + '" style="color:var(--' + (s.color === 'green' ? 'accent3' : s.color === 'purple' ? 'accent2' : s.color === 'cyan' ? 'accent' : 'accent5') + ');margin-right:8px"></i>' + s.label + '</span>' +
                        '<span style="font-weight:800;font-size:1.15rem">' + s.value + '</span></div>';
                }).join('') + '</div>';
        }
    } catch (error) {
        console.error('loadAdminDashboard error:', error);
        showToast('Error loading dashboard: ' + error.message, 'error');
    }
}

// ==================== DEPARTMENTS ====================
async function loadDepartments() {
    try {
        var depts = await api('/api/departments');
        var tbody = document.querySelector('#dept-table tbody');
        if (!tbody) return;
        if (depts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No departments found</td></tr>';
            return;
        }
        tbody.innerHTML = depts.map(function(d) {
            var safeName = (d.name || '').replace(/'/g, "\\'");
            return '<tr>' +
                '<td><strong>' + d.name + '</strong></td>' +
                '<td><span class="badge badge-theory">' + d.code + '</span></td>' +
                '<td>' + (d.hod || '-') + '</td>' +
                '<td><div class="table-actions">' +
                '<button class="btn btn-accent btn-sm" onclick="editDepartment(\'' + d._id + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-danger btn-sm" onclick="deleteDepartment(\'' + d._id + '\', \'' + safeName + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></td></tr>';
        }).join('');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

function openDeptModal() {
    if (!getField('dept-id')) return;
    getField('dept-id').value = '';
    getField('dept-name').value = '';
    getField('dept-code').value = '';
    getField('dept-hod').value = '';
    getField('dept-desc').value = '';
    var titleEl = document.getElementById('dept-modal-title');
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-building"></i> Add Department';
    openModal('modal-department');
}

async function editDepartment(id) {
    try {
        var depts = await api('/api/departments');
        var d = depts.find(function(x) { return x._id === id; });
        if (!d) { showToast('Department not found', 'error'); return; }
        getField('dept-id').value = d._id;
        getField('dept-name').value = d.name;
        getField('dept-code').value = d.code;
        getField('dept-hod').value = d.hod || '';
        getField('dept-desc').value = d.description || '';
        var titleEl = document.getElementById('dept-modal-title');
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit"></i> Edit Department';
        openModal('modal-department');
    } catch (error) { showToast('Error: ' + error.message, 'error'); }
}

async function saveDepartment(e) {
    e.preventDefault();
    var id = getField('dept-id').value;
    var data = {
        name: getField('dept-name').value.trim(),
        code: getField('dept-code').value.trim().toUpperCase(),
        hod: getField('dept-hod').value.trim(),
        description: getField('dept-desc').value.trim()
    };
    if (!data.name || !data.code) { showToast('Name and Code are required', 'warning'); return; }
    try {
        showLoading();
        if (id) { await api('/api/departments/' + id, { method: 'PUT', body: JSON.stringify(data) }); showToast('Updated', 'success'); }
        else { await api('/api/departments', { method: 'POST', body: JSON.stringify(data) }); showToast('Created', 'success'); }
        hideLoading(); closeModal('modal-department'); loadDepartments();
    } catch (error) { hideLoading(); showToast('Error: ' + error.message, 'error'); }
}

function deleteDepartment(id, name) {
    showConfirm('Delete "' + name + '"?', async function() {
        try { showLoading(); await api('/api/departments/' + id, { method: 'DELETE' }); hideLoading(); showToast('Deleted', 'success'); loadDepartments(); }
        catch (error) { hideLoading(); showToast('Error: ' + error.message, 'error'); }
    });
}

// ==================== CLASSES ====================
async function loadClasses() {
    try {
        var classes = await api('/api/classes');
        var tbody = document.querySelector('#class-table tbody');
        if (!tbody) return;
        if (classes.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No classes found</td></tr>'; return; }
        tbody.innerHTML = classes.map(function(c) {
            var safeName = (c.name || '').replace(/'/g, "\\'");
            return '<tr>' +
                '<td><strong>' + c.name + '</strong></td>' +
                '<td><span class="badge badge-theory">' + c.code + '</span></td>' +
                '<td>' + (c.department?.name || '-') + '</td>' +
                '<td>Sem ' + c.semester + '</td>' +
                '<td><div class="table-actions">' +
                '<button class="btn btn-accent btn-sm" onclick="editClass(\'' + c._id + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-danger btn-sm" onclick="deleteClass(\'' + c._id + '\', \'' + safeName + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></td></tr>';
        }).join('');
    } catch (error) { showToast('Error: ' + error.message, 'error'); }
}

async function openClassModal() {
    try {
        openModal('modal-class');
        await new Promise(r => setTimeout(r, 50));
        
        var depts = await api('/api/departments');
        var deptEl = getField('class-dept');
        if (deptEl) {
            deptEl.innerHTML = '<option value="">Select Department</option>' + depts.map(function(d) {
                return '<option value="' + d._id + '">' + d.name + '</option>';
            }).join('');
        }
        if (getField('class-id')) getField('class-id').value = '';
        if (getField('class-name')) getField('class-name').value = '';
        if (getField('class-code')) getField('class-code').value = '';
        if (getField('class-sem')) getField('class-sem').value = '';
        if (getField('class-year')) getField('class-year').value = '';
        var titleEl = document.getElementById('class-modal-title');
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-chalkboard"></i> Add Class';
    } catch (error) { showToast('Error loading departments', 'error'); }
}

async function editClass(id) {
    try {
        var allClasses = await api('/api/classes');
        var c = allClasses.find(function(x) { return x._id === id; });
        if (!c) { showToast('Class not found', 'error'); return; }
        
        openModal('modal-class');
        await new Promise(r => setTimeout(r, 50));
        
        var depts = await api('/api/departments');
        var deptEl = getField('class-dept');
        if (deptEl) {
            deptEl.innerHTML = '<option value="">Select Department</option>' + depts.map(function(d) {
                return '<option value="' + d._id + '">' + d.name + '</option>';
            }).join('');
            deptEl.value = c.department ? c.department._id : '';
        }
        
        if (getField('class-id')) getField('class-id').value = c._id;
        if (getField('class-name')) getField('class-name').value = c.name;
        if (getField('class-code')) getField('class-code').value = c.code;
        if (getField('class-sem')) getField('class-sem').value = c.semester;
        if (getField('class-year')) getField('class-year').value = c.year;
        var titleEl = document.getElementById('class-modal-title');
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit"></i> Edit Class';
    } catch (error) { showToast('Error: ' + error.message, 'error'); }
}

async function saveClass(e) {
    e.preventDefault();
    var id = getField('class-id').value;
    var data = {
        name: getField('class-name').value.trim(),
        code: getField('class-code').value.trim().toUpperCase(),
        department: getField('class-dept').value,
        semester: parseInt(getField('class-sem').value),
        year: parseInt(getField('class-year').value)
    };
    if (!data.name || !data.code || !data.department) { showToast('Fill all required fields', 'warning'); return; }
    try {
        showLoading();
        if (id) { await api('/api/classes/' + id, { method: 'PUT', body: JSON.stringify(data) }); showToast('Updated', 'success'); }
        else { await api('/api/classes', { method: 'POST', body: JSON.stringify(data) }); showToast('Created', 'success'); }
        hideLoading(); closeModal('modal-class'); loadClasses();
    } catch (error) { hideLoading(); showToast('Error: ' + error.message, 'error'); }
}

function deleteClass(id, name) {
    showConfirm('Delete "' + name + '"?', async function() {
        try { showLoading(); await api('/api/classes/' + id, { method: 'DELETE' }); hideLoading(); showToast('Deleted', 'success'); loadClasses(); }
        catch (error) { hideLoading(); showToast('Error: ' + error.message, 'error'); }
    });
}
// ==================== SUBJECTS ====================
async function loadSubjects() {
    try {
        var subjects = await api('/api/subjects');
        var tbody = document.querySelector('#subject-table tbody');
        if (!tbody) return;
        if (subjects.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No subjects found</td></tr>'; return; }
        tbody.innerHTML = subjects.map(function(s) {
            var safeName = (s.name || '').replace(/'/g, "\\'");
            return '<tr>' +
                '<td><strong>' + s.name + '</strong></td>' +
                '<td><span class="badge badge-theory">' + s.code + '</span></td>' +
                '<td>' + (s.department?.name || '-') + '</td>' +
                '<td><span class="badge badge-' + s.type.toLowerCase() + '">' + s.type + '</span></td>' +
                '<td>' + s.creditHours + '</td>' +
                '<td><div class="table-actions">' +
                '<button class="btn btn-accent btn-sm" onclick="editSubject(\'' + s._id + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-danger btn-sm" onclick="deleteSubject(\'' + s._id + '\', \'' + safeName + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></td></tr>';
        }).join('');
    } catch (error) { showToast('Error: ' + error.message, 'error'); }
}

async function openSubjectModal() {
    try {
        // Reset fields
        document.getElementById('subject-id').value = '';
        document.getElementById('subject-name').value = '';
        document.getElementById('subject-code').value = '';
        document.getElementById('subject-sem').value = '';
        document.getElementById('subject-type').value = 'Theory';
        document.getElementById('subject-credits').value = '3';
        document.getElementById('subject-modal-title').innerHTML = '<i class="fas fa-book"></i> Add Subject';

        // Fetch departments and populate dropdown
        var depts = await api('/api/departments');
        var deptEl = document.getElementById('subject-dept');
        deptEl.innerHTML = '<option value="">Select Department</option>' + depts.map(function(d) {
            return '<option value="' + d._id + '">' + d.name + '</option>';
        }).join('');

        // Open modal
        openModal('modal-subject');
    } catch (error) {
        console.error('openSubjectModal error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function editSubject(id) {
    try {
        var allSubjects = await api('/api/subjects');
        var s = allSubjects.find(function(x) { return x._id === id; });
        if (!s) { showToast('Subject not found', 'error'); return; }

        // Set title
        document.getElementById('subject-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Subject';

        // Fetch departments and populate dropdown
        var depts = await api('/api/departments');
        var deptEl = document.getElementById('subject-dept');
        deptEl.innerHTML = '<option value="">Select Department</option>' + depts.map(function(d) {
            return '<option value="' + d._id + '">' + d.name + '</option>';
        }).join('');

        // Fill fields with existing data
        document.getElementById('subject-id').value = s._id;
        document.getElementById('subject-name').value = s.name;
        document.getElementById('subject-code').value = s.code;
        deptEl.value = s.department ? s.department._id : '';
        document.getElementById('subject-sem').value = s.semester;
        document.getElementById('subject-type').value = s.type;
        document.getElementById('subject-credits').value = s.creditHours;

        // Open modal
        openModal('modal-subject');
    } catch (error) {
        console.error('editSubject error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function saveSubject(e) {
    e.preventDefault();
    var id = document.getElementById('subject-id').value;
    
    var data = {
        name: document.getElementById('subject-name').value.trim(),
        code: document.getElementById('subject-code').value.trim().toUpperCase(),
        department: document.getElementById('subject-dept').value,
        semester: parseInt(document.getElementById('subject-sem').value),
        type: document.getElementById('subject-type').value,
        creditHours: parseInt(document.getElementById('subject-credits').value)
    };
    
    if (!data.name || !data.code || !data.department) { 
        showToast('Fill all required fields', 'warning'); 
        return; 
    }
    
    try {
        showLoading();
        if (id) { 
            await api('/api/subjects/' + id, { method: 'PUT', body: JSON.stringify(data) }); 
            showToast('Updated', 'success'); 
        }
        else { 
            await api('/api/subjects', { method: 'POST', body: JSON.stringify(data) }); 
            showToast('Created', 'success'); 
        }
        hideLoading(); 
        closeModal('modal-subject'); 
        loadSubjects();
    } catch (error) { 
        hideLoading(); 
        showToast('Error: ' + error.message, 'error'); 
    }
}

function deleteSubject(id, name) {
    showConfirm('Delete "' + name + '"?', async function() {
        try { showLoading(); await api('/api/subjects/' + id, { method: 'DELETE' }); hideLoading(); showToast('Deleted', 'success'); loadSubjects(); }
        catch (error) { hideLoading(); showToast('Error: ' + error.message, 'error'); }
    });
}
// ==================== TEACHERS ====================
async function loadTeachers() {
    try {
        var teachers = await api('/api/users?role=teacher');
        var tbody = document.querySelector('#teacher-table tbody');
        if (!tbody) return;
        if (teachers.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No teachers found</td></tr>'; return; }
        tbody.innerHTML = teachers.map(function(t) {
            var safeName = (t.name || '').replace(/'/g, "\\'");
            var subjectsHtml = (t.assignedSubjects || []).map(function(s) { return '<span class="badge badge-theory" style="margin:2px">' + s.name + '</span>'; }).join('');
            var classesHtml = (t.assignedClasses || []).map(function(c) { return '<span class="badge badge-lab" style="margin:2px">' + c.name + '</span>'; }).join('');
            return '<tr>' +
                '<td><strong>' + t.name + '</strong></td>' +
                '<td style="font-size:.84rem;color:var(--text-secondary)">' + t.email + '</td>' +
                '<td>' + (subjectsHtml || '<span style="color:var(--text-muted)">None</span>') + '</td>' +
                '<td>' + (classesHtml || '<span style="color:var(--text-muted)">None</span>') + '</td>' +
                '<td><div class="table-actions">' +
                '<button class="btn btn-accent btn-sm" onclick="editUser(\'' + t._id + '\', \'teacher\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-danger btn-sm" onclick="deleteUser(\'' + t._id + '\', \'' + safeName + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></td></tr>';
        }).join('');
    } catch (error) { showToast('Error: ' + error.message, 'error'); }
}

// ==================== STUDENTS (Cascading Filters) ====================
async function loadStudents(deptFilter, classFilter) {
    if (deptFilter !== undefined) currentFilterDept = deptFilter;
    if (classFilter !== undefined) currentFilterClass = classFilter;
    
    try {
        var depts = await api('/api/departments');
        var deptSelect = document.getElementById('filter-dept');
        if (!deptSelect) return;
        deptSelect.innerHTML = '<option value="">All Departments</option>' + depts.map(function(d) {
            return '<option value="' + d._id + '">' + d.name + '</option>';
        }).join('');
        if (currentFilterDept) deptSelect.value = currentFilterDept;
        
        var classesForFilter = [];
        try {
            if (currentFilterDept) {
                classesForFilter = await api('/api/classes/by-department/' + currentFilterDept);
            } else {
                classesForFilter = await api('/api/classes');
            }
        } catch (e) {
            var allClasses = await api('/api/classes');
            classesForFilter = currentFilterDept ? allClasses.filter(function(c) { return c.department && c.department._id === currentFilterDept; }) : allClasses;
        }
        
        var classSelect = document.getElementById('filter-class');
        if (!classSelect) return;
        classSelect.innerHTML = '<option value="">All Classes</option>' + classesForFilter.map(function(c) {
            return '<option value="' + c._id + '">' + c.name + '</option>';
        }).join('');
        
        if (currentFilterClass && Array.from(classSelect.options).some(function(o) { return o.value === currentFilterClass; })) {
            classSelect.value = currentFilterClass;
        } else {
            currentFilterClass = '';
        }
        
        var query = 'role=student';
        if (currentFilterDept) query += '&department=' + currentFilterDept;
        if (currentFilterClass) query += '&class=' + currentFilterClass;
        
        var students = await api('/api/users?' + query);
        var tbody = document.querySelector('#student-table tbody');
        if (!tbody) return;
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No students found for selected filters</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map(function(s) {
            var safeName = (s.name || '').replace(/'/g, "\\'");
            return '<tr>' +
                '<td><span class="badge badge-theory">' + (s.rollNumber || '-') + '</span></td>' +
                '<td><strong>' + s.name + '</strong></td>' +
                '<td style="font-size:.84rem;color:var(--text-secondary)">' + s.email + '</td>' +
                '<td>' + (s.department?.name || '-') + '</td>' +
                '<td>' + (s.class?.name || '-') + '</td>' +
                '<td><div class="table-actions">' +
                '<button class="btn btn-accent btn-sm" onclick="editUser(\'' + s._id + '\', \'student\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-danger btn-sm" onclick="deleteUser(\'' + s._id + '\', \'' + safeName + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></td></tr>';
        }).join('');
    } catch (error) {
        console.error('loadStudents error:', error);
        showToast('Error loading students: ' + error.message, 'error');
    }
}

function onFilterDeptChange() {
    currentFilterDept = document.getElementById('filter-dept').value;
    currentFilterClass = '';
    loadStudents(currentFilterDept, '');
}

function onFilterClassChange() {
    currentFilterDept = document.getElementById('filter-dept').value;
    currentFilterClass = document.getElementById('filter-class').value;
    loadStudents(currentFilterDept, currentFilterClass);
}

// ==================== SAFE CLASS LOADER ====================
async function safeLoadClasses(selectId, deptId) {
    var select = document.getElementById(selectId);
    if (!select) select = document.querySelector('select[name="' + selectId + '"]');
    if (!select) {
        var modal = document.getElementById('modal-user');
        if (modal) {
            var selects = modal.querySelectorAll('select');
            for (var i = 0; i < selects.length; i++) {
                var identifier = (selects[i].id || selects[i].name || '').toLowerCase();
                if (identifier.indexOf('class') !== -1 && identifier.indexOf('filter') === -1) {
                    select = selects[i];
                    break;
                }
            }
        }
    }
    
    if (!select) {
        console.warn('safeLoadClasses: could not find class dropdown for "' + selectId + '"');
        return;
    }
    
    var saveBtn = document.querySelector('#modal-user .btn-primary');
    if (saveBtn) saveBtn.disabled = true;

    select.innerHTML = '<option value="">Loading...</option>';
    
    if (!deptId) {
        select.innerHTML = '<option value="">Select Class</option>';
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    
    var classes = [];
    try {
        classes = await api('/api/classes/by-department/' + deptId);
    } catch (e) {
        try {
            var allClasses = await api('/api/classes');
            classes = allClasses.filter(function(c) { return c.department && c.department._id === deptId; });
        } catch (e2) {
            select.innerHTML = '<option value="">Failed to load</option>';
            showToast('Error loading classes', 'error');
            if (saveBtn) saveBtn.disabled = false;
            return;
        }
    }
    
    select.innerHTML = '<option value="">Select Class</option>' + classes.map(function(c) {
        return '<option value="' + c._id + '">' + c.name + ' (' + c.code + ')</option>';
    }).join('');
    
    if (saveBtn) saveBtn.disabled = false;
}

function loadClassesByDept(selectId) {
    var deptEl = findDeptSelectInModal('modal-user');
    if (deptEl && deptEl.value) {
        safeLoadClasses(selectId, deptEl.value);
    } else {
        safeLoadClasses(selectId, '');
    }
}

async function loadClassesByDeptForModal(selectId, deptId) {
    await safeLoadClasses(selectId, deptId);
}

// ==================== USER MANAGEMENT ====================
async function openUserModal(role) {
    var teacherFields = document.getElementById('teacher-fields');
    var studentFields = document.getElementById('student-fields');
    
    if (teacherFields) teacherFields.classList.add('hidden');
    if (studentFields) studentFields.classList.add('hidden');
    
    if (getField('user-id')) getField('user-id').value = '';
    if (getField('user-role-type')) getField('user-role-type').value = role;
    if (getField('user-name')) getField('user-name').value = '';
    if (getField('user-email')) getField('user-email').value = '';
    if (getField('user-password')) getField('user-password').value = '';
    
    var pwdRow = document.getElementById('user-password-row');
    if (pwdRow) pwdRow.classList.remove('hidden');
    
    if (getField('student-roll')) getField('student-roll').value = '';
    
    var modal = document.getElementById('modal-user');
    if (modal) {
        var clsSelects = modal.querySelectorAll('select');
        for (var c = 0; c < clsSelects.length; c++) {
            var cid = (clsSelects[c].id || clsSelects[c].name || '').toLowerCase();
            if (cid.indexOf('class') !== -1 && cid.indexOf('filter') === -1) {
                clsSelects[c].innerHTML = '<option value="">Select Class</option>';
            }
        }
    }
    
    try {
        if (role === 'teacher') {
            var subjects = await api('/api/subjects');
            var classes = await api('/api/classes');
            var subCon = document.getElementById('teacher-subjects-checkboxes');
            var clsCon = document.getElementById('teacher-classes-checkboxes');
            if (subCon) subCon.innerHTML = subjects.map(function(s) {
                return '<label class="checkbox-item"><input type="checkbox" value="' + s._id + '"> ' + s.name + ' (' + s.code + ')</label>';
            }).join('');
            if (clsCon) clsCon.innerHTML = classes.map(function(c) {
                return '<label class="checkbox-item"><input type="checkbox" value="' + c._id + '"> ' + c.name + '</label>';
            }).join('');
            if (teacherFields) teacherFields.classList.remove('hidden');
            var titleEl = document.getElementById('user-modal-title');
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Add Teacher';
        } else {
            var depts = await api('/api/departments');
            var deptEl = findDeptSelectInModal('modal-user');
            
            if (!deptEl) {
                showToast('Form error: department dropdown not found in student form', 'error');
                return;
            }
            
            deptEl.innerHTML = '<option value="">Select Department</option>' + depts.map(function(d) {
                return '<option value="' + d._id + '">' + d.name + '</option>';
            }).join('');
            
            deptEl.onchange = function() {
                var classSelect = null;
                var modalEl = document.getElementById('modal-user');
                if (modalEl) {
                    var sels = modalEl.querySelectorAll('select');
                    for (var j = 0; j < sels.length; j++) {
                        var sid = (sels[j].id || sels[j].name || '').toLowerCase();
                        if (sid.indexOf('class') !== -1 && sid.indexOf('filter') === -1) {
                            classSelect = sels[j];
                            break;
                        }
                    }
                }
                if (classSelect) {
                    safeLoadClasses(classSelect.id || classSelect.name, deptEl.value);
                }
            };
            
            if (studentFields) studentFields.classList.remove('hidden');
            var titleEl2 = document.getElementById('user-modal-title');
            if (titleEl2) titleEl2.innerHTML = '<i class="fas fa-user-graduate"></i> Add Student';
        }
        
        openModal('modal-user');
        
        setTimeout(function() {
            var nameInput = getField('user-name');
            if (nameInput) nameInput.focus();
        }, 400);
        
    } catch (error) {
        console.error('openUserModal error:', error);
        showToast('Error loading form data: ' + error.message, 'error');
    }
}

async function editUser(id, role) {
    try {
        var user = await api('/api/users/' + id);
        if (!user) { showToast('User not found', 'error'); return; }
        
        var modal = document.getElementById('modal-user');
        var teacherFields = document.getElementById('teacher-fields');
        var studentFields = document.getElementById('student-fields');
        
        if (role === 'teacher') {
            var subjects = await api('/api/subjects');
            var classes = await api('/api/classes');
            var subCon = document.getElementById('teacher-subjects-checkboxes');
            var clsCon = document.getElementById('teacher-classes-checkboxes');
            if (subCon) subCon.innerHTML = subjects.map(function(s) {
                return '<label class="checkbox-item"><input type="checkbox" value="' + s._id + '"> ' + s.name + ' (' + s.code + ')</label>';
            }).join('');
            if (clsCon) clsCon.innerHTML = classes.map(function(c) {
                return '<label class="checkbox-item"><input type="checkbox" value="' + c._id + '"> ' + c.name + '</label>';
            }).join('');
            
            if (getField('user-id')) getField('user-id').value = user._id;
            if (getField('user-role-type')) getField('user-role-type').value = 'teacher';
            if (getField('user-name')) getField('user-name').value = user.name;
            if (getField('user-email')) getField('user-email').value = user.email;
            if (getField('user-password')) getField('user-password').value = '';
            
            var pwdRow = document.getElementById('user-password-row');
            if (pwdRow) pwdRow.classList.add('hidden');
            if (teacherFields) teacherFields.classList.remove('hidden');
            if (studentFields) studentFields.classList.add('hidden');
            
            var titleEl = document.getElementById('user-modal-title');
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit"></i> Edit Teacher';
            
            var subIds = (user.assignedSubjects || []).map(function(s) { return s._id; });
            if (subCon) subCon.querySelectorAll('input').forEach(function(cb) { cb.checked = subIds.indexOf(cb.value) !== -1; });
            var classIds = (user.assignedClasses || []).map(function(c) { return c._id; });
            if (clsCon) clsCon.querySelectorAll('input').forEach(function(cb) { cb.checked = classIds.indexOf(cb.value) !== -1; });
            
        } else {
            var depts = await api('/api/departments');
            var deptEl = findDeptSelectInModal('modal-user');
            if (!deptEl) { showToast('Error finding form elements', 'error'); return; }
            
            deptEl.innerHTML = '<option value="">Select Department</option>' + depts.map(function(d) {
                return '<option value="' + d._id + '">' + d.name + '</option>';
            }).join('');
            
            if (getField('user-id')) getField('user-id').value = user._id;
            if (getField('user-role-type')) getField('user-role-type').value = 'student';
            if (getField('user-name')) getField('user-name').value = user.name;
            if (getField('user-email')) getField('user-email').value = user.email;
            if (getField('user-password')) getField('user-password').value = '';
            
            var pwdRow = document.getElementById('user-password-row');
            if (pwdRow) pwdRow.classList.add('hidden');
            if (teacherFields) teacherFields.classList.add('hidden');
            if (studentFields) studentFields.classList.remove('hidden');
            
            var titleEl2 = document.getElementById('user-modal-title');
            if (titleEl2) titleEl2.innerHTML = '<i class="fas fa-edit"></i> Edit Student';
            if (getField('student-roll')) getField('student-roll').value = user.rollNumber || '';
            
            if (user.department) {
                deptEl.value = user.department._id;
                
                var classEl = null;
                if (modal) {
                    var sels2 = modal.querySelectorAll('select');
                    for (var j = 0; j < sels2.length; j++) {
                        var sid = (sels2[j].id || sels2[j].name || '').toLowerCase();
                        if (sid.indexOf('class') !== -1 && sid.indexOf('filter') === -1) {
                            classEl = sels2[j];
                            break;
                        }
                    }
                }
                
                if (classEl) {
                    await safeLoadClasses(classEl.id || classEl.name, user.department._id);
                    if (user.class) classEl.value = user.class._id;
                }
            } else {
                if (modal) {
                    var sels3 = modal.querySelectorAll('select');
                    for (var k = 0; k < sels3.length; k++) {
                        var sid2 = (sels3[k].id || sels3[k].name || '').toLowerCase();
                        if (sid2.indexOf('class') !== -1 && sid2.indexOf('filter') === -1) {
                            sels3[k].innerHTML = '<option value="">Select Class</option>';
                        }
                    }
                }
            }
            
            deptEl.onchange = function() {
                var classSelect = null;
                var modalEl = document.getElementById('modal-user');
                if (modalEl) {
                    var sels = modalEl.querySelectorAll('select');
                    for (var j = 0; j < sels.length; j++) {
                        var sid = (sels[j].id || sels[j].name || '').toLowerCase();
                        if (sid.indexOf('class') !== -1 && sid.indexOf('filter') === -1) {
                            classSelect = sels[j];
                            break;
                        }
                    }
                }
                if (classSelect) {
                    safeLoadClasses(classSelect.id || classSelect.name, deptEl.value);
                }
            };
        }
        
        openModal('modal-user');
    } catch (error) {
        console.error('editUser error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

// ==================== SAVE USER (Bulletproof) ====================
function handleSaveUser() {
    var nameInput = getField('user-name');
    var emailInput = getField('user-email');
    var passwordInput = getField('user-password');
    var idInput = getField('user-id');
    var roleInput = getField('user-role-type');
    
    if (!nameInput) nameInput = document.getElementById('user-name');
    if (!emailInput) emailInput = document.getElementById('user-email');
    if (!passwordInput) passwordInput = document.getElementById('user-password');
    if (!idInput) idInput = document.getElementById('user-id');
    if (!roleInput) roleInput = document.getElementById('user-role-type');
    
    var modal = document.getElementById('modal-user');
    if (modal && (!nameInput || !emailInput || !passwordInput || !roleInput || !idInput)) {
        var allInputs = modal.querySelectorAll('input, select, textarea');
        allInputs.forEach(function(inp) {
            var lbl = (inp.id || inp.name || '').toLowerCase();
            if (!nameInput && lbl.indexOf('user-name') !== -1 && inp.type === 'text') nameInput = inp;
            if (!emailInput && (lbl.indexOf('user-email') !== -1 || (lbl.indexOf('email') !== -1 && inp.type === 'email'))) emailInput = inp;
            if (!passwordInput && lbl.indexOf('password') !== -1 && inp.type === 'password') passwordInput = inp;
            if (!roleInput && lbl.indexOf('user-role') !== -1) roleInput = inp;
            if (!idInput && lbl.indexOf('user-id') !== -1) idInput = inp;
        });
    }
    
    var name = nameInput ? nameInput.value : '';
    var email = emailInput ? emailInput.value : '';
    var password = passwordInput ? passwordInput.value : '';
    var id = idInput ? idInput.value : '';
    var role = roleInput ? roleInput.value : '';
    
    name = typeof name === 'string' ? name.trim() : '';
    email = typeof email === 'string' ? email.trim() : '';
    
    if (!name || name.length === 0) {
        showToast('Name is required', 'warning');
        if (nameInput) { nameInput.focus(); flashBorder(nameInput); }
        else { console.error('handleSaveUser: Could not find name input element!'); }
        return;
    }
    
    if (!email || email.length === 0) {
        showToast('Email is required', 'warning');
        if (emailInput) { emailInput.focus(); flashBorder(emailInput); }
        return;
    }
    
    if (email.indexOf('@') === -1 || email.indexOf('.') === -1) {
        showToast('Please enter a valid email', 'warning');
        if (emailInput) emailInput.focus();
        return;
    }
    
    var data = { name: name, email: email, role: role };
    
    if (password && password.trim().length >= 6) {
        data.password = password.trim();
    }
    
    if (role === 'teacher') {
        var subBoxes = document.querySelectorAll('#teacher-subjects-checkboxes input:checked');
        var clsBoxes = document.querySelectorAll('#teacher-classes-checkboxes input:checked');
        data.assignedSubjects = Array.from(subBoxes).map(function(cb) { return cb.value; });
        data.assignedClasses = Array.from(clsBoxes).map(function(cb) { return cb.value; });
    }
    
    if (role === 'student') {
        var rollInput = getField('student-roll');
        var deptSelect = findDeptSelectInModal('modal-user');
        var classSelect = null;
        
        if (modal) {
            var selects = modal.querySelectorAll('select');
            for (var i = 0; i < selects.length; i++) {
                var identifier = (selects[i].id || selects[i].name || '').toLowerCase();
                if (identifier.indexOf('class') !== -1 && identifier.indexOf('filter') === -1) {
                    classSelect = selects[i];
                    break;
                }
            }
        }
        if (!classSelect) classSelect = getField('student-class');
        
        var rollNumber = rollInput ? rollInput.value.trim() : '';
        var department = deptSelect ? deptSelect.value : '';
        var studentClass = classSelect ? classSelect.value : '';
        
        if (!rollNumber) {
            showToast('Roll Number is required', 'warning');
            if (rollInput) { rollInput.focus(); flashBorder(rollInput); }
            return;
        }
        if (!department) {
            showToast('Please select a Department', 'warning');
            if (deptSelect) { deptSelect.focus(); flashBorder(deptSelect); }
            return;
        }
        
        if (studentClass === 'Loading...' || studentClass === 'Failed to load') {
            showToast('Please wait for classes to finish loading, or try selecting the department again.', 'warning');
            return;
        }

        if (!studentClass) {
            showToast('Please select a Class', 'warning');
            if (classSelect) { classSelect.focus(); flashBorder(classSelect); }
            return;
        }
        
        data.rollNumber = rollNumber;
        data.department = department;
        data.class = studentClass;
    }
    
    if (!id && !data.password) {
        showToast('Password is required (min 6 characters)', 'warning');
        if (passwordInput) { passwordInput.focus(); flashBorder(passwordInput); }
        return;
    }
    
    if (id && password && password.trim().length > 0 && password.trim().length < 6) {
        showToast('New password must be at least 6 characters', 'warning');
        if (passwordInput) passwordInput.focus();
        return;
    }
    
    saveUserToServer(id, data, role);
}

function flashBorder(element) {
    if (!element) return;
    element.style.borderColor = 'var(--accent4)';
    element.style.boxShadow = '0 0 0 3px var(--accent4-dim)';
    setTimeout(function() {
        element.style.borderColor = '';
        element.style.boxShadow = '';
    }, 2500);
}

async function saveUserToServer(id, data, role) {
    try {
        showLoading();
        if (id) {
            await api('/api/users/' + id, { method: 'PUT', body: JSON.stringify(data) });
            showToast((role === 'teacher' ? 'Teacher' : 'Student') + ' updated successfully', 'success');
        } else {
            await api('/api/users', { method: 'POST', body: JSON.stringify(data) });
            showToast((role === 'teacher' ? 'Teacher' : 'Student') + ' created successfully', 'success');
        }
        hideLoading();
        closeModal('modal-user');
        if (role === 'teacher') loadTeachers();
        else loadStudents(currentFilterDept, currentFilterClass);
    } catch (error) {
        hideLoading();
        console.error('saveUserToServer error:', error);
        showToast('Save failed: ' + error.message, 'error');
    }
}

function deleteUser(id, name) {
    showConfirm('Delete "' + name + '"? This cannot be undone.', async function() {
        try {
            showLoading();
            await api('/api/users/' + id, { method: 'DELETE' });
            hideLoading();
            showToast('User deleted', 'success');
            loadStudents(currentFilterDept, currentFilterClass);
            loadTeachers();
        } catch (error) {
            hideLoading();
            showToast('Error: ' + error.message, 'error');
        }
    });
}
