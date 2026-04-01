const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import Employee model
const Employee = require('../models/Employee');

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

// Function to create Employee user
const createEmployeeUser = async () => {
  try {
    await connectDB();
    
    // Check if Employee user already exists
    const existingEmployee = await Employee.findOne({ email: 'employee@appzeto.com' });
    
    if (existingEmployee) {
      console.log('Employee user already exists with email: employee@appzeto.com');
      console.log('Employee details:', {
        id: existingEmployee._id,
        name: existingEmployee.name,
        email: existingEmployee.email,
        role: existingEmployee.role,
        department: existingEmployee.department,
        employeeId: existingEmployee.employeeId,
        position: existingEmployee.position,
        isActive: existingEmployee.isActive,
        createdAt: existingEmployee.createdAt
      });
      console.log('\nLogin credentials:');
      console.log('Email: employee@appzeto.com');
      console.log('Password: Employee@123');
      console.log('Role: employee');
      return;
    }

    // Create Employee user
    const employeeData = {
      name: 'Appzeto Employee',
      email: 'employee@appzeto.com',
      password: 'Employee@123',
      role: 'employee',
      department: 'Development',
      employeeId: 'EMP001',
      phone: '+1234567890',
      position: 'Software Developer',
      joiningDate: new Date('2023-01-15'),
      salary: 50000,
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'TypeScript'],
      experience: 2,
      isActive: true
    };

    const employee = await Employee.create(employeeData);
    
    console.log('Employee user created successfully!');
    console.log('Employee details:', {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      employeeId: employee.employeeId,
      position: employee.position,
      isActive: employee.isActive,
      createdAt: employee.createdAt
    });
    
    console.log('\nLogin credentials:');
    console.log('Email: employee@appzeto.com');
    console.log('Password: Employee@123');
    console.log('Role: employee');
    
  } catch (error) {
    console.error('Error creating Employee user:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
};

// Main execution
const main = async () => {
  console.log('Employee User Creation Script');
  console.log('=============================\n');
  
  await createEmployeeUser();
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run the script
main();
