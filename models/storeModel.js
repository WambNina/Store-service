const { pool } = require('../config/database');

class StoreModel {
  static async create(storeData) {
    const {
      name,
      description = null,
      address = null,
      city = null,
      state = null,
      zip_code = null,
      country = "USA",
      phone = null,
      email = null,
      website = null,
      logo_url = null,
      status = "pending",
      business_hours = null,
      owner_id = null,
      merchant_id = null,
      categories = [],
      users = [], // 👈 NEW
    } = storeData;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Insert store
      const [result] = await connection.execute(
        `INSERT INTO stores 
            (name, description, address, city, state, zip_code, country, 
             phone, email, website, logo_url, status, business_hours, owner_id, merchant_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description,
          address,
          city,
          state,
          zip_code,
          country,
          phone,
          email,
          website,
          logo_url,
          status,
          business_hours ? JSON.stringify(business_hours) : null,
          owner_id,
          merchant_id,
        ],
      );

      const storeId = result.insertId;

      // -------------------------
      // Insert categories
      // -------------------------
  // Insert categories
        if (categories.length) {

            for (const category of categories) {

                await connection.execute(
                    `INSERT INTO store_categories (store_id, category_name)
                     VALUES (?,?)`,
                    [storeId, category]
                );

            }
        }

        // Insert users
        if (users.length) {

            if (users.length > 3) {
                throw new Error('Maximum 3 users allowed per store');
            }

            for (const userId of users) {

                await connection.execute(
                    `INSERT INTO store_users (store_id, user_id)
                     VALUES (?,?)`,
                    [storeId, userId]
                );

            }
        }

        await connection.commit();

        return await this.findById(storeId);

    } catch (error) {

        await connection.rollback();
        throw error;

    } finally {

        connection.release();

    }
}
  static async findById(id) {

    const [rows] = await pool.execute(`
        SELECT 
            s.id,
            s.name,
            s.description,
            s.address,
            s.city,
            s.state,
            s.zip_code,
            s.country,
            s.phone,
            s.email,
            s.website,
            s.logo_url,
            s.status,
            s.business_hours,
            s.owner_id,
            s.created_at,
            s.updated_at,

            GROUP_CONCAT(DISTINCT sc.category_name) AS categories,
            GROUP_CONCAT(DISTINCT su.user_id) AS users,
            GROUP_CONCAT(DISTINCT si.image_url) AS images,

            AVG(sr.rating) AS avg_rating,
            COUNT(DISTINCT sr.id) AS review_count

        FROM stores s

        LEFT JOIN store_categories sc 
            ON s.id = sc.store_id

        LEFT JOIN store_users su 
            ON s.id = su.store_id

        LEFT JOIN store_images si 
            ON s.id = si.store_id

        LEFT JOIN store_reviews sr 
            ON s.id = sr.store_id
            AND sr.status = 'approved'

        WHERE s.id = ?
        AND s.deleted_at IS NULL

        GROUP BY s.id
    `, [id]);

    if (rows.length === 0) {
        return null;
    }

    const store = rows[0];

    // Convert comma-separated strings to arrays
    store.categories = store.categories
        ? store.categories.split(',')
        : [];

    store.users = store.users
        ? store.users.split(',').map(Number)
        : [];

    store.images = store.images
        ? store.images.split(',')
        : [];

    store.avg_rating = store.avg_rating
        ? parseFloat(store.avg_rating).toFixed(1)
        : null;

    return store;
}
static async findAll(options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    city, 
    search, 
    category,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;
  
  const offset = (page - 1) * limit;
  const params = [];
  
  let whereClause = 'WHERE s.deleted_at IS NULL';
  
  if (status) {
    whereClause += ' AND s.status = ?';
    params.push(status);
  }
  
  if (city) {
    whereClause += ' AND s.city = ?';
    params.push(city);
  }
  
  if (category) {
    whereClause += ' AND sc.category_name = ?';
    params.push(category);
  }
  
  if (search) {
    whereClause += ' AND (s.name LIKE ? OR s.description LIKE ? OR s.city LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Get total count for pagination
  const [countResult] = await pool.execute(`
    SELECT COUNT(DISTINCT s.id) as total 
    FROM stores s
    LEFT JOIN store_categories sc ON s.id = sc.store_id
    ${whereClause}
  `, params);
  
  const total = countResult[0].total;

  // Get paginated results
  const [rows] = await pool.execute(`
    SELECT 
      s.id,
      s.name,
      s.description,
      s.address,
      s.city,
      s.state,
      s.zip_code,
      s.country,
      s.phone,
      s.email,
      s.website,
      s.logo_url,
      s.status,
      s.business_hours,
      s.owner_id,
      s.created_at,
      s.updated_at,
      GROUP_CONCAT(DISTINCT sc.category_name) AS categories,
      GROUP_CONCAT(DISTINCT su.user_id) AS users,
      GROUP_CONCAT(DISTINCT si.image_url) AS images,
      AVG(sr.rating) AS avg_rating,
      COUNT(DISTINCT sr.id) AS review_count
    FROM stores s
    LEFT JOIN store_categories sc ON s.id = sc.store_id
    LEFT JOIN store_users su ON s.id = su.store_id
    LEFT JOIN store_images si ON s.id = si.store_id
    LEFT JOIN store_reviews sr ON s.id = sr.store_id AND sr.status = 'approved'
    ${whereClause}
    GROUP BY s.id
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  // Transform the results
  const data = rows.map(store => ({
    ...store,
    categories: store.categories ? store.categories.split(',') : [],
    users: store.users ? store.users.split(',').map(Number) : [],
    images: store.images ? store.images.split(',') : [],
    avg_rating: store.avg_rating ? parseFloat(store.avg_rating).toFixed(1) : null
  }));

  // Return the structure the controller expects
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
  static async update(id, updateData) {
    const allowedFields = [
      "name",
      "description",
      "address",
      "city",
      "state",
      "zip_code",
      "country",
      "phone",
      "email",
      "website",
      "logo_url",
      "status",
      "business_hours",
    ];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(key === "business_hours" ? JSON.stringify(value) : value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const query = `UPDATE stores SET ${updates.join(", ")} WHERE id = ? AND deleted_at IS NULL`;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0 ? this.findById(id) : null;
  }

  static async softDelete(id) {
    const [result] = await pool.execute(
      "UPDATE stores SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    return result.affectedRows > 0;
  }

  static async restore(id) {
    const [result] = await pool.execute(
      "UPDATE stores SET deleted_at = NULL WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }

  static async hardDelete(id) {
    const [result] = await pool.execute("DELETE FROM stores WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }

  static async addReview(storeId, reviewData) {
    const { user_id, rating, comment } = reviewData;
    const [result] = await pool.execute(
      "INSERT INTO store_reviews (store_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
      [storeId, user_id, rating, comment],
    );
    return result.insertId;
  }

  static async getReviews(storeId, options = {}) {
    const { page = 1, limit = 10, status = "approved" } = options;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      `SELECT sr.*, u.name as user_name 
             FROM store_reviews sr
             LEFT JOIN users u ON sr.user_id = u.id
             WHERE sr.store_id = ? AND sr.status = ?
             ORDER BY sr.created_at DESC
             LIMIT ? OFFSET ?`,
      [storeId, status, parseInt(limit), parseInt(offset)],
    );

    return rows;
  }

  static async getStatistics(storeId) {
    const [stats] = await pool.execute(
      `SELECT 
                COUNT(DISTINCT sr.id) as total_reviews,
                AVG(sr.rating) as average_rating,
                COUNT(DISTINCT CASE WHEN sr.rating = 5 THEN sr.id END) as five_star,
                COUNT(DISTINCT CASE WHEN sr.rating = 4 THEN sr.id END) as four_star,
                COUNT(DISTINCT CASE WHEN sr.rating = 3 THEN sr.id END) as three_star,
                COUNT(DISTINCT CASE WHEN sr.rating = 2 THEN sr.id END) as two_star,
                COUNT(DISTINCT CASE WHEN sr.rating = 1 THEN sr.id END) as one_star
             FROM store_reviews sr
             WHERE sr.store_id = ? AND sr.status = 'approved'`,
      [storeId],
    );

    const [analytics] = await pool.execute(
      `SELECT 
                SUM(views) as total_views,
                SUM(clicks) as total_clicks,
                SUM(orders) as total_orders,
                SUM(revenue) as total_revenue
             FROM store_analytics
             WHERE store_id = ?`,
      [storeId],
    );

    return {
      reviews: stats[0],
      analytics: analytics[0],
    };
  }

  static async updateAnalytics(storeId, date, metrics) {
    const { views = 0, clicks = 0, orders = 0, revenue = 0 } = metrics;

    await pool.execute(
      `INSERT INTO store_analytics (store_id, date, views, clicks, orders, revenue)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             views = views + VALUES(views),
             clicks = clicks + VALUES(clicks),
             orders = orders + VALUES(orders),
             revenue = revenue + VALUES(revenue)`,
      [storeId, date, views, clicks, orders, revenue],
    );
  }
}

module.exports = StoreModel;
