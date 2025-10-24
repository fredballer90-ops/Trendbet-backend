// functions/utils/api.js
// Backend-safe version of your frontend api.js for use inside Firebase Functions.
// All axios logic preserved — now configured for Cloud Functions internal/external calls.

const axios = require('axios');

// ==================== POSSIBLE BASE URLS ====================
const possibleBaseURLs = [
  process.env.API_BASE_URL,
  'https://us-central1-your-project-id.cloudfunctions.net/api',
  'http://localhost:5001/your-project-id/us-central1/api'
];

// Select first valid base URL (environment or default)
let API_BASE_URL = possibleBaseURLs[0];

// ==================== AXIOS INSTANCE ====================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// ==================== TEST CONNECTION ====================
const testConnection = async () => {
  for (const baseURL of possibleBaseURLs) {
    try {
      console.log(`🔧 Testing connection to: ${baseURL}`);
      const testApi = axios.create({ baseURL, timeout: 5000 });
      const response = await testApi.get('/health');
      console.log(`✅ Connected to: ${baseURL}`);
      API_BASE_URL = baseURL;
      api.defaults.baseURL = baseURL;
      return { success: true, url: baseURL, data: response.data };
    } catch (error) {
      console.log(`❌ Failed to connect to: ${baseURL}`, error.message);
    }
  }
  throw new Error('Cannot connect to any backend server');
};

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    // Cloud Functions won't use localStorage — so token comes from ENV or context
    const token = process.env.ADMIN_TOKEN || null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ==================== RESPONSE INTERCEPTOR ====================
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

module.exports = { api, testConnection };
