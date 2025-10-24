import admin from 'firebase-admin';

let firebaseAdmin = null;

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || !process.env.FIREBASE_PRIVATE_KEY) {
  console.log('⚠️  Firebase credentials not found - running without Firebase');
} else {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY;
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
    serviceAccount.private_key = privateKey;
    
    console.log('🔑 Private key starts with:', privateKey.substring(0, 30));
    
    if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Private key does not appear to be valid PEM format');
    }
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://trendbet-55be5-default-rtdb.firebaseio.com"
      });
      console.log('✅ Firebase Admin initialized successfully');
      firebaseAdmin = admin;
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('🔄 Running without Firebase');
  }
}

export default firebaseAdmin;
