require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const email = 'admin@college.edu';
        const password = 'admin123';

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            console.log('❌ User not found');
            process.exit(0);
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log('❌ Invalid password');
        } else {
            console.log('✅ Login successful');
            console.log('👤 User:', user.name);
            console.log('🔑 Role:', user.role);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

testLogin();