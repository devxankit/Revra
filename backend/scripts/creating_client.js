const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('../models/Client');
const connectDB = require('../config/db');

dotenv.config({ path: './.env' });

const createClientUser = async () => {
  try {
    await connectDB();

    const clientPhoneNumber = '9755620716'; // Your phone number
    let client = await Client.findOne({ phoneNumber: clientPhoneNumber });

    if (client) {
      console.log(`Client user with phone number ${clientPhoneNumber} already exists.`);
      console.log('Login credentials:');
      console.log('Phone: 9755620716');
      console.log('OTP: 123456 (default for development)');
      console.log('Role: client');
      return;
    }

    // Create Client user
    const clientData = {
      name: 'Appzeto Client',
      phoneNumber: clientPhoneNumber,
      email: 'client@appzeto.com',
      role: 'client',
      companyName: 'Appzeto Client Company',
      industry: 'Technology',
      address: {
        street: 'Client Street',
        city: 'Indore',
        state: 'Madhya Pradesh',
        country: 'India',
        zipCode: '452001'
      },
      preferences: {
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        language: 'en',
        timezone: 'Asia/Kolkata'
      },
      isActive: true
    };

    client = await Client.create(clientData);
    
    console.log('Client user created successfully!');
    console.log('Client details:', {
      id: client._id,
      name: client.name,
      phoneNumber: client.phoneNumber,
      email: client.email,
      role: client.role,
      companyName: client.companyName,
      isActive: client.isActive,
      createdAt: client.createdAt
    });
    
    console.log('\nLogin credentials:');
    console.log('Phone: 9755620716');
    console.log('OTP: 123456 (default for development)');
    console.log('Role: client');
    
    console.log('\nNote: In development mode, you can use any 6-digit OTP.');
    console.log('For production, real OTP will be sent via SMS India service.');
    
  } catch (error) {
    console.error('Error creating Client user:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
};

const main = async () => {
  console.log('Client User Creation Script');
  console.log('==========================\n');
  
  await createClientUser();
};

main();
