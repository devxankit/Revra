const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const PM = require('../models/PM');
const Employee = require('../models/Employee');
const Client = require('../models/Client');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Create demo projects
const createDemoProjects = async () => {
  try {
    console.log('Creating demo projects...');

    // Get existing users
    const pm = await PM.findOne();
    const client = await Client.findOne();
    const employees = await Employee.find().limit(3);

    if (!pm || !client || employees.length === 0) {
      console.log('Please create PM, Client, and Employee users first');
      return;
    }

    // Project 1: E-commerce Website
    const project1 = await Project.create({
      name: 'E-commerce Website Development',
      description: 'Complete e-commerce platform with user authentication, product catalog, shopping cart, and payment integration.',
      client: client._id,
      projectManager: pm._id,
      status: 'active',
      priority: 'high',
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      assignedTeam: employees.map(emp => emp._id),
      budget: 50000,
      estimatedHours: 800,
      actualHours: 200,
      progress: 25,
      tags: ['web-development', 'e-commerce', 'react', 'nodejs']
    });

    // Project 2: Mobile App
    const project2 = await Project.create({
      name: 'Mobile Banking App',
      description: 'Cross-platform mobile banking application with secure transactions and biometric authentication.',
      client: client._id,
      projectManager: pm._id,
      status: 'planning',
      priority: 'urgent',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      startDate: new Date(),
      assignedTeam: employees.slice(0, 2).map(emp => emp._id),
      budget: 75000,
      estimatedHours: 1200,
      actualHours: 0,
      progress: 0,
      tags: ['mobile-development', 'react-native', 'banking', 'security']
    });

    // Project 3: Data Analytics Dashboard
    const project3 = await Project.create({
      name: 'Business Intelligence Dashboard',
      description: 'Real-time analytics dashboard for business metrics and KPI tracking.',
      client: client._id,
      projectManager: pm._id,
      status: 'testing',
      priority: 'normal',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      assignedTeam: employees.map(emp => emp._id),
      budget: 30000,
      estimatedHours: 400,
      actualHours: 350,
      progress: 85,
      tags: ['data-analytics', 'dashboard', 'react', 'd3js']
    });

    console.log('Demo projects created successfully');
    return [project1, project2, project3];
  } catch (error) {
    console.error('Error creating demo projects:', error);
  }
};

// Create demo milestones
const createDemoMilestones = async (projects) => {
  try {
    console.log('Creating demo milestones...');

    const employees = await Employee.find().limit(3);

    // Milestones for Project 1 (E-commerce)
    const milestone1_1 = await Milestone.create({
      title: 'Project Setup & Planning',
      description: 'Initial project setup, requirements gathering, and technical architecture design.',
      project: projects[0]._id,
      sequence: 1,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'completed',
      priority: 'high',
      assignedTo: employees.slice(0, 2).map(emp => emp._id),
      progress: 100
    });

    const milestone1_2 = await Milestone.create({
      title: 'Backend Development',
      description: 'API development, database design, and authentication system.',
      project: projects[0]._id,
      sequence: 2,
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: 'in-progress',
      priority: 'high',
      assignedTo: employees.map(emp => emp._id),
      progress: 60
    });

    const milestone1_3 = await Milestone.create({
      title: 'Frontend Development',
      description: 'User interface development and integration with backend APIs.',
      project: projects[0]._id,
      sequence: 3,
      dueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'normal',
      assignedTo: employees.slice(0, 2).map(emp => emp._id),
      progress: 0
    });

    // Milestones for Project 2 (Mobile App)
    const milestone2_1 = await Milestone.create({
      title: 'Requirements Analysis',
      description: 'Detailed requirements gathering and technical specifications.',
      project: projects[1]._id,
      sequence: 1,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'in-progress',
      priority: 'urgent',
      assignedTo: employees.slice(0, 2).map(emp => emp._id),
      progress: 30
    });

    // Milestones for Project 3 (Dashboard)
    const milestone3_1 = await Milestone.create({
      title: 'Data Integration',
      description: 'Connect to various data sources and implement data processing pipeline.',
      project: projects[2]._id,
      sequence: 1,
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      status: 'completed',
      priority: 'high',
      assignedTo: employees.map(emp => emp._id),
      progress: 100
    });

    const milestone3_2 = await Milestone.create({
      title: 'Dashboard Development',
      description: 'Build interactive dashboard with charts and real-time updates.',
      project: projects[2]._id,
      sequence: 2,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'completed',
      priority: 'normal',
      assignedTo: employees.map(emp => emp._id),
      progress: 100
    });

    const milestone3_3 = await Milestone.create({
      title: 'Testing & Deployment',
      description: 'Final testing, bug fixes, and production deployment.',
      project: projects[2]._id,
      sequence: 3,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'testing',
      priority: 'normal',
      assignedTo: employees.slice(0, 2).map(emp => emp._id),
      progress: 70
    });

    console.log('Demo milestones created successfully');
    return [milestone1_1, milestone1_2, milestone1_3, milestone2_1, milestone3_1, milestone3_2, milestone3_3];
  } catch (error) {
    console.error('Error creating demo milestones:', error);
  }
};

// Create demo tasks
const createDemoTasks = async (milestones) => {
  try {
    console.log('Creating demo tasks...');

    const employees = await Employee.find().limit(3);
    const pm = await PM.findOne();

    // Tasks for Milestone 1 (Project Setup)
    await Task.create({
      title: 'Create project repository',
      description: 'Set up Git repository with proper branching strategy and initial project structure.',
      project: milestones[0].project,
      milestone: milestones[0]._id,
      assignedTo: [employees[0]._id],
      status: 'completed',
      priority: 'high',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      estimatedHours: 8,
      actualHours: 8,
      createdBy: pm._id
    });

    await Task.create({
      title: 'Database schema design',
      description: 'Design and document the complete database schema for the e-commerce platform.',
      project: milestones[0].project,
      milestone: milestones[0]._id,
      assignedTo: [employees[1]._id],
      status: 'completed',
      priority: 'high',
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      estimatedHours: 16,
      actualHours: 18,
      createdBy: pm._id
    });

    // Tasks for Milestone 2 (Backend Development)
    await Task.create({
      title: 'User authentication API',
      description: 'Implement JWT-based authentication system with registration and login endpoints.',
      project: milestones[1].project,
      milestone: milestones[1]._id,
      assignedTo: [employees[0]._id, employees[1]._id],
      status: 'in-progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      estimatedHours: 24,
      actualHours: 12,
      createdBy: pm._id
    });

    await Task.create({
      title: 'Product catalog API',
      description: 'Create RESTful APIs for product management including CRUD operations.',
      project: milestones[1].project,
      milestone: milestones[1]._id,
      assignedTo: [employees[2]._id],
      status: 'pending',
      priority: 'normal',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      estimatedHours: 32,
      actualHours: 0,
      createdBy: pm._id
    });

    // Tasks for Milestone 3 (Frontend Development)
    await Task.create({
      title: 'User interface design',
      description: 'Create responsive UI components and design system for the e-commerce platform.',
      project: milestones[2].project,
      milestone: milestones[2]._id,
      assignedTo: [employees[0]._id],
      status: 'pending',
      priority: 'normal',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      estimatedHours: 40,
      actualHours: 0,
      createdBy: pm._id
    });

    // Tasks for Milestone 4 (Requirements Analysis)
    await Task.create({
      title: 'Security requirements analysis',
      description: 'Analyze security requirements for mobile banking application including biometric authentication.',
      project: milestones[3].project,
      milestone: milestones[3]._id,
      assignedTo: [employees[1]._id],
      status: 'in-progress',
      priority: 'urgent',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      estimatedHours: 20,
      actualHours: 6,
      createdBy: pm._id
    });

    // Tasks for Milestone 5 (Data Integration)
    await Task.create({
      title: 'Database connection setup',
      description: 'Set up connections to various data sources and implement data extraction.',
      project: milestones[4].project,
      milestone: milestones[4]._id,
      assignedTo: [employees[0]._id, employees[2]._id],
      status: 'completed',
      priority: 'high',
      dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      estimatedHours: 48,
      actualHours: 52,
      createdBy: pm._id
    });

    // Tasks for Milestone 6 (Dashboard Development)
    await Task.create({
      title: 'Chart components development',
      description: 'Create reusable chart components using D3.js for data visualization.',
      project: milestones[5].project,
      milestone: milestones[5]._id,
      assignedTo: [employees[1]._id],
      status: 'completed',
      priority: 'normal',
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      estimatedHours: 32,
      actualHours: 35,
      createdBy: pm._id
    });

    // Tasks for Milestone 7 (Testing & Deployment)
    await Task.create({
      title: 'Unit testing',
      description: 'Write and execute comprehensive unit tests for all dashboard components.',
      project: milestones[6].project,
      milestone: milestones[6]._id,
      assignedTo: [employees[0]._id],
      status: 'in-progress',
      priority: 'normal',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      estimatedHours: 16,
      actualHours: 8,
      createdBy: pm._id
    });

    await Task.create({
      title: 'Performance optimization',
      description: 'Optimize dashboard performance and implement caching strategies.',
      project: milestones[6].project,
      milestone: milestones[6]._id,
      assignedTo: [employees[2]._id],
      status: 'pending',
      priority: 'normal',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      estimatedHours: 12,
      actualHours: 0,
      createdBy: pm._id
    });

    console.log('Demo tasks created successfully');
  } catch (error) {
    console.error('Error creating demo tasks:', error);
  }
};

// Create demo payments
const createDemoPayments = async (projects) => {
  try {
    console.log('Creating demo payments...');

    const pm = await PM.findOne();

    // Payments for Project 1
    await Payment.create({
      project: projects[0]._id,
      client: projects[0].client,
      amount: 10000,
      currency: 'USD',
      paymentType: 'advance',
      status: 'completed',
      transactionId: 'TXN_001_001',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      notes: 'Initial advance payment for project kickoff',
      createdBy: pm._id
    });

    await Payment.create({
      project: projects[0]._id,
      client: projects[0].client,
      amount: 15000,
      currency: 'USD',
      paymentType: 'milestone',
      status: 'pending',
      notes: 'Payment for backend development milestone',
      createdBy: pm._id
    });

    // Payments for Project 2
    await Payment.create({
      project: projects[1]._id,
      client: projects[1].client,
      amount: 15000,
      currency: 'USD',
      paymentType: 'advance',
      status: 'completed',
      transactionId: 'TXN_002_001',
      paymentMethod: 'credit_card',
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: 'Advance payment for mobile app development',
      createdBy: pm._id
    });

    // Payments for Project 3
    await Payment.create({
      project: projects[2]._id,
      client: projects[2].client,
      amount: 8000,
      currency: 'USD',
      paymentType: 'advance',
      status: 'completed',
      transactionId: 'TXN_003_001',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      notes: 'Initial payment for dashboard project',
      createdBy: pm._id
    });

    await Payment.create({
      project: projects[2]._id,
      client: projects[2].client,
      amount: 12000,
      currency: 'USD',
      paymentType: 'milestone',
      status: 'completed',
      transactionId: 'TXN_003_002',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      notes: 'Payment for dashboard development milestone',
      createdBy: pm._id
    });

    await Payment.create({
      project: projects[2]._id,
      client: projects[2].client,
      amount: 10000,
      currency: 'USD',
      paymentType: 'final',
      status: 'pending',
      notes: 'Final payment upon project completion',
      createdBy: pm._id
    });

    console.log('Demo payments created successfully');
  } catch (error) {
    console.error('Error creating demo payments:', error);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();

    // Create demo data
    const projects = await createDemoProjects();
    if (projects) {
      const milestones = await createDemoMilestones(projects);
      if (milestones) {
        await createDemoTasks(milestones);
      }
      await createDemoPayments(projects);
    }

    console.log('Demo data creation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createDemoProjects,
  createDemoMilestones,
  createDemoTasks,
  createDemoPayments
};
