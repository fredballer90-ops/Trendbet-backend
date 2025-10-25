import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseAdmin = null;

try {
  let serviceAccount;

  // Try loading from local file first (development)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const serviceAccountPath = join(__dirname, '../../serviceAccount.json');
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      console.log('🔑 Using local serviceAccount.json');
    } catch (err) {
      console.log('⚠️  No local serviceAccount.json found, trying env vars...');
    }
  }

  // Fallback to environment variables (production/Render)
  if (!serviceAccount) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
      console.log('🔑 Using base64-encoded private key from env');
    } else if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      console.log('🔑 Using regular private key from env');
    }

    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "trendbet-c2793",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: "googleapis.com"
    };
  }

  // Validate credentials
  const missingFields = [];
  if (!serviceAccount.private_key) missingFields.push('private_key');
  if (!serviceAccount.client_email) missingFields.push('client_email');
  if (!serviceAccount.project_id) missingFields.push('project_id');

  if (missingFields.length > 0) {
    console.error('❌ Missing Firebase credentials:', missingFields.join(', '));
    throw new Error(`Missing required Firebase credentials: ${missingFields.join(', ')}`);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://trendbet-c2793-default-rtdb.firebaseio.com"
  });
  
  firebaseAdmin = admin;
  console.log('✅ Firebase Admin initialized successfully');
  console.log('📧 Service Account:', serviceAccount.client_email);
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  throw error;
}

export default firebaseAdmin;
