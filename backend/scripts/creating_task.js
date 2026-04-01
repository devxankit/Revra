const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const PM = require('../models/PM');

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

// Create demo tasks
const createDemoTasks = async () => {
  try {
    console.log('Creating demo tasks...');

    // Get existing milestones
    const milestones = await Milestone.find().limit(20);
    if (milestones.length === 0) {
      console.log('No milestones found. Please create milestones first.');
      return;
    }

    // Get existing employees
    const employees = await Employee.find().limit(15);
    if (employees.length === 0) {
      console.log('No employees found. Please create employees first.');
      return;
    }

    // Get existing PMs
    const pms = await PM.find().limit(5);
    if (pms.length === 0) {
      console.log('No PMs found. Please create PMs first.');
      return;
    }

    const tasks = [];

    for (const milestone of milestones) {
      // Create 2-6 tasks per milestone
      const taskCount = Math.floor(Math.random() * 5) + 2;
      
      for (let i = 1; i <= taskCount; i++) {
        const assignedEmployees = employees
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 2) + 1);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 1);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 7));

        const isUrgent = Math.random() < 0.15; // 15% chance of being urgent
        const status = getRandomStatus();
        const completedDate = status === 'completed' ? new Date() : null;

        const task = {
          title: `${getTaskTitle(i)} - ${milestone.title}`,
          description: `This task is part of milestone "${milestone.title}". It involves ${getTaskDescription()}.`,
          project: milestone.project,
          milestone: milestone._id,
          assignedTo: assignedEmployees.map(emp => emp._id),
          status: status,
          priority: isUrgent ? 'urgent' : getRandomPriority(),
          isUrgent: isUrgent,
          dueDate: dueDate,
          startDate: startDate,
          completedDate: completedDate,
          estimatedHours: Math.floor(Math.random() * 20) + 2,
          actualHours: status === 'completed' ? Math.floor(Math.random() * 25) + 1 : 0,
          createdBy: pms[Math.floor(Math.random() * pms.length)]._id,
          comments: generateComments(status)
        };

        tasks.push(task);
      }
    }

    // Create tasks in database
    const createdTasks = await Task.insertMany(tasks);
    console.log(`Created ${createdTasks.length} tasks`);

    // Update milestones with task references
    for (const milestone of milestones) {
      const milestoneTasks = await Task.find({ milestone: milestone._id });
      await Milestone.findByIdAndUpdate(milestone._id, {
        tasks: milestoneTasks.map(t => t._id)
      });
    }

    // Update projects with task references
    const projects = await Project.find();
    for (const project of projects) {
      const projectTasks = await Task.find({ project: project._id });
      await Project.findByIdAndUpdate(project._id, {
        tasks: projectTasks.map(t => t._id)
      });
    }

    console.log('Demo tasks created successfully!');
  } catch (error) {
    console.error('Error creating demo tasks:', error);
  }
};

// Helper functions
const getTaskTitle = (sequence) => {
  const titles = [
    'Database Schema Design',
    'API Endpoint Development',
    'Frontend Component Creation',
    'User Authentication Setup',
    'Data Validation Implementation',
    'Testing & Bug Fixes',
    'Performance Optimization',
    'Documentation Writing',
    'Code Review & Refactoring',
    'Integration Testing',
    'Security Implementation',
    'UI/UX Improvements',
    'Error Handling Setup',
    'Logging System Implementation',
    'Deployment Configuration'
  ];
  return titles[sequence - 1] || `Task ${sequence}`;
};

const getTaskDescription = () => {
  const descriptions = [
    'implementing core functionality',
    'setting up the development environment',
    'creating user interfaces',
    'writing comprehensive tests',
    'optimizing performance',
    'fixing bugs and issues',
    'documenting the codebase',
    'integrating third-party services',
    'implementing security measures',
    'setting up monitoring and logging'
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
};

const getRandomStatus = () => {
  const statuses = ['pending', 'in-progress', 'testing', 'completed', 'cancelled'];
  const weights = [0.15, 0.35, 0.15, 0.3, 0.05];
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return statuses[i];
    }
  }
  return 'pending';
};

const getRandomPriority = () => {
  const priorities = ['low', 'normal', 'high', 'urgent'];
  const weights = [0.2, 0.5, 0.2, 0.1];
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < priorities.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return priorities[i];
    }
  }
  return 'normal';
};

const generateComments = (status) => {
  const comments = [];
  
  if (status === 'in-progress') {
    comments.push({
      message: 'Started working on this task',
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    });
  }
  
  if (status === 'testing') {
    comments.push({
      message: 'Task completed, now in testing phase',
      timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
    });
  }
  
  if (status === 'completed') {
    comments.push({
      message: 'Task completed successfully',
      timestamp: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000)
    });
  }
  
  return comments;
};

// Main execution
const main = async () => {
  await connectDB();
  await createDemoTasks();
  await mongoose.connection.close();
  console.log('Database connection closed');
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createDemoTasks };
