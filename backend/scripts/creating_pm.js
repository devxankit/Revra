const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import PM model
const PM = require('../models/PM');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Function to create PM user
const createPMUser = async () => {
  try {
    await connectDB();
    
    // Check if PM user already exists
    const existingPM = await PM.findOne({ email: 'pm@appzeto.com' });
    
    if (existingPM) {
      console.log('PM user already exists with email: pm@appzeto.com');
      console.log('PM details:', {
        id: existingPM._id,
        name: existingPM.name,
        email: existingPM.email,
        role: existingPM.role,
        department: existingPM.department,
        employeeId: existingPM.employeeId,
        isActive: existingPM.isActive,
        createdAt: existingPM.createdAt
      });
      console.log('\nLogin credentials:');
      console.log('Email: pm@appzeto.com');
      console.log('Password: PM@123');
      console.log('Role: project_manager');
      return;
    }

    // Create PM user
    const pmData = {
      name: 'Appzeto PM',
      email: 'pm@appzeto.com',
      password: 'PM@123',
      role: 'project-manager',
      department: 'Development',
      employeeId: 'PM001',
      phone: '+1234567890',
      dateOfBirth: new Date('1985-01-01'),
      joiningDate: new Date(),
      skills: ['Project Management', 'Agile', 'Scrum', 'Team Leadership'],
      experience: 5,
      isActive: true
    };

    const pm = await PM.create(pmData);
    
    console.log('PM user created successfully!');
    console.log('PM details:', {
      id: pm._id,
      name: pm.name,
      email: pm.email,
      role: pm.role,
      department: pm.department,
      employeeId: pm.employeeId,
      isActive: pm.isActive,
      createdAt: pm.createdAt
    });
    
    console.log('\nLogin credentials:');
    console.log('Email: pm@appzeto.com');
    console.log('Password: PM@123');
    console.log('Role: project-manager');
    
  } catch (error) {
    console.error('Error creating PM user:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
};


// Main execution
const main = async () => {
  console.log('PM User Creation Script');
  console.log('======================\n');
  
  await createPMUser();
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run the script
main();
