require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const User = require('./models/User');
const Department = require('./models/Department');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Attendance = require('./models/Attendance');


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));



mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

const roleMiddleware = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient permissions.' });
    next();
};

// Helper to normalize date strings to local midnight
function toLocalDate(dateStr) {
    var parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
}

// ===================== AUTH ROUTES =====================
app.post('/api/auth/login', async (req, res) => {
    try {
        var email = req.body.email;
        var password = req.body.password;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
        var user = await User.findOne({ email: email, isActive: true }).populate('department class assignedSubjects assignedClasses');
        if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
        var isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });
        var token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
        res.json({ token: token, user: user });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
    try {
        var currentPassword = req.body.currentPassword;
        var newPassword = req.body.newPassword;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords are required.' });
        if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        var user = await User.findById(req.user.id);
        var isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error changing password.' });
    }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        var user = await User.findById(req.user.id).populate('department class assignedSubjects assignedClasses');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// ===================== DEPARTMENTS =====================
app.post('/api/departments', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var dept = new Department(req.body);
        await dept.save();
        res.status(201).json(dept);
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Department name or code already exists.' });
        res.status(500).json({ message: 'Error creating department.' });
    }
});
app.get('/api/departments', authMiddleware, async (req, res) => {
    try { res.json(await Department.find({ isActive: true }).sort({ name: 1 })); }
    catch (error) { res.status(500).json({ message: 'Error fetching departments.' }); }
});
app.put('/api/departments/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!dept) return res.status(404).json({ message: 'Department not found.' });
        res.json(dept);
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Code already exists.' });
        res.status(500).json({ message: 'Error updating department.' });
    }
});
app.delete('/api/departments/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try { await Department.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ message: 'Department deleted.' }); }
    catch (error) { res.status(500).json({ message: 'Error deleting department.' }); }
});

// ===================== CLASSES =====================
app.post('/api/classes', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var cls = new Class(req.body);
        await cls.save();
        await cls.populate('department');
        res.status(201).json(cls);
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Class code already exists.' });
        res.status(500).json({ message: 'Error creating class.' });
    }
});
app.get('/api/classes', authMiddleware, async (req, res) => {
    try { res.json(await Class.find({ isActive: true }).populate('department').sort({ name: 1 })); }
    catch (error) { res.status(500).json({ message: 'Error fetching classes.' }); }
});
app.get('/api/classes/by-department/:deptId', authMiddleware, async (req, res) => {
    try { res.json(await Class.find({ department: req.params.deptId, isActive: true }).sort({ name: 1 })); }
    catch (error) { res.status(500).json({ message: 'Error fetching classes.' }); }
});
app.put('/api/classes/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var cls = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('department');
        if (!cls) return res.status(404).json({ message: 'Class not found.' });
        res.json(cls);
    } catch (error) { res.status(500).json({ message: 'Error updating class.' }); }
});
app.delete('/api/classes/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try { await Class.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ message: 'Class deleted.' }); }
    catch (error) { res.status(500).json({ message: 'Error deleting class.' }); }
});

// ===================== SUBJECTS =====================
app.post('/api/subjects', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var sub = new Subject(req.body);
        await sub.save();
        await sub.populate('department');
        res.status(201).json(sub);
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Subject code already exists.' });
        res.status(500).json({ message: 'Error creating subject.' });
    }
});
app.get('/api/subjects', authMiddleware, async (req, res) => {
    try { res.json(await Subject.find({ isActive: true }).populate('department').sort({ name: 1 })); }
    catch (error) { res.status(500).json({ message: 'Error fetching subjects.' }); }
});
app.put('/api/subjects/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var sub = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('department');
        if (!sub) return res.status(404).json({ message: 'Subject not found.' });
        res.json(sub);
    } catch (error) { res.status(500).json({ message: 'Error updating subject.' }); }
});
app.delete('/api/subjects/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try { await Subject.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ message: 'Subject deleted.' }); }
    catch (error) { res.status(500).json({ message: 'Error deleting subject.' }); }
});

// ===================== USERS =====================
app.post('/api/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var body = req.body;
        var existingUser = await User.findOne({ email: body.email });
        if (existingUser) return res.status(400).json({ message: 'Email already registered.' });
        var userData = { name: body.name, email: body.email, password: body.password, role: body.role };
        if (body.role === 'student') { userData.department = body.department; userData.class = body.class; userData.rollNumber = body.rollNumber; }
        if (body.role === 'teacher') { userData.assignedSubjects = body.assignedSubjects || []; userData.assignedClasses = body.assignedClasses || []; }
        var user = new User(userData);
        await user.save();
        await user.populate('department class assignedSubjects assignedClasses');
        res.status(201).json(user);
    } catch (error) { res.status(500).json({ message: 'Error creating user: ' + error.message }); }
});
app.get('/api/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var filter = { isActive: true };
        if (req.query.role) filter.role = req.query.role;
        if (req.query.department) filter.department = req.query.department;
        if (req.query.class) filter.class = req.query.class;
        res.json(await User.find(filter).populate('department class assignedSubjects assignedClasses').sort({ name: 1 }));
    } catch (error) { res.status(500).json({ message: 'Error fetching users.' }); }
});
app.get('/api/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var user = await User.findById(req.params.id).populate('department class assignedSubjects assignedClasses');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (error) { res.status(500).json({ message: 'Error fetching user.' }); }
});
app.put('/api/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var body = req.body;
        var update = { ...body, updatedAt: Date.now() };
        if (body.password && body.password.trim()) update.password = body.password;
        var user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('department class assignedSubjects assignedClasses');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (error) { res.status(500).json({ message: 'Error updating user.' }); }
});
app.delete('/api/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try { await User.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ message: 'User deleted.' }); }
    catch (error) { res.status(500).json({ message: 'Error deleting user.' }); }
});

// ===================== ATTENDANCE =====================
app.get('/api/attendance/students-by-class/:classId', authMiddleware, roleMiddleware('admin', 'teacher'), async (req, res) => {
    try { res.json(await User.find({ class: req.params.classId, role: 'student', isActive: true }).sort({ rollNumber: 1 })); }
    catch (error) { res.status(500).json({ message: 'Error fetching students.' }); }
});

app.post('/api/attendance/mark', authMiddleware, roleMiddleware('admin', 'teacher'), async (req, res) => {
    try {
        var body = req.body;
        if (!body.classId || !body.subjectId || !body.date || !body.records || !body.records.length) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        var attendanceDate = toLocalDate(body.date);
        var nextDay = new Date(attendanceDate.getTime() + 86400000);
        var addedCount = 0, duplicateCount = 0;
        for (var i = 0; i < body.records.length; i++) {
            var record = body.records[i];
            var existing = await Attendance.findOne({
                student: record.studentId,
                subject: body.subjectId,
                date: { $gte: attendanceDate, $lt: nextDay }
            });
            if (existing) {
                existing.status = record.status;
                existing.teacher = req.user.id;
                await existing.save();
                duplicateCount++;
            } else {
                await Attendance.create({
                    student: record.studentId,
                    teacher: req.user.id,
                    subject: body.subjectId,
                    class: body.classId,
                    date: attendanceDate,
                    status: record.status
                });
                addedCount++;
            }
        }
        res.json({ message: 'Attendance processed. ' + addedCount + ' new, ' + duplicateCount + ' updated.' });
    } catch (error) { res.status(500).json({ message: 'Error marking attendance: ' + error.message }); }
});

app.get('/api/attendance', authMiddleware, async (req, res) => {
    try {
        var filter = {};
        if (req.query.classId) filter.class = req.query.classId;
        if (req.query.subjectId) filter.subject = req.query.subjectId;
        if (req.query.studentId) filter.student = req.query.studentId;

        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var period = req.query.period;

        if (period === 'today') {
            filter.date = { $gte: today, $lt: new Date(today.getTime() + 86400000) };
        } else if (period === 'week') {
            var wa = new Date(today.getTime() - 7 * 86400000);
            filter.date = { $gte: wa, $lt: new Date(today.getTime() + 86400000) };
        } else if (period === 'month') {
            var ma = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            filter.date = { $gte: ma, $lt: new Date(today.getTime() + 86400000) };
        } else if (req.query.dateFrom && req.query.dateTo) {
            var from = toLocalDate(req.query.dateFrom);
            var to = new Date(toLocalDate(req.query.dateTo).getTime() + 86400000);
            filter.date = { $gte: from, $lt: to };
        } else if (req.query.dateFrom) {
            filter.date = { $gte: toLocalDate(req.query.dateFrom) };
        }

        if (req.user.role === 'student') filter.student = req.user.id;
        else if (req.user.role === 'teacher') filter.teacher = req.user.id;

        res.json(await Attendance.find(filter).populate('student', 'name rollNumber').populate('teacher', 'name').populate('subject', 'name code').populate('class', 'name code').sort({ date: -1 }));
    } catch (error) { res.status(500).json({ message: 'Error fetching attendance.' }); }
});

// ===================== FIX: STUDENT SUMMARY (fetches full user first) =====================
app.get('/api/attendance/my-summary', authMiddleware, roleMiddleware('student'), async (req, res) => {
    try {
        // CRITICAL FIX: req.user from JWT only has {id, role, name}
        // We MUST fetch the full user from DB to get the populated department
        var fullUser = await User.findById(req.user.id).populate('department class');
        
        if (!fullUser || !fullUser.department) {
            return res.json({
                summary: [],
                overallPercentage: 0,
                totalClasses: 0,
                presentClasses: 0
            });
        }

        var studentId = req.user.id;
        var departmentId = fullUser.department._id;

        // Find subjects for this student's department
        var subjects = await Subject.find({ department: departmentId, isActive: true });

        var summary = [];
        for (var i = 0; i < subjects.length; i++) {
            var subject = subjects[i];
            var total = await Attendance.countDocuments({ student: studentId, subject: subject._id });
            var present = await Attendance.countDocuments({ student: studentId, subject: subject._id, status: 'Present' });
            var percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            summary.push({
                subject: subject,
                totalClasses: total,
                presentClasses: present,
                absentClasses: total - present,
                percentage: percentage
            });
        }

        var totalAll = 0;
        var presentAll = 0;
        for (var j = 0; j < summary.length; j++) {
            totalAll += summary[j].totalClasses;
            presentAll += summary[j].presentClasses;
        }
        var overallPercentage = totalAll > 0 ? Math.round((presentAll / totalAll) * 100) : 0;

        res.json({
            summary: summary,
            overallPercentage: overallPercentage,
            totalClasses: totalAll,
            presentClasses: presentAll
        });
    } catch (error) {
        console.error('my-summary error:', error);
        res.status(500).json({ message: 'Error fetching summary.' });
    }
});

// ===================== FIX: TEACHER STATS (fetches full user first) =====================
app.get('/api/stats/teacher', authMiddleware, roleMiddleware('teacher'), async (req, res) => {
    try {
        // CRITICAL FIX: Same issue - fetch full user from DB
        var fullUser = await User.findById(req.user.id).populate('assignedClasses assignedSubjects');
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var todayMarked = await Attendance.countDocuments({ teacher: req.user.id, date: { $gte: today } });
        res.json({
            assignedClasses: fullUser.assignedClasses ? fullUser.assignedClasses.length : 0,
            assignedSubjects: fullUser.assignedSubjects ? fullUser.assignedSubjects.length : 0,
            todayMarked: todayMarked
        });
    } catch (error) { res.status(500).json({ message: 'Error fetching stats.' }); }
});

app.get('/api/attendance/class-summary/:classId/:subjectId', authMiddleware, roleMiddleware('admin', 'teacher'), async (req, res) => {
    try {
        var students = await User.find({ class: req.params.classId, role: 'student', isActive: true }).sort({ rollNumber: 1 });
        var summary = [];
        for (var i = 0; i < students.length; i++) {
            var student = students[i];
            var total = await Attendance.countDocuments({ student: student._id, subject: req.params.subjectId, class: req.params.classId });
            var present = await Attendance.countDocuments({ student: student._id, subject: req.params.subjectId, class: req.params.classId, status: 'Present' });
            summary.push({ student: { _id: student._id, name: student.name, rollNumber: student.rollNumber }, totalClasses: total, presentClasses: present, absentClasses: total - present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 });
        }
        res.json(summary);
    } catch (error) { res.status(500).json({ message: 'Error fetching class summary.' }); }
});

app.get('/api/stats/admin', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        res.json({
            totalStudents: await User.countDocuments({ role: 'student', isActive: true }),
            totalTeachers: await User.countDocuments({ role: 'teacher', isActive: true }),
            totalDepartments: await Department.countDocuments({ isActive: true }),
            totalClasses: await Class.countDocuments({ isActive: true }),
            totalSubjects: await Subject.countDocuments({ isActive: true }),
            todayAttendance: await Attendance.countDocuments({ date: { $gte: today } })
        });
    } catch (error) { res.status(500).json({ message: 'Error fetching stats.' }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

var PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('🚀 Server running on http://localhost:' + PORT));