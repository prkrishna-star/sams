// ===================================================================
// AttendEase - Student Dashboard
// FIXED: Backend now returns correct data, frontend renders accurately
// ===================================================================

async function loadStudentDashboard() {
    try {
        // Fetch summary data from the fixed backend endpoint
        var data = await api('/api/attendance/my-summary');
        
        // Update header info from the user object stored in currentUser
        document.getElementById('student-name-display').textContent = currentUser.name;
        
        var deptName = '';
        var className = '';
        // currentUser was populated by /api/auth/me which includes department and class
        if (currentUser.department) deptName = currentUser.department.name || '';
        if (currentUser.class) className = currentUser.class.name || '';
        
        document.getElementById('student-details-display').textContent = 
            (currentUser.rollNumber || '') + ' | ' + deptName + ' | ' + className;
        
        document.getElementById('student-total-classes').textContent = data.totalClasses;
        document.getElementById('student-present-classes').textContent = data.presentClasses;
        document.getElementById('student-absent-classes').textContent = data.totalClasses - data.presentClasses;

        var pct = data.overallPercentage;
        document.getElementById('overall-percentage').textContent = pct + '%';
        
        var ring = document.getElementById('overall-progress-ring');
        var circ = 2 * Math.PI * 54;
        
        // Set text color based on percentage
        var textColor = '#00f0ff';
        var strokeId = 'progressGradient';
        if (pct < 50) {
            textColor = '#ff6b6b';
            strokeId = 'progressGradientDanger';
        } else if (pct < 75) {
            textColor = '#fbbf24';
            strokeId = 'progressGradientWarn';
        }
        document.querySelector('.progress-value').style.color = textColor;

        // Step 1: Set base state without transition using raw attributes
        ring.setAttribute('stroke-dasharray', circ);
        ring.setAttribute('stroke-dashoffset', circ);
        ring.setAttribute('stroke', 'url(#' + strokeId + ')');
        
        // Step 2: Force browser to register the full circle
        void ring.getBoundingClientRect();

        // Step 3: Animate to target percentage
        var targetOffset = circ - (pct / 100) * circ;
        setTimeout(function() {
            ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            ring.style.strokeDashoffset = targetOffset;
        }, 100);

        // Subject-wise attendance rings
        var sl = document.getElementById('subject-attendance-list');
        if (!data.summary || data.summary.length === 0) {
            sl.innerHTML = '<p class="empty-state">No attendance data available yet</p>';
        } else {
            sl.innerHTML = data.summary.map(function(s, i) {
                var subStrokeId = 'progressGradient';
                var subTextColor = '#00f0ff';
                var statusText = 'Good';
                var badgeClass = 'present';
                
                if (s.percentage < 50) {
                    subStrokeId = 'progressGradientDanger';
                    subTextColor = '#ff6b6b';
                    statusText = 'Critical';
                    badgeClass = 'absent';
                } else if (s.percentage < 75) {
                    subStrokeId = 'progressGradientWarn';
                    subTextColor = '#fbbf24';
                    statusText = 'Warning';
                    badgeClass = 'project';
                }

                var ringId = 'sub-ring-' + i;
                var circumference = 2 * Math.PI * 22;
                
                return '<div class="subject-att-item" style="animation: secIn 0.4s var(--ease) ' + (i * 0.1) + 's backwards">' +
                    '<div class="subject-att-ring-wrapper">' +
                        '<svg viewBox="0 0 56 56" class="subject-ring-svg">' +
                            '<circle cx="28" cy="28" r="22" class="subject-ring-bg"/>' +
                            '<circle cx="28" cy="28" r="22" class="subject-ring-fill" id="' + ringId + '"/>' +
                        '</svg>' +
                        '<span class="subject-ring-text" style="color: ' + subTextColor + '">' + s.percentage + '%</span>' +
                    '</div>' +
                    '<div class="subject-att-info">' +
                        '<div class="subject-att-name">' + s.subject.name + '</div>' +
                        '<div class="subject-att-details">' +
                            s.subject.code + ' | P: ' + s.presentClasses + ' | A: ' + s.absentClasses + ' | Total: ' + s.totalClasses +
                            ' <span class="badge badge-' + badgeClass + '" style="margin-left: 8px;">' + statusText + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');

            // Animate each subject ring with guaranteed rendering
            setTimeout(function() {
                for (var i = 0; i < data.summary.length; i++) {
                    var s = data.summary[i];
                    var ringEl = document.getElementById('sub-ring-' + i);
                    if (!ringEl) continue;

                    var circumference = 2 * Math.PI * 22;
                    var subStrokeId = 'progressGradient';
                    if (s.percentage < 50) subStrokeId = 'progressGradientDanger';
                    else if (s.percentage < 75) subStrokeId = 'progressGradientWarn';

                    // Set base state
                    ringEl.style.transition = 'none';
                    ringEl.setAttribute('stroke-dasharray', circumference);
                    ringEl.setAttribute('stroke-dashoffset', circumference);
                    ringEl.setAttribute('stroke', 'url(#' + subStrokeId + ')');

                    // Force reflow
                    void ringEl.getBoundingClientRect();

                    // Animate to target
                    var targetOffset = circumference - (s.percentage / 100) * circumference;
                    ringEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
                    ringEl.style.strokeDashoffset = targetOffset;
                }
            }, 200);
        }

        // Load attendance history table
        loadStudentHistory();
        
    } catch (e) {
        console.error('loadStudentDashboard error:', e);
        showToast('Error loading attendance: ' + e.message, 'error');
    }
}

async function loadStudentHistory() {
    try {
        var h = await api('/api/attendance?period=month');
        var tb = document.querySelector('#student-history-table tbody');
        
        if (!h || h.length === 0) {
            tb.innerHTML = '<tr><td colspan="3" class="empty-state">No attendance history found for this period</td></tr>';
        } else {
            tb.innerHTML = h.slice(0, 60).map(function(r) {
                var statusClass = r.status === 'Present' ? 'present' : 'absent';
                return '<tr>' +
                    '<td>' + formatDate(r.date) + '</td>' +
                    '<td>' + (r.subject?.name || '-') + ' <span style="color:var(--text-muted);font-size:.78rem">(' + (r.subject?.code || '') + ')</span></td>' +
                    '<td><span class="badge badge-' + statusClass + '">' + r.status + '</span></td>' +
                '</tr>';
            }).join('');
        }
    } catch (e) {
        console.error('History error:', e);
    }
}

function printStudentReport() {
    window.print();
}