// store-service/src/services/mediaService.js
const axios = require('axios');
const FormData = require('form-data');

class MediaService {
  constructor() {
    this.baseURL = process.env.MEDIA_SERVICE_URL || 'http://localhost:3001';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * Upload des médias du store vers le Media Service
   * Contrat unique: entity_type + entity_id
   */
  async uploadStoreMedia(files, { merchant_id, store_id, metadata = {}, authToken = null } = {}) {
    try {
      if (!files || (Array.isArray(files) && files.length === 0)) {
        throw new Error('No files provided');
      }

      if (!merchant_id) {
        throw new Error('merchant_id is required');
      }

      if (!store_id) {
        throw new Error('store_id is required');
      }

      const formData = new FormData();

      const fileList = Array.isArray(files) ? files : [files];

      fileList.forEach((file) => {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });

      formData.append('entity_type', 'store');
      formData.append('entity_id', String(store_id));
      formData.append('merchant_id', String(merchant_id));

      formData.append(
        'metadata',
        JSON.stringify({
          ...metadata,
          entity_type: 'store',
          entity_id: String(store_id),
          uploaded_by: 'store_service',
        })
      );

      const headers = {
        ...formData.getHeaders(),
        'x-internal-service': 'true',
      };

      if (authToken) {
        headers.Authorization = authToken;
      }

      const response = await axios.post(
        `${this.baseURL}/api/media/upload`,
        formData,
        {
          headers,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        '❌ Store media upload failed:',
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || 'Failed to upload store media'
      );
    }
  }

  /**
   * Récupérer les médias d'un store
   */
  async getStoreMedia(store_id, authToken = null) {
    try {
      const headers = {
        'x-internal-service': 'true',
      };

      if (authToken) {
        headers.Authorization = authToken;
      }

      const response = await this.client.get(`/api/media/store/${store_id}`, {
        headers,
      });

      return response.data;
    } catch (error) {
      console.error(
        '❌ Failed to fetch store media:',
        error.response?.data || error.message
      );
      return { success: true, data: [] };
    }
  }

  /**
   * Supprimer plusieurs médias du store
   */
  async deleteStoreMedia(mediaIds, authToken = null) {
    try {
      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return { success: true, deleted_count: 0 };
      }

      const headers = {
        'x-internal-service': 'true',
      };

      if (authToken) {
        headers.Authorization = authToken;
      }

      const response = await this.client.post(
        '/api/media/bulk-delete',
        { ids: mediaIds },
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error(
        '❌ Failed to delete store media:',
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || 'Failed to delete store media'
      );
    }
  }
}

module.exports = new MediaService();