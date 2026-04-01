const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import Employee model
const Employee = require('../models/Employee');

const createDeveloperEmployee = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');

    // Check if developer employee already exists
    const existingEmployee = await Employee.findOne({ 
      email: 'developer@appzeto.com' 
    });

    if (existingEmployee) {
      console.log('Developer employee already exists with email: developer@appzeto.com');
      console.log('Employee details:', {
        id: existingEmployee._id,
        name: existingEmployee.name,
        email: existingEmployee.email,
        role: existingEmployee.role,
        department: existingEmployee.department,
        position: existingEmployee.position,
        isActive: existingEmployee.isActive,
        createdAt: existingEmployee.createdAt
      });
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('Developer@123', salt);

      // Create developer employee
      const developerEmployee = new Employee({
        name: 'Appzeto Developer',
        email: 'developer@appzeto.com',
        password: hashedPassword,
        role: 'employee',
        team: 'developer', // Correct team for filtering
        department: 'full-stack', // Valid department value
        phone: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
        employeeId: 'DEV001',
        position: 'Senior Developer',
        joiningDate: new Date(),
        salary: 80000,
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
        experience: 3,
        isActive: true,
        projectsAssigned: [],
        tasksAssigned: [],
        manager: null
      });

      await developerEmployee.save();

      console.log('Developer employee created successfully!');
      console.log('Employee details:', {
        id: developerEmployee._id,
        name: developerEmployee.name,
        email: developerEmployee.email,
        role: developerEmployee.role,
        department: developerEmployee.department,
        position: developerEmployee.position,
        isActive: developerEmployee.isActive,
        createdAt: developerEmployee.createdAt
      });
    }

    console.log('\nLogin credentials:');
    console.log('Email: developer@appzeto.com');
    console.log('Password: Developer@123');
    console.log('Role: employee');
    console.log('Department: development');

  } catch (error) {
    console.error('Error creating developer employee:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
};

// Run the script
createDeveloperEmployee();
