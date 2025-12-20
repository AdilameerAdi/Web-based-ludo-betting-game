
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Helper function to make API calls
export const apiCall = async (endpoint, method = 'GET', data = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add token if available
  const token = localStorage.getItem('token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // Add body for POST/PUT requests
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Request failed');
    }

    return result;
  } catch (error) {
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  signup: async (mobile, password, confirmPassword) => {
    return apiCall('/auth/signup', 'POST', { mobile, password, confirmPassword });
  },

  login: async (mobile, password) => {
    return apiCall('/auth/login', 'POST', { mobile, password });
  },
};

// User API calls
export const userAPI = {
  getProfile: async () => {
    return apiCall('/users/profile', 'GET');
  },
};

// Table API calls
export const tableAPI = {
  createTable: async (betAmount) => {
    return apiCall('/tables', 'POST', { betAmount });
  },
  
  getWaitingTables: async () => {
    return apiCall('/tables/waiting', 'GET');
  },
  
  getTableById: async (tableId) => {
    return apiCall(`/tables/${tableId}`, 'GET');
  },
  
  joinTable: async (tableId) => {
    return apiCall(`/tables/${tableId}/join`, 'POST');
  },
};

// Helper function for admin API calls (uses adminToken)
export const adminApiCall = async (endpoint, method = 'GET', data = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add admin token if available
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    options.headers['Authorization'] = `Bearer ${adminToken}`;
  }

  // Add body for POST/PUT requests
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.message || result.error || result.errorCode || 'Request failed';
      const error = new Error(errorMessage);
      error.details = result;
      error.status = response.status;
      console.error('[API] Admin API error:', { status: response.status, result });
      throw error;
    }

    return result;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.details) {
      throw error;
    }
    // Otherwise, wrap it
    const wrappedError = new Error(error.message || 'Network error');
    wrappedError.originalError = error;
    throw wrappedError;
  }
};

// Withdrawal API calls
export const withdrawalAPI = {
  createWithdrawal: async (amount, paymentMethod, accountDetails) => {
    return apiCall('/withdrawals', 'POST', { amount, paymentMethod, accountDetails });
  },
  
  getUserWithdrawals: async () => {
    return apiCall('/withdrawals', 'GET');
  },
  
  getAllWithdrawals: async () => {
    return apiCall('/withdrawals/all', 'GET');
  },
  
  updateWithdrawalStatus: async (withdrawalId, status, adminNotes) => {
    return apiCall(`/withdrawals/${withdrawalId}/status`, 'PUT', { status, adminNotes });
  },
};

// Admin API calls
export const adminAPI = {
  login: async (username, password) => {
    return adminApiCall('/admin/login', 'POST', { username, password });
  },
  
  getAllWithdrawals: async () => {
    return adminApiCall('/admin/withdrawals', 'GET');
  },
  
  updateWithdrawalStatus: async (withdrawalId, status, adminNotes) => {
    return adminApiCall(`/admin/withdrawals/${withdrawalId}/status`, 'PUT', { status, adminNotes });
  },
  
  getCommissionStats: async () => {
    return adminApiCall('/admin/stats/commission', 'GET');
  },
  
  getCommissionHistory: async () => {
    return adminApiCall('/admin/commission', 'GET');
  },
  
  getAddFundsStats: async () => {
    return adminApiCall('/admin/stats/add-funds', 'GET');
  },
  
  getAddFundsHistory: async () => {
    return adminApiCall('/admin/add-funds-history', 'GET');
  },
  
  changePassword: async (currentPassword, newPassword) => {
    return adminApiCall('/admin/change-password', 'PUT', { currentPassword, newPassword });
  },

  changeUsername: async (currentPassword, newUsername) => {
    return adminApiCall('/admin/change-username', 'PUT', { currentPassword, newUsername });
  },

  getDashboardStats: async () => {
    return adminApiCall('/admin/dashboard-stats', 'GET');
  },

  getAllUsers: async () => {
    return adminApiCall('/admin/users', 'GET');
  },

  getUserDetails: async (userId) => {
    return adminApiCall(`/admin/users/${userId}`, 'GET');
  },

  getGameHistory: async (limit = 50, offset = 0) => {
    return adminApiCall(`/admin/games?limit=${limit}&offset=${offset}`, 'GET');
  },
};

