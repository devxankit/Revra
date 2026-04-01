#!/usr/bin/env node
/**
 * One-time script to get Google OAuth refresh token for Drive backup.
 * Use this for personal Gmail (folder in My Drive).
 *
 * Setup:
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create OAuth 2.0 Client ID (Desktop app)
 * 3. Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env
 * 4. Run: node scripts/get-google-refresh-token.js
 * 5. Open URL, sign in, paste the code, add GOOGLE_OAUTH_REFRESH_TOKEN to .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { google } = require('googleapis');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

async function main() {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env');
    console.error('');
    console.error('Steps:');
    console.error('1. Go to https://console.cloud.google.com/apis/credentials');
    console.error('2. Create credentials -> OAuth client ID');
    console.error('3. Application type: Desktop app');
    console.error('4. Add to .env:');
    console.error('   GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com');
    console.error('   GOOGLE_OAUTH_CLIENT_SECRET=xxx');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('');
  console.log('1. Open this URL in your browser:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('2. Sign in with your Google account (personal Gmail works)');
  console.log('3. Copy the authorization code');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => rl.question('Paste the code here: ', resolve));
  rl.close();

  const trimmed = (code || '').trim();
  if (!trimmed) {
    console.error('No code provided.');
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(trimmed);
    if (!tokens.refresh_token) {
      console.error('No refresh_token in response. Try revoking app access at');
      console.error('https://myaccount.google.com/permissions and run again.');
      process.exit(1);
    }
    console.log('');
    console.log('Add this to your .env file:');
    console.log('');
    console.log('GOOGLE_OAUTH_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('');
    console.log('Then run: node backup/backup.js');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
