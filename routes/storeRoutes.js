const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { storeValidationRules, validate } = require('../utils/validators');


// ===============================
// PUBLIC ROUTES (No authentication required)
// ===============================

// Search & Filter Routes (MUST be before /:id routes)
router.get('/search', storeController.search);
router.get('/filter', storeController.filter);
router.get('/featured', storeController.getFeatured);
router.get('/nearby', storeController.searchNearby);

// ===============================
// STORE CRUD ROUTES
// ===============================

// Create store
router.post(
  '/',
  storeValidationRules.create,
  authenticate,
  storeController.create
);

// Get all stores (with pagination, filtering)
router.get(
  '/',
  storeValidationRules.search,
  validate,
  storeController.getAll
);

// Get store by ID (basic info)
router.get(
  '/:id',
  storeValidationRules.getById,
  validate,
  storeController.getById
);

// Get store with media (enriched data)
router.get(
  '/:id/with-media',
  storeValidationRules.getById,
  validate,
  storeController.getById
);

// Update store
router.put(
  '/:id',
  storeValidationRules.update,
  validate,
  storeController.update
);

// Soft delete store
router.delete(
  '/:id',
  storeValidationRules.getById,
  validate,
  storeController.delete
);

// Restore deleted store
router.patch(
  '/:id/restore',
  storeValidationRules.getById,
  validate,
  storeController.restore
);


// ===============================
// MEDIA ROUTES
// ===============================

// Upload images for a store
router.post(
  '/:id/media',
  upload.array('files', 300), // Allow up to 5 files
  upload.handleError, // Handle multer errors
  storeController.uploadStoreImages
);

// ===============================
// STATISTICS & ANALYTICS
// ===============================

// Get store statistics
router.get(
  '/:id/statistics',
  storeController.getStatistics
);

// ===============================
// REVIEW ROUTES
// ===============================

// Add review to store
router.post(
  '/:id/reviews',
  storeController.addReview
);

// Get store reviews
router.get(
  '/:id/reviews',
  storeController.getReviews
);

module.exports = router;