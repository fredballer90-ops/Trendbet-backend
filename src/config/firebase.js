import admin from 'firebase-admin';

// Skip Firebase initialization if service account key is missing
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || !process.env.FIREBASE_PRIVATE_KEY) {
  console.log('⚠️  Firebase credentials not found - running without Firebase');
  export default null;
} else {
  try {
    // Parse the main service account JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    // Decode the base64-encoded private key separately
    const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY;
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
    
    // Replace the private_key with the properly decoded one
    serviceAccount.private_key = privateKey;
    
    console.log('🔑 Private key starts with:', privateKey.substring(0, 30));
    console.log('🔑 Private key ends with:', privateKey.substring(privateKey.length - 30));
    
    // Validate
    if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Private key does not appear to be valid PEM format');
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
    console.error('Full error:', error);
    console.log('🔄 Running without Firebase - using in-memory database only');
    export default null;
  }
}
