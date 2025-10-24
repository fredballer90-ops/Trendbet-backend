import axios from 'axios';

// Backend URLs - prioritize production Render URL
const possibleBaseURLs = [
  'https://trendbet-backend-3.onrender.com/api',  // 🔥 Your new backend!
  process.env.REACT_APP_API_BASE_URL,
  'http://localhost:10000/api',  // Updated port from 5001 to 10000
  'http://127.0.0.1:10000/api',
  'http://192.168.2.100:10000/api'
];

// Find the first working backend URL
let API_BASE_URL = possibleBaseURLs[0];

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Test connection function
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

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    const token = localStorage.getItem('token');
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

// Response interceptor
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

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
export { testConnection };
