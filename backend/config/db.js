const mongoose = require('mongoose');

// Suppress Mongoose warnings (duplicate indexes are non-critical)
if (process.env.NODE_ENV === 'production') {
  mongoose.set('debug', false);
}

const connectDB = async () => {
  try {
    // Validate MongoDB URI before attempting connection
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined. Please check your .env file or environment variables.');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // Clean database connection display
    const dbHost = conn.connection.host.split('.')[0]; // Get first part of host
    console.log(`🗄️  Database: CONNECTED | ${conn.connection.name} @ ${dbHost}`);
    
    // Connection event listeners (silent in production)

    mongoose.connection.on('error', (err) => {
      console.log('');
      console.log('❌ ' + '='.repeat(50));
      console.log('   🚨 DATABASE CONNECTION ERROR');
      console.log('❌ ' + '='.repeat(50));
      console.error('   Error:', err.message);
      console.log('❌ ' + '='.repeat(50));
      console.log('');
    });

    mongoose.connection.on('disconnected', () => {
      console.log('');
      console.log('🔌 ' + '='.repeat(50));
      console.log('   ⚠️  DATABASE DISCONNECTED');
      console.log('🔌 ' + '='.repeat(50));
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.log('');
    console.log('❌ ' + '='.repeat(50));
    console.log('   🚨 DATABASE CONNECTION FAILED');
    console.log('❌ ' + '='.repeat(50));
    console.error('   Error:', error.message);
    console.log('   🔧 Please check your MongoDB connection string and try again.');
    console.log('❌ ' + '='.repeat(50));
    console.log('');
    process.exit(1);
  }
};

module.exports = connectDB;
