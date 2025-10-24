import admin from 'firebase-admin';

// Skip Firebase initialization if service account key is missing
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('⚠️  Firebase service account key not found - running without Firebase');
  export default null;
} else {
  try {
    let serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    // Check if it's base64 encoded (doesn't start with { or ")
    if (!serviceAccountString.trim().startsWith('{') && !serviceAccountString.trim().startsWith('"')) {
      console.log('📦 Decoding base64 service account...');
      serviceAccountString = Buffer.from(serviceAccountString, 'base64').toString('utf-8');
    }
    
    // Parse the JSON
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Fix private_key formatting - replace literal \n with actual newlines
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/\\\\n/g, '\n')
        .replace(/\\n/g, '\n');
    }
    
    // Validate required fields
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Service account is missing required fields');
    }
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://trendbet-55be5-default-rtdb.firebaseio.com"
      });
      console.log('✅ Firebase Admin initialized successfully');
    }
    
    export default admin;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('🔄 Running without Firebase - using in-memory database only');
    export default null;
  }
}
