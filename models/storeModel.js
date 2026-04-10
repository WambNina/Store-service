const { pool } = require("../config/database");
const { v4: uuidv4 } = require("uuid");

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
    users = [],
  } = storeData;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Generate UUID
    const storeId = uuidv4(); // e.g., "2a85c4e5-68d3-4a99-842b-d709746d5f01"

    const [result] = await connection.execute(
      `INSERT INTO stores 
      (id, name, description, address, city, state, zip_code, country, 
       phone, email, website, logo_url, status, business_hours, owner_id, merchant_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // 16 placeholders
      [
        storeId,        // ← 1. ADD THIS: the generated UUID
        name,           // 2
        description,    // 3
        address,        // 4
        city,           // 5
        state,          // 6
        zip_code,       // 7
        country,        // 8
        phone,          // 9
        email,          // 10
        website,        // 11
        logo_url,       // 12
        status,         // 13
        business_hours ? JSON.stringify(business_hours) : null, // 14
        owner_id,       // 15
        merchant_id,    // 16
      ]
    );

    // Categories - use storeId
    if (categories.length) {
      for (const category of categories) {
        await connection.execute(
          `INSERT INTO store_categories (store_id, category_name) VALUES (?, ?)`,
          [storeId, category]
        );
      }
    }

    // Users - use storeId
    if (users.length) {
      if (users.length > 3) {
        throw new Error("Maximum 3 users allowed per store");
      }

      for (const userId of users) {
        await connection.execute(
          `INSERT INTO store_users (store_id, user_id) VALUES (?, ?)`,
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

  // =========================
  // FIND BY ID
  // =========================
  static async findById(id) {
    const [rows] = await pool.execute(
      `
      SELECT 
        s.*,
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
      WHERE s.id = ? AND s.deleted_at IS NULL
      GROUP BY s.id
      `,
      [id]
    );

    if (!rows.length) return null;

    const store = rows[0];

    store.categories = store.categories ? store.categories.split(",") : [];
    store.users = store.users ? store.users.split(",").map(Number) : [];
    store.images = store.images ? store.images.split(",") : [];
    store.avg_rating = store.avg_rating
      ? parseFloat(store.avg_rating).toFixed(1)
      : null;

    return store;
  }

  // =========================
  // FIND ALL (🔥 CORRIGÉ)
  // =========================
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      merchant_id,
      status,
      city,
      country,
      search,
      category,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = options;

    const offset = (page - 1) * limit;
    const params = [];

    let whereClause = "WHERE s.deleted_at IS NULL";

    // ✅ merchant_id filter (exclude NULL automatically)
    if (merchant_id) {
      whereClause += " AND s.merchant_id = ?";
      params.push(parseInt(merchant_id));
    } else {
      whereClause += " AND s.merchant_id IS NOT NULL";
    }

    if (status) {
      whereClause += " AND s.status = ?";
      params.push(status);
    }

    if (city) {
      whereClause += " AND s.city = ?";
      params.push(city);
    }

    if (country) {
      whereClause += " AND s.country = ?";
      params.push(country);
    }

    if (category) {
      whereClause += " AND sc.category_name = ?";
      params.push(category);
    }

    if (search) {
      whereClause += ` AND (
        s.name LIKE ? OR 
        s.description LIKE ? OR 
        s.city LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // ✅ sécuriser tri
    const allowedSort = ["created_at", "name", "city", "status"];
    const safeSortBy = allowedSort.includes(sortBy) ? sortBy : "created_at";
    const safeOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // COUNT
    const [countResult] = await pool.execute(
      `
      SELECT COUNT(DISTINCT s.id) as total
      FROM stores s
      LEFT JOIN store_categories sc ON s.id = sc.store_id
      ${whereClause}
      `,
      params
    );

    const total = countResult[0].total;

    // DATA
    const [rows] = await pool.execute(
      `
      SELECT 
        s.*,
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
      ORDER BY s.${safeSortBy} ${safeOrder}
      LIMIT ? OFFSET ?
      `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const data = rows.map(store => ({
      ...store,
      categories: store.categories ? store.categories.split(",") : [],
      users: store.users ? store.users.split(",").map(Number) : [],
      images: store.images ? store.images.split(",") : [],
      avg_rating: store.avg_rating
        ? parseFloat(store.avg_rating).toFixed(1)
        : null
    }));

    return {
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================
  // UPDATE
  // =========================
  static async update(id, updateData) {
    const allowedFields = [
      "name","merchant_id","description","address","city","state",
      "zip_code","country","phone","email","website","logo_url",
      "status","business_hours"
    ];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(key === "business_hours" ? JSON.stringify(value) : value);
      }
    }

    if (!updates.length) return null;

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE stores SET ${updates.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      values
    );

    return result.affectedRows ? this.findById(id) : null;
  }

  // =========================
  // DELETE / RESTORE
  // =========================
  static async softDelete(id) {
    const [result] = await pool.execute(
      "UPDATE stores SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
    return result.affectedRows > 0;
  }

  static async restore(id) {
    const [result] = await pool.execute(
      "UPDATE stores SET deleted_at = NULL WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  static async hardDelete(id) {
    const [result] = await pool.execute(
      "DELETE FROM stores WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = StoreModel;