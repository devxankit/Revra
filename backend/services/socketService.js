const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const PM = require('../models/PM');
const Employee = require('../models/Employee');
const Client = require('../models/Client');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userRooms = new Map(); // userId -> Set of room names
  }

  // Initialize Socket.io server
  initialize(server) {
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || "http://localhost:3000",
          "http://localhost:5173", // Vite default port
          "http://localhost:3000"  // React default port
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    // Clean WebSocket initialization display
    console.log('📡 WebSocket: ACTIVE | Real-time updates enabled');
  }

  // Setup authentication middleware
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by ID
        let user = await Admin.findById(decoded.id);
        if (user && user.isActive) {
          socket.userId = user._id.toString();
          socket.userType = 'admin';
          socket.user = user;
          return next();
        }

        user = await PM.findById(decoded.id);
        if (user && user.isActive) {
          socket.userId = user._id.toString();
          socket.userType = 'project-manager';
          socket.user = user;
          return next();
        }

        user = await Employee.findById(decoded.id);
        if (user && user.isActive) {
          socket.userId = user._id.toString();
          socket.userType = 'employee';
          socket.user = user;
          return next();
        }

        user = await Client.findById(decoded.id);
        if (user && user.isActive) {
          socket.userId = user._id.toString();
          socket.userType = 'client';
          socket.user = user;
          return next();
        }

        return next(new Error('Authentication error: User not found'));
      } catch (error) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  // Setup event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const timestamp = new Date().toLocaleTimeString();
      const userInfo = socket.user?.name || socket.user?.email || socket.user?.phoneNumber || 'Unknown User';
      
      // Beautiful connection logging
      console.log('');
      console.log('🔗 ' + '='.repeat(40));
      console.log(`   👤 USER CONNECTED [${timestamp}]`);
      console.log('🔗 ' + '='.repeat(40));
      console.log(`   🆔 User ID: ${socket.userId}`);
      console.log(`   👤 Name: ${userInfo}`);
      console.log(`   🎭 Role: ${socket.userType.toUpperCase()}`);
      console.log(`   🔌 Socket ID: ${socket.id}`);
      console.log(`   📊 Total Connections: ${this.connectedUsers.size + 1}`);
      console.log('🔗 ' + '='.repeat(40));
      console.log('');
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      socket.userRooms = new Set();

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);

      // Handle joining project rooms
      socket.on('join_project', (projectId) => {
        this.handleJoinProject(socket, projectId);
      });

      // Handle leaving project rooms
      socket.on('leave_project', (projectId) => {
        this.handleLeaveProject(socket, projectId);
      });

      // Handle joining milestone rooms
      socket.on('join_milestone', (milestoneId) => {
        this.handleJoinMilestone(socket, milestoneId);
      });

      // Handle leaving milestone rooms
      socket.on('leave_milestone', (milestoneId) => {
        this.handleLeaveMilestone(socket, milestoneId);
      });

      // Handle joining task rooms
      socket.on('join_task', (taskId) => {
        this.handleJoinTask(socket, taskId);
      });

      // Handle leaving task rooms
      socket.on('leave_task', (taskId) => {
        this.handleLeaveTask(socket, taskId);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // Handle joining project room
  async handleJoinProject(socket, projectId) {
    try {
      const Project = require('../models/Project');
      const project = await Project.findById(projectId);
      
      if (!project) {
        socket.emit('error', { message: 'Project not found' });
        return;
      }

      // Check if user has access to this project
      const hasAccess = await this.checkProjectAccess(socket, project);
      if (!hasAccess) {
        socket.emit('error', { message: 'Not authorized to access this project' });
        return;
      }

      const roomName = `project_${projectId}`;
      socket.join(roomName);
      socket.userRooms.add(roomName);
      
      // Enhanced room joining logging
      console.log(`   📋 ${socket.userType.toUpperCase()} joined PROJECT room: ${project.name} (${projectId})`);
      socket.emit('joined_room', { room: roomName, type: 'project' });
    } catch (error) {
      console.error('Error joining project room:', error);
      socket.emit('error', { message: 'Error joining project room' });
    }
  }

  // Handle leaving project room
  handleLeaveProject(socket, projectId) {
    const roomName = `project_${projectId}`;
    socket.leave(roomName);
    socket.userRooms.delete(roomName);
    
    console.log(`User ${socket.userId} left project room ${roomName}`);
    socket.emit('left_room', { room: roomName, type: 'project' });
  }

  // Handle joining milestone room
  async handleJoinMilestone(socket, milestoneId) {
    try {
      const Milestone = require('../models/Milestone');
      const milestone = await Milestone.findById(milestoneId).populate('project');
      
      if (!milestone) {
        socket.emit('error', { message: 'Milestone not found' });
        return;
      }

      // Check if user has access to this milestone's project
      const hasAccess = await this.checkProjectAccess(socket, milestone.project);
      if (!hasAccess) {
        socket.emit('error', { message: 'Not authorized to access this milestone' });
        return;
      }

      const roomName = `milestone_${milestoneId}`;
      socket.join(roomName);
      socket.userRooms.add(roomName);
      
      // Enhanced room joining logging
      console.log(`   🎯 ${socket.userType.toUpperCase()} joined MILESTONE room: ${milestone.title} (${milestoneId})`);
      socket.emit('joined_room', { room: roomName, type: 'milestone' });
    } catch (error) {
      console.error('Error joining milestone room:', error);
      socket.emit('error', { message: 'Error joining milestone room' });
    }
  }

  // Handle leaving milestone room
  handleLeaveMilestone(socket, milestoneId) {
    const roomName = `milestone_${milestoneId}`;
    socket.leave(roomName);
    socket.userRooms.delete(roomName);
    
    console.log(`User ${socket.userId} left milestone room ${roomName}`);
    socket.emit('left_room', { room: roomName, type: 'milestone' });
  }

  // Handle joining task room
  async handleJoinTask(socket, taskId) {
    try {
      const Task = require('../models/Task');
      const task = await Task.findById(taskId).populate('project');
      
      if (!task) {
        socket.emit('error', { message: 'Task not found' });
        return;
      }

      // Check if user has access to this task's project
      const hasAccess = await this.checkProjectAccess(socket, task.project);
      if (!hasAccess) {
        socket.emit('error', { message: 'Not authorized to access this task' });
        return;
      }

      const roomName = `task_${taskId}`;
      socket.join(roomName);
      socket.userRooms.add(roomName);
      
      // Enhanced room joining logging
      console.log(`   ✅ ${socket.userType.toUpperCase()} joined TASK room: ${task.title} (${taskId})`);
      socket.emit('joined_room', { room: roomName, type: 'task' });
    } catch (error) {
      console.error('Error joining task room:', error);
      socket.emit('error', { message: 'Error joining task room' });
    }
  }

  // Handle leaving task room
  handleLeaveTask(socket, taskId) {
    const roomName = `task_${taskId}`;
    socket.leave(roomName);
    socket.userRooms.delete(roomName);
    
    console.log(`User ${socket.userId} left task room ${roomName}`);
    socket.emit('left_room', { room: roomName, type: 'task' });
  }

  // Check if user has access to project
  async checkProjectAccess(socket, project) {
    if (socket.userType === 'admin') {
      return true; // Admin has access to everything
    }

    if (socket.userType === 'project-manager' && project.projectManager.equals(socket.userId)) {
      return true; // PM has access to their projects
    }

    if (socket.userType === 'client' && project.client.equals(socket.userId)) {
      return true; // Client has access to their projects
    }

    if (socket.userType === 'employee' && project.assignedTeam.some(member => member.equals(socket.userId))) {
      return true; // Employee has access to assigned projects
    }

    return false;
  }

  // Handle disconnection
  handleDisconnect(socket) {
    const timestamp = new Date().toLocaleTimeString();
    const userInfo = socket.user?.name || socket.user?.email || socket.user?.phoneNumber || 'Unknown User';
    
    // Beautiful disconnection logging
    console.log('');
    console.log('🔌 ' + '='.repeat(40));
    console.log(`   👤 USER DISCONNECTED [${timestamp}]`);
    console.log('🔌 ' + '='.repeat(40));
    console.log(`   🆔 User ID: ${socket.userId}`);
    console.log(`   👤 Name: ${userInfo}`);
    console.log(`   🎭 Role: ${socket.userType?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`   🔌 Socket ID: ${socket.id}`);
    console.log(`   📊 Remaining Connections: ${this.connectedUsers.size - 1}`);
    console.log('🔌 ' + '='.repeat(40));
    console.log('');
    
    // Remove user from connected users
    this.connectedUsers.delete(socket.userId);
    
    // Leave all rooms
    socket.userRooms.forEach(room => {
      socket.leave(room);
    });
  }

  // Emit event to project room
  emitToProject(projectId, event, data) {
    if (this.io) {
      const roomName = `project_${projectId}`;
      const roomSize = this.io.sockets.adapter.rooms.get(roomName)?.size || 0;
      console.log(`   📡 Broadcasting ${event} to PROJECT room (${roomSize} users): ${projectId}`);
      this.io.to(roomName).emit(event, data);
    }
  }

  // Emit event to milestone room
  emitToMilestone(milestoneId, event, data) {
    if (this.io) {
      const roomName = `milestone_${milestoneId}`;
      const roomSize = this.io.sockets.adapter.rooms.get(roomName)?.size || 0;
      console.log(`   📡 Broadcasting ${event} to MILESTONE room (${roomSize} users): ${milestoneId}`);
      this.io.to(roomName).emit(event, data);
    }
  }

  // Emit event to task room
  emitToTask(taskId, event, data) {
    if (this.io) {
      const roomName = `task_${taskId}`;
      const roomSize = this.io.sockets.adapter.rooms.get(roomName)?.size || 0;
      console.log(`   📡 Broadcasting ${event} to TASK room (${roomSize} users): ${taskId}`);
      this.io.to(roomName).emit(event, data);
    }
  }

  // Emit event to user
  emitToUser(userId, event, data) {
    if (this.io) {
      console.log(`   📡 Sending ${event} to USER: ${userId}`);
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  // Emit event to employee (alias for emitToUser)
  emitToEmployee(employeeId, event, data) {
    this.emitToUser(employeeId, event, data);
  }

  // Emit event to all connected users
  emitToAll(event, data) {
    if (this.io) {
      const totalUsers = this.connectedUsers.size;
      console.log(`   📡 Broadcasting ${event} to ALL users (${totalUsers} connected)`);
      this.io.emit(event, data);
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get users in a specific room
  getUsersInRoom(roomName) {
    if (this.io) {
      const room = this.io.sockets.adapter.rooms.get(roomName);
      return room ? room.size : 0;
    }
    return 0;
  }

  // Display current server status
  displayStatus() {
    console.log('');
    console.log('📊 ' + '='.repeat(50));
    console.log('   🔍 WEBSOCKET SERVER STATUS');
    console.log('📊 ' + '='.repeat(50));
    console.log(`   🔌 Total Connected Users: ${this.connectedUsers.size}`);
    console.log(`   🏠 Active Rooms: ${this.io?.sockets.adapter.rooms.size || 0}`);
    console.log(`   ⚡ Server Status: ${this.io ? 'ACTIVE' : 'INACTIVE'}`);
    console.log('📊 ' + '='.repeat(50));
    console.log('');
  }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;
