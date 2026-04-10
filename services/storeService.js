const axios = require('axios');

class ServiceClient {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.baseURLs = {
      STORE: process.env.STORE_SERVICE_URL || 'http://localhost:3000',
      MEDIA: process.env.MEDIA_SERVICE_URL || 'http://localhost:3001',
      PRODUCT: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
      // Add other services
    };
    this.baseURL = this.baseURLs[serviceName] || 'http://localhost:3000';
  }

  /**
   * Make GET request
   * @param {string} service - Target service name
   * @param {string} path - API path
   * @param {Object} params - Query parameters
   * @param {Object} headers - Additional headers (for auth tokens)
   */
  async get(service, path, params = null, headers = {}) {
    try {
      const response = await axios.get(`${this.baseURLs[service]}${path}`, {
        params,
        headers: {
          'x-internal-service': 'true',
          ...headers
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  /**
   * Make POST request
   * @param {string} service - Target service name
   * @param {string} path - API path
   * @param {Object} data - Request body
   * @param {Object} headers - Additional headers (for auth tokens)
   */
  async post(service, path, data, headers = {}) {
    try {
      const response = await axios.post(`${this.baseURLs[service]}${path}`, data, {
        headers: {
          'x-internal-service': 'true',
          ...headers
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  /**
   * Make PUT request
   * @param {string} service - Target service name
   * @param {string} path - API path
   * @param {Object} data - Request body
   * @param {Object} headers - Additional headers (for auth tokens)
   */
  async put(service, path, data, headers = {}) {
    try {
      const response = await axios.put(`${this.baseURLs[service]}${path}`, data, {
        headers: {
          'x-internal-service': 'true',
          ...headers
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  /**
   * Make DELETE request
   * @param {string} service - Target service name
   * @param {string} path - API path
   * @param {Object} headers - Additional headers (for auth tokens)
   */
  async delete(service, path, headers = {}) {
    try {
      const response = await axios.delete(`${this.baseURLs[service]}${path}`, {
        headers: {
          'x-internal-service': 'true',
          ...headers
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  /**
   * Upload file with form data
   * @param {string} service - Target service name
   * @param {string} path - API path
   * @param {FormData} formData - Form data with files
   * @param {Object} headers - Additional headers (for auth tokens)
   */
  async uploadFile(service, path, formData, headers = {}) {
    try {
      const response = await axios.post(`${this.baseURLs[service]}${path}`, formData, {
        headers: {
          ...formData.getHeaders(),
          'x-internal-service': 'true',
          ...headers
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}

module.exports = ServiceClient;