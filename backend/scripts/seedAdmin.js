require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@edupulse.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Institution Administrator';
const ADMIN_DEPARTMENT = process.env.ADMIN_DEPARTMENT || 'Academic Administration';

async function seedAdmin() {
    try {
        if (!process.env.MONGO_URI) {
            console.error('❌ Error: MONGO_URI is missing in backend/.env');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        let admin = await Faculty.findOne({ email: ADMIN_EMAIL });

        if (admin) {
            console.log(`ℹ️  Admin user already exists with email: ${ADMIN_EMAIL}`);
            if (!admin.isAdmin) {
                admin.isAdmin = true;
                await admin.save();
                console.log('✅ Updated existing account to have isAdmin = true');
            }
        } else {
            admin = await Faculty.create({
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                department: ADMIN_DEPARTMENT,
                isAdmin: true
            });
            console.log('🎉 Admin account created successfully!');
            console.log('----------------------------------------------------');
            console.log(`Email:    ${ADMIN_EMAIL}`);
            console.log(`Password: ${ADMIN_PASSWORD}`);
            console.log('Role:     Admin (Read-Only Cross-Subject Analytics)');
            console.log('----------------------------------------------------');
        }

        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding admin:', err.message);
        process.exit(1);
    }
}

seedAdmin();
