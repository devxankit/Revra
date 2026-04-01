const mongoose = require('mongoose');
const Lead = require('../models/Lead');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/appzeto', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function
const migrateFollowupStatus = async () => {
  try {
    console.log('Starting migration: today_followup → followup');
    
    // Find all leads with today_followup status
    const leadsToMigrate = await Lead.find({ status: 'today_followup' });
    console.log(`Found ${leadsToMigrate.length} leads with today_followup status`);
    
    if (leadsToMigrate.length === 0) {
      console.log('No leads to migrate. Migration completed.');
      return;
    }
    
    // Update all leads with today_followup status to followup
    const result = await Lead.updateMany(
      { status: 'today_followup' },
      { 
        $set: { status: 'followup' },
        $push: {
          activities: {
            type: 'status_change',
            description: 'Status migrated from today_followup to followup during system update',
            performedBy: null, // System migration
            timestamp: new Date()
          }
        }
      }
    );
    
    console.log(`Successfully migrated ${result.modifiedCount} leads from today_followup to followup`);
    
    // Verify migration
    const remainingTodayFollowup = await Lead.countDocuments({ status: 'today_followup' });
    const newFollowupCount = await Lead.countDocuments({ status: 'followup' });
    
    console.log(`Verification:`);
    console.log(`- Remaining today_followup leads: ${remainingTodayFollowup}`);
    console.log(`- Total followup leads: ${newFollowupCount}`);
    
    if (remainingTodayFollowup === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Some leads may not have been migrated. Please check manually.');
    }
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await migrateFollowupStatus();
    console.log('Migration script completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateFollowupStatus };
