const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Load service account
let serviceAccount;
const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json';
const absolutePath = path.resolve(saPath);

console.log('--- FCM Debugging Script ---');
console.log('1. Checking Service Account File...');

if (fs.existsSync(absolutePath)) {
    console.log('✅ Found service account at:', absolutePath);
    serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
} else {
    console.log('❌ Service account not found at:', absolutePath);
    if (process.env.FIREBASE_CONFIG) {
        console.log('ℹ️ Attempting to use FIREBASE_CONFIG env var instead...');
        serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    }
}

if (!serviceAccount) {
    console.error('❌ No service account credentials found. Exiting.');
    process.exit(1);
}

console.log('   Project ID:', serviceAccount.project_id);
console.log('   Client Email:', serviceAccount.client_email);

// Initialize Admin SDK
console.log('\n2. Initializing Firebase Admin SDK...');
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Initialization successful');
} catch (e) {
    console.error('❌ Initialization failed:', e.message);
    process.exit(1);
}

// Test Token (if provided)
const testToken = process.argv[2];
if (testToken) {
    console.log('\n3. Attempting to send test notification to:', testToken.substring(0, 20) + '...');

    const message = {
        token: testToken,
        notification: {
            title: 'Debug Test',
            body: 'Testing from debug script'
        }
    };

    admin.messaging().send(message)
        .then(response => {
            console.log('✅ Successfully sent message:', response);
        })
        .catch(error => {
            console.error('❌ Error sending message:');
            console.error('   Code:', error.code);
            console.error('   Message:', error.message);
            if (error.code === 'messaging/third-party-auth-error') {
                console.log('\n🔍 DIAGNOSIS: This is a VAPID mismatch.');
                console.log('   The token was created with a VAPID key that does not belong to this project');
                console.log('   OR the project in the Firebase Console does not recognize the key.');
            }
        });
} else {
    console.log('\n3. No test token provided. Run with "node scripts/debug-fcm.js <TOKEN>" to test sending.');
}
