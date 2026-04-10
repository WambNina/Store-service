const StoreModel = require("../models/storeModel");
const catchAsync = require("../utils/catchAsync");
const serviceClient = require("../utils/serviceClient");
const ApiError = require("../utils/apiError");
const mediaService = require("../services/mediaService");

class StoreController {

  async create(req, res) {
    try {
      console.log("StoreController loaded");
      const storeData = req.body;

      // Ensure merchant_id is present
      if (!storeData.merchant_id) {
        return res.status(400).json({
          success: false,
          message: "merchant_id is required",
        });
      }

      // Create store first
      const store = await StoreModel.create(storeData);

      // If files were uploaded, send to Media Service
      if (req.files && req.files.length > 0) {
        try {
          const mediaResult = await mediaService.uploadStoreMedia(req.files, {
            merchant_id: storeData.merchant_id || store.merchant_id,
            store_id: store.id,
            metadata: { store_name: store.name },
          });

          // Store the media IDs in your store record (optional)
          store.media_ids = mediaResult.media_ids;
        } catch (mediaError) {
          console.error(
            "Media upload failed, but store was created:",
            mediaError,
          );
          // Store was created, but media failed - you might want to queue this for retry
        }
      }

      res.status(201).json({
        success: true,
        message: "Store created successfully",
        data: store,
      });
    } catch (error) {
      console.error("Create store error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create store",
        error: error.message,
      });
    }
  }

  async getAll(req, res) {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      merchant_id: req.query.merchant_id,
      status: req.query.status,
      city: req.query.city,
      country: req.query.country,
      search: req.query.q || req.query.name,
      category: req.query.category,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await StoreModel.findAll(options);

    return res.status(200).json({
      success: true,
      count: result.data.length,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error("Get stores error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stores",
      error: error.message
    });
  }
}

  async getById(req, res) {
    try {
      const store = await StoreModel.findById(req.params.id);

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      // Get auth token from request headers
      const authToken = req.headers.authorization;

      // Fetch media with authentication
      try {
        const mediaData = await mediaService.getStoreMedia(
          store.id,
          store.merchant_id,
          authToken, // Pass the token
        );
        store.media = mediaData.data || [];
      } catch (mediaError) {
        console.error("Failed to fetch media:", mediaError.message);
        store.media = []; // Empty array if media service fails
      }

      res.json({
        success: true,
        data: store,
      });
    } catch (error) {
      console.error("Get store error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch store",
        error: error.message,
      });
    }
  }

  async update(req, res) {
    try {
      const { users } = req.body;
      const store = await StoreModel.update(req.params.id, req.body);

      if (users) {
        await StoreModel.updateUsersForStore(req.params.id, users);
      }

      res.json({
        success: true,
        message: "Store updated",
        data: await StoreModel.findById(req.params.id),
      });
    } catch (error) {
      console.error("Update store error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update store",
        error: error.message,
      });
    }
  }

  async delete(req, res) {
    try {
      const deleted = await StoreModel.softDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      res.json({
        success: true,
        message: "Store deleted successfully",
      });
    } catch (error) {
      console.error("Delete store error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete store",
        error: error.message,
      });
    }
  }

  async restore(req, res) {
    try {
      const restored = await StoreModel.restore(req.params.id);

      if (!restored) {
        return res.status(404).json({
          success: false,
          message: "Store not found or not deleted",
        });
      }

      res.json({
        success: true,
        message: "Store restored successfully",
      });
    } catch (error) {
      console.error("Restore store error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to restore store",
        error: error.message,
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const stats = await StoreModel.getStatistics(req.params.id);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get statistics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch statistics",
        error: error.message,
      });
    }
  }

  async addReview(req, res) {
    try {
      const reviewId = await StoreModel.addReview(req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: "Review added successfully",
        data: { id: reviewId },
      });
    } catch (error) {
      console.error("Add review error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add review",
        error: error.message,
      });
    }
  }

  async getReviews(req, res) {
    try {
      const reviews = await StoreModel.getReviews(req.params.id, {
        page: req.query.page,
        limit: req.query.limit,
      });
      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch reviews",
        error: error.message,
      });
    }
  }

  async searchNearby(req, res) {
    try {
      const { lat, lng, radius = 10 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const query = `
        SELECT 
          s.*,
          (6371 * acos(
            cos(radians(?)) * cos(radians(ST_X(s.coordinates))) * 
            cos(radians(ST_Y(s.coordinates)) - radians(?)) + 
            sin(radians(?)) * sin(radians(ST_X(s.coordinates)))
          )) AS distance,
          AVG(sr.rating) as average_rating
        FROM stores s
        LEFT JOIN store_reviews sr ON s.id = sr.store_id AND sr.status = 'approved'
        WHERE s.deleted_at IS NULL AND s.coordinates IS NOT NULL
        HAVING distance < ?
        ORDER BY distance
        LIMIT 20
      `;

      const [stores] = await require("../config/database").execute(query, [
        lat,
        lng,
        lat,
        radius,
      ]);

      res.json({
        success: true,
        data: stores,
      });
    } catch (error) {
      console.error("Search nearby error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search nearby stores",
        error: error.message,
      });
    }
  }

  async search(req, res) {
    try {
      const { q } = req.query;
      const options = {
        search: q,
        page: req.query.page,
        limit: req.query.limit,
      };
      const result = await StoreModel.findAll(options);
      res.json({ success: true, data: result.data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async filter(req, res) {
    try {
      const { category, city, status } = req.query;
      const options = {
        category,
        city,
        status,
        page: req.query.page,
        limit: req.query.limit,
      };
      const result = await StoreModel.findAll(options);
      res.json({ success: true, data: result.data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getFeatured(req, res) {
    try {
      // Get stores with highest ratings or featured flag
      const options = {
        status: "active",
        sortBy: "average_rating",
        sortOrder: "DESC",
        limit: 10,
      };
      const result = await StoreModel.findAll(options);
      res.json({ success: true, data: result.data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Upload images for a store (using route parameter :id)
  async uploadStoreImages(req, res) {
    try {
      const { id } = req.params;
      const merchant_id = req.body.merchant_id || req.user?.merchant_id;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      if (!merchant_id) {
        return res.status(400).json({
          success: false,
          message: "merchant_id is required",
        });
      }

      const result = await mediaService.uploadStoreMedia(req.files, {
        merchant_id: store.merchant_id,
        store_id: store.id,
        metadata: { store_name: store.name },
        authToken: req.headers.authorization,
      });

      res.status(201).json({
        success: true,
        message: "Images uploaded successfully",
        data: result,
      });
    } catch (error) {
      console.error("Upload store images error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload images",
        error: error.message,
      });
    }
  }
}
/**
 * Get store with products from PRODUCT-SERVICE
 * GET /:storeId/with-products
 */
exports.getStoreWithProducts = catchAsync(async (req, res) => {
  const { storeId } = req.params;

  console.log("=== GET STORE WITH PRODUCTS DEBUG ===");
  console.log("Store ID:", storeId);

  // 1. Get local store
  const store = await Store.findByPk(storeId);
  if (!store) {
    throw new ApiError(404, "Store not found");
  }

  console.log("✅ Store found:", store.id, store.name);

  // 2. Get products from PRODUCT-SERVICE
  let products = [];
  try {
    products = await serviceClient.call(
      "product",
      "GET",
      `/api/products/store/${storeId}`,
      null,
      { Authorization: req.headers.authorization },
    );
    console.log(
      `✅ Fetched ${products.length || 0} products from product service`,
    );
  } catch (err) {
    console.warn("⚠️  Product service unavailable:", err.message);
    // Continue with empty products array - graceful degradation
  }

  // 3. Combine and return data
  res.status(200).json({
    success: true,
    data: {
      ...store.toJSON(),
      products: products,
    },
  });
});

module.exports = new StoreController();
