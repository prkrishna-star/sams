require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Attendance = require('./models/Attendance');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🌱 Seeding database...');
        await Promise.all([User.deleteMany({}), Department.deleteMany({}), Class.deleteMany({}), Subject.deleteMany({}), Attendance.deleteMany({})]);

        const cse = await Department.create({ name: 'Computer Science & Engineering', code: 'CSE', hod: 'Dr. K. Ramachandran', description: 'Premier CSE department with AI/ML specialization' });
        const ece = await Department.create({ name: 'Electronics & Communication', code: 'ECE', hod: 'Dr. P. Lakshmi Devi', description: 'Leading ECE department with VLSI focus' });
        const mech = await Department.create({ name: 'Mechanical Engineering', code: 'MECH', hod: 'Dr. S. Krishnan', description: 'Core engineering with thermal & design streams' });
        const civil = await Department.create({ name: 'Civil Engineering', code: 'CIVIL', hod: 'Dr. M. Subramaniam', description: 'Structural engineering and construction management' });

        const cseA = await Class.create({ name: 'CSE - Section A', code: 'CSE-A', department: cse._id, semester: 3, year: 2 });
        const cseB = await Class.create({ name: 'CSE - Section B', code: 'CSE-B', department: cse._id, semester: 3, year: 2 });
        const eceA = await Class.create({ name: 'ECE - Section A', code: 'ECE-A', department: ece._id, semester: 3, year: 2 });
        const mechA = await Class.create({ name: 'MECH - Section A', code: 'MECH-A', department: mech._id, semester: 5, year: 3 });

        const ds = await Subject.create({ name: 'Data Structures', code: 'CS301', department: cse._id, semester: 3, creditHours: 4, type: 'Theory' });
        const dbms = await Subject.create({ name: 'Database Management Systems', code: 'CS302', department: cse._id, semester: 3, creditHours: 4, type: 'Theory' });
        const oops = await Subject.create({ name: 'Object Oriented Programming', code: 'CS303', department: cse._id, semester: 3, creditHours: 3, type: 'Theory' });
        const dsLab = await Subject.create({ name: 'Data Structures Lab', code: 'CS304', department: cse._id, semester: 3, creditHours: 2, type: 'Lab' });
        const oopsLab = await Subject.create({ name: 'OOP Lab', code: 'CS305', department: cse._id, semester: 3, creditHours: 2, type: 'Lab' });
        const signals = await Subject.create({ name: 'Signals & Systems', code: 'EC301', department: ece._id, semester: 3, creditHours: 4, type: 'Theory' });
        const ecLab = await Subject.create({ name: 'Electronic Circuits Lab', code: 'EC304', department: ece._id, semester: 3, creditHours: 2, type: 'Lab' });
        const analogComm = await Subject.create({ name: 'Analog Communication', code: 'EC302', department: ece._id, semester: 3, creditHours: 3, type: 'Theory' });
        const thermo = await Subject.create({ name: 'Thermodynamics', code: 'ME501', department: mech._id, semester: 5, creditHours: 4, type: 'Theory' });
        const fm = await Subject.create({ name: 'Fluid Mechanics', code: 'ME502', department: mech._id, semester: 5, creditHours: 3, type: 'Theory' });
        const mdLab = await Subject.create({ name: 'Machine Design Lab', code: 'ME503', department: mech._id, semester: 5, creditHours: 2, type: 'Lab' });

        await User.create({ name: 'Admin Ramanan', email: 'admin@college.edu', password: 'admin123', role: 'admin' });

        const t1 = await User.create({ name: 'Prof. Anand Sharma', email: 'anand@college.edu', password: 'teacher123', role: 'teacher', assignedSubjects: [ds._id, dsLab._id], assignedClasses: [cseA._id, cseB._id] });
        const t2 = await User.create({ name: 'Dr. Priya Venkatesh', email: 'priya@college.edu', password: 'teacher123', role: 'teacher', assignedSubjects: [dbms._id, oops._id, oopsLab._id], assignedClasses: [cseA._id] });
        const t3 = await User.create({ name: 'Prof. Karthik Rajan', email: 'karthik@college.edu', password: 'teacher123', role: 'teacher', assignedSubjects: [signals._id, analogComm._id, ecLab._id], assignedClasses: [eceA._id] });
        const t4 = await User.create({ name: 'Dr. Meera Nair', email: 'meera@college.edu', password: 'teacher123', role: 'teacher', assignedSubjects: [thermo._id, fm._id, mdLab._id], assignedClasses: [mechA._id] });

        // Each student has an "absentRate" to make realistic patterns
        const cseAStudents = [
            { name: 'Arjun Krishnamurthy', email: 'arjun.k@student.edu', rollNumber: '21CS001', absentRate: 0.05 },
            { name: 'Divya Subramaniam', email: 'divya.s@student.edu', rollNumber: '21CS002', absentRate: 0.12 },
            { name: 'Karthik Narayanan', email: 'karthik.n@student.edu', rollNumber: '21CS003', absentRate: 0.35 },
            { name: 'Priya Maheshwari', email: 'priya.m@student.edu', rollNumber: '21CS004', absentRate: 0.08 },
            { name: 'Rahul Iyer', email: 'rahul.i@student.edu', rollNumber: '21CS005', absentRate: 0.45 },
            { name: 'Sneha Balakrishnan', email: 'sneha.b@student.edu', rollNumber: '21CS006', absentRate: 0.02 },
            { name: 'Vishnu Varma', email: 'vishnu.v@student.edu', rollNumber: '21CS007', absentRate: 0.20 },
            { name: 'Ananya Raman', email: 'ananya.r@student.edu', rollNumber: '21CS008', absentRate: 0.15 },
            { name: 'Deepak Chidambaram', email: 'deepak.c@student.edu', rollNumber: '21CS009', absentRate: 0.55 },
            { name: 'Kavitha Srinivasan', email: 'kavitha.s@student.edu', rollNumber: '21CS010', absentRate: 0.10 },
            { name: 'Sanjay Govindarajan', email: 'sanjay.g@student.edu', rollNumber: '21CS011', absentRate: 0.30 },
            { name: 'Meenakshi Sundaram', email: 'meenakshi.s@student.edu', rollNumber: '21CS012', absentRate: 0.06 },
        ];
        const cseBStudents = [
            { name: 'Aditya Pandian', email: 'aditya.p@student.edu', rollNumber: '21CS013', absentRate: 0.18 },
            { name: 'Bhuvanaeshwari K', email: 'bhuvana.e@student.edu', rollNumber: '21CS014', absentRate: 0.07 },
            { name: 'Chandra Mohan', email: 'chandra.m@student.edu', rollNumber: '21CS015', absentRate: 0.40 },
            { name: 'Dharani Rajkumar', email: 'dharani.r@student.edu', rollNumber: '21CS016', absentRate: 0.22 },
            { name: 'Eshwar Prasad', email: 'eshwar.p@student.edu', rollNumber: '21CS017', absentRate: 0.14 },
            { name: 'Gayathri Devi', email: 'gayathri.d@student.edu', rollNumber: '21CS018', absentRate: 0.03 },
            { name: 'Harish Venkataraman', email: 'harish.v@student.edu', rollNumber: '21CS019', absentRate: 0.50 },
            { name: 'Ishwarya Lakshmi', email: 'ishwarya.l@student.edu', rollNumber: '21CS020', absentRate: 0.09 },
            { name: 'Jagadeesh Kumar', email: 'jagadeesh.k@student.edu', rollNumber: '21CS021', absentRate: 0.28 },
            { name: 'Lakshmi Narayanan', email: 'lakshmi.n@student.edu', rollNumber: '21CS022', absentRate: 0.11 },
        ];
        const eceAStudents = [
            { name: 'Mohan Raj', email: 'mohan.r@student.edu', rollNumber: '21EC001', absentRate: 0.10 },
            { name: 'Nithya Devi', email: 'nithya.d@student.edu', rollNumber: '21EC002', absentRate: 0.25 },
            { name: 'Praveen Kumar', email: 'praveen.k@student.edu', rollNumber: '21EC003', absentRate: 0.38 },
            { name: 'Revathi Shankar', email: 'revathi.s@student.edu', rollNumber: '21EC004', absentRate: 0.06 },
            { name: 'Suresh Babu', email: 'suresh.b@student.edu', rollNumber: '21EC005', absentRate: 0.42 },
            { name: 'Uma Maheswari', email: 'uma.m@student.edu', rollNumber: '21EC006', absentRate: 0.04 },
            { name: 'Vijay Anand', email: 'vijay.a@student.edu', rollNumber: '21EC007', absentRate: 0.33 },
            { name: 'Yamini Priya', email: 'yamini.p@student.edu', rollNumber: '21EC008', absentRate: 0.16 },
        ];
        const mechAStudents = [
            { name: 'Arunachalam P', email: 'arunachalam@student.edu', rollNumber: '20ME001', absentRate: 0.20 },
            { name: 'Bharathi Raja', email: 'bharathi.r@student.edu', rollNumber: '20ME002', absentRate: 0.08 },
            { name: 'Chandrasekaran V', email: 'chandrasekaran@student.edu', rollNumber: '20ME003', absentRate: 0.48 },
            { name: 'Devasena M', email: 'devasena@student.edu', rollNumber: '20ME004', absentRate: 0.13 },
            { name: 'Elango Murugan', email: 'elango.m@student.edu', rollNumber: '20ME005', absentRate: 0.36 },
            { name: 'Fontina Rose', email: 'fontina.r@student.edu', rollNumber: '20ME006', absentRate: 0.05 },
            { name: 'Ganesh Moorthy', email: 'ganesh.m@student.edu', rollNumber: '20ME007', absentRate: 0.60 },
        ];

        const createdCseA = await User.create(cseAStudents.map(s => ({ ...s, password: 'student123', role: 'student', department: cse._id, class: cseA._id })));
        const createdCseB = await User.create(cseBStudents.map(s => ({ ...s, password: 'student123', role: 'student', department: cse._id, class: cseB._id })));
        const createdEceA = await User.create(eceAStudents.map(s => ({ ...s, password: 'student123', role: 'student', department: ece._id, class: eceA._id })));
        const createdMechA = await User.create(mechAStudents.map(s => ({ ...s, password: 'student123', role: 'student', department: mech._id, class: mechA._id })));

        // Build student map with absent rates
        const studentAbsentRates = {};
        [...cseAStudents, ...cseBStudents, ...eceAStudents, ...mechAStudents].forEach(s => {
            studentAbsentRates[s.email] = s.absentRate;
        });

        const allStudents = { cseA: createdCseA, cseB: createdCseB, eceA: createdEceA, mechA: createdMechA };
        const records = [];
        const now = new Date();

        // Subject-teacher-class mappings
        const schedules = [
            { students: 'cseA', subject: ds, teacher: t1, class: cseA, skipChance: 0.12 },
            { students: 'cseB', subject: ds, teacher: t1, class: cseB, skipChance: 0.15 },
            { students: 'cseA', subject: dsLab, teacher: t1, class: cseA, skipChance: 0.18 },
            { students: 'cseA', subject: dbms, teacher: t2, class: cseA, skipChance: 0.08 },
            { students: 'cseA', subject: oops, teacher: t2, class: cseA, skipChance: 0.10 },
            { students: 'cseA', subject: oopsLab, teacher: t2, class: cseA, skipChance: 0.15 },
            { students: 'eceA', subject: signals, teacher: t3, class: eceA, skipChance: 0.10 },
            { students: 'eceA', subject: analogComm, teacher: t3, class: eceA, skipChance: 0.14 },
            { students: 'eceA', subject: ecLab, teacher: t3, class: eceA, skipChance: 0.16 },
            { students: 'mechA', subject: thermo, teacher: t4, class: mechA, skipChance: 0.06 },
            { students: 'mechA', subject: fm, teacher: t4, class: mechA, skipChance: 0.11 },
            { students: 'mechA', subject: mdLab, teacher: t4, class: mechA, skipChance: 0.20 },
        ];

        for (let dayOffset = 1; dayOffset <= 45; dayOffset++) {
            const date = new Date(now);
            date.setDate(date.getDate() - dayOffset);
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            for (const sched of schedules) {
                if (Math.random() < sched.skipChance) continue; // class cancelled sometimes
                for (const student of allStudents[sched.students]) {
                    const rate = studentAbsentRates[student.email] || 0.15;
                    const status = Math.random() < rate ? 'Absent' : 'Present';
                    records.push({ student: student._id, teacher: sched.teacher._id, subject: sched.subject._id, class: sched.class._id, date: dateOnly, status });
                }
            }
        }

        await Attendance.insertMany(records);
        console.log('✅ Seeding completed! Generated', records.length, 'attendance records.');
        console.log('\n📋 Login Credentials:');
        console.log('──────────────────────────────────────────────');
        console.log('Admin:   admin@college.edu   / admin123');
        console.log('Teacher: anand@college.edu   / teacher123');
        console.log('Teacher: priya@college.edu   / teacher123');
        console.log('Teacher: karthik@college.edu / teacher123');
        console.log('Teacher: meera@college.edu   / teacher123');
        console.log('Student: arjun.k@student.edu  / student123  (96% attendance)');
        console.log('Student: karthik.n@student.edu/ student123  (63% attendance)');
        console.log('Student: deepak.c@student.edu / student123  (42% attendance)');
        console.log('Student: rahul.i@student.edu  / student123  (52% attendance)');
        console.log('Student: mohan.r@student.edu  / student123  (88% attendance)');
        console.log('Student: ganesh.m@student.edu / student123  (38% attendance)');
        console.log('──────────────────────────────────────────────');
        process.exit(0);
    } catch (error) { console.error('❌ Seeding error:', error); process.exit(1); }
};
seedData();