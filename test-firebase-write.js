
import admin from './src/config/firebase.js';



const testWrite = async () => {

  try {

    const db = admin.database();

    

    console.log('🧪 Testing Firebase write permissions...');

    

    // Test 1: Write to bets

    console.log('Test 1: Writing to bets/...');

    await db.ref('bets/test_bet_123').set({

      userId: 'test_user',

      amount: 100,

      timestamp: Date.now()

    });

    console.log('✅ Write to bets/ successful');

    

    // Test 2: Read from bets

    console.log('Test 2: Reading from bets/...');

    const snapshot = await db.ref('bets/test_bet_123').once('value');

    console.log('✅ Read from bets/ successful:', snapshot.val());

    

    // Test 3: Update user balance

    console.log('Test 3: Writing to users/...');

    await db.ref('users/test_user_123/balance').set(10000);

    console.log('✅ Write to users/ successful');

    

    // Test 4: Read users

    console.log('Test 4: Reading from users/...');

    const userSnapshot = await db.ref('users/test_user_123').once('value');

    console.log('✅ Read from users/ successful:', userSnapshot.val());

    

    // Clean up

    console.log('🧹 Cleaning up test data...');

    await db.ref('bets/test_bet_123').remove();

    console.log('✅ All tests passed!');

    

    process.exit(0);

  } catch (error) {

    console.error('❌ Firebase write test failed!');

    console.error('Error message:', error.message);

    console.error('Error code:', error.code);

    console.error('Full error:', error);

    process.exit(1);

  }

};



testWrite();

