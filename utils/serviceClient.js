const axios = require('axios');

class ServiceClient {
  constructor() {
    // Configuration des URLs des services
    this.services = {
      store: process.env.STORE_SERVICE_URL || 'http://localhost:3000',
      product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
      media: process.env.MEDIA_SERVICE_URL || 'http://localhost:4002'
    };
  }

  // Méthode générique pour appeler un service
  async call(serviceName, method, endpoint, data = null, headers = {}) {
    const baseURL = this.services[serviceName];
    if (!baseURL) {
      throw new Error(`Service ${serviceName} non configuré`);
    }

    try {
      const response = await axios({
        method,
        url: `${baseURL}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service': 'true', // Header pour identifier les appels internes
          ...headers
        },
        timeout: 5000 // 5 secondes timeout
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur appel ${serviceName}:`, error.message);
      throw new Error(`Service ${serviceName} indisponible: ${error.message}`);
    }
  }

  // Méthodes utilitaires spécifiques
  async getStore(storeId, token) {
    return this.call('store', 'GET', `/api/stores/${storeId}`, null, {
      'Authorization': token
    });
  }

  async getProduct(productId, token) {
    return this.call('product', 'GET', `/api/products/${productId}`, null, {
      'Authorization': token
    });
  }

  async getMedia(entityType, entityId) {
    return this.call('media', 'GET', `/api/media/${entityType}/${entityId}`);
  }

  async uploadMedia(fileData, metadata) {
    return this.call('media', 'POST', '/api/media/upload', {
      file: fileData,
      ...metadata
    });
  }
}

module.exports = new ServiceClient();