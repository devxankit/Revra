const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Use environment variable for MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Admin Schema (inline for script)
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'hr'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const Admin = mongoose.model('Admin', adminSchema);

// Function to create admin user
const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'appzeto@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists with email: appzeto@gmail.com');
      console.log('Admin details:', {
        id: existingAdmin._id,
        name: existingAdmin.name,
        email: existingAdmin.email,
        role: existingAdmin.role,
        isActive: existingAdmin.isActive
      });
      return;
    }

    // Create new admin user
    const adminData = {
      name: 'Appzeto Admin',
      email: 'appzeto@gmail.com',
      password: 'Admin@123', // Strong password
      role: 'admin',
      isActive: true
    };

    const admin = await Admin.create(adminData);
    
    console.log('Admin user created successfully!');
    console.log('Admin details:', {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt
    });
    
    console.log('\nLogin credentials:');
    console.log('Email: appzeto@gmail.com');
    console.log('Password: Admin@123');
    console.log('Role: admin (full access)');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.error('Email already exists in database');
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Function to create HR user
const createHRUser = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Check if HR user already exists
    const existingHR = await Admin.findOne({ email: 'hr@appzeto.com' });
    
    if (existingHR) {
      console.log('HR user already exists with email: hr@appzeto.com');
      console.log('HR details:', {
        id: existingHR._id,
        name: existingHR.name,
        email: existingHR.email,
        role: existingHR.role,
        isActive: existingHR.isActive
      });
      return;
    }

    // Create new HR user
    const hrData = {
      name: 'Appzeto HR',
      email: 'hr@appzeto.com',
      password: 'HR@123', // Strong password
      role: 'hr',
      isActive: true
    };

    const hr = await Admin.create(hrData);
    
    console.log('HR user created successfully!');
    console.log('HR details:', {
      id: hr._id,
      name: hr.name,
      email: hr.email,
      role: hr.role,
      isActive: hr.isActive,
      createdAt: hr.createdAt
    });
    
    console.log('\nLogin credentials:');
    console.log('Email: hr@appzeto.com');
    console.log('Password: HR@123');
    console.log('Role: hr (limited access)');

  } catch (error) {
    console.error('Error creating HR user:', error.message);
    
    if (error.code === 11000) {
      console.error('Email already exists in database');
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Function to create super admin user
const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ email: 'appzetosupercrm@gmail.com' });
    
    if (existingSuperAdmin) {
      console.log('Super Admin user already exists with email: appzetosupercrm@gmail.com');
      console.log('Super Admin details:', {
        id: existingSuperAdmin._id,
        name: existingSuperAdmin.name,
        email: existingSuperAdmin.email,
        role: existingSuperAdmin.role,
        isActive: existingSuperAdmin.isActive
      });
      return;
    }

    // Create new super admin user
    const superAdminData = {
      name: 'Appzeto Super Admin',
      email: 'appzetosupercrm@gmail.com',
      password: 'Appzeto@1399', // Strong password
      role: 'admin',
      isActive: true
    };

    const superAdmin = await Admin.create(superAdminData);
    
    console.log('Super Admin user created successfully!');
    console.log('Super Admin details:', {
      id: superAdmin._id,
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
      isActive: superAdmin.isActive,
      createdAt: superAdmin.createdAt
    });
    
    console.log('\nLogin credentials:');
    console.log('Email: appzetosupercrm@gmail.com');
    console.log('Password: Appzeto@1399');
    console.log('Role: admin (full access)');

  } catch (error) {
    console.error('Error creating super admin user:', error.message);
    
    if (error.code === 11000) {
      console.error('Email already exists in database');
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Function to create both users
const createBothUsers = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Create Admin user
    const existingAdmin = await Admin.findOne({ email: 'appzeto@gmail.com' });
    if (!existingAdmin) {
      const adminData = {
        name: 'Appzeto Admin',
        email: 'appzeto@gmail.com',
        password: 'Admin@123',
        role: 'admin',
        isActive: true
      };
      const admin = await Admin.create(adminData);
      console.log('✅ Admin user created successfully!');
      console.log('   Email: appzeto@gmail.com');
      console.log('   Password: Admin@123');
      console.log('   Role: admin (full access)\n');
    } else {
      console.log('ℹ️  Admin user already exists: appzeto@gmail.com\n');
    }

    // Create HR user
    const existingHR = await Admin.findOne({ email: 'hr@appzeto.com' });
    if (!existingHR) {
      const hrData = {
        name: 'Appzeto HR',
        email: 'hr@appzeto.com',
        password: 'HR@123',
        role: 'hr',
        isActive: true
      };
      const hr = await Admin.create(hrData);
      console.log('✅ HR user created successfully!');
      console.log('   Email: hr@appzeto.com');
      console.log('   Password: HR@123');
      console.log('   Role: hr (limited access)\n');
    } else {
      console.log('ℹ️  HR user already exists: hr@appzeto.com\n');
    }

    console.log('🎉 All users created successfully!');

  } catch (error) {
    console.error('❌ Error creating users:', error.message);
    
    if (error.code === 11000) {
      console.error('Email already exists in database');
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Execute based on command
switch (command) {
  case 'admin':
    createAdminUser();
    break;
  case 'hr':
    createHRUser();
    break;
  case 'super':
    createSuperAdmin();
    break;
  case 'both':
  default:
    createBothUsers();
    break;
}

// Show usage if no command or invalid command
if (!command || !['admin', 'hr', 'super', 'both'].includes(command)) {
  console.log('Usage: node creating_admin.js [command]');
  console.log('Commands:');
  console.log('  admin  - Create admin user only');
  console.log('  hr     - Create HR user only');
  console.log('  super  - Create super admin user (appzetosupercrm@gmail.com)');
  console.log('  both   - Create both admin and HR users (default)');
  console.log('\nExamples:');
  console.log('  node creating_admin.js');
  console.log('  node creating_admin.js both');
  console.log('  node creating_admin.js admin');
  console.log('  node creating_admin.js hr');
  console.log('  node creating_admin.js super');
}
