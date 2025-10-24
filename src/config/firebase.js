import admin from 'firebase-admin';

let firebaseAdmin = null;

try {
  // For Render.com - use individual environment variables
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "trendbet-c2793",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com"
  };

  // Check if we have the minimum required fields
  if (serviceAccount.private_key && serviceAccount.client_email) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://trendbet-c2793-default-rtdb.firebaseio.com"
    });
    firebaseAdmin = admin;
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('⚠️  Firebase credentials missing - running without Firebase');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.log('🔄 Running without Firebase');
}

export default firebaseAdmin;

