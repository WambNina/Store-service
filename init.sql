-- Create database
CREATE DATABASE IF NOT EXISTS store_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE store_db;

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
    business_hours JSON,
    coordinates POINT,
    owner_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_status (status),
    INDEX idx_city (city),
    INDEX idx_owner (owner_id),
    FULLTEXT INDEX idx_search (name, description)
) ENGINE=InnoDB;

-- Store categories table
CREATE TABLE IF NOT EXISTS store_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    INDEX idx_store_category (store_id, category_name)
) ENGINE=InnoDB;

-- Create store_users table
CREATE TABLE IF NOT EXISTS store_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_store_user (store_id, user_id),
  INDEX idx_store_id (store_id),

  CONSTRAINT fk_store_users_store
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

DELIMITER $$

CREATE TRIGGER trg_store_users_before_update
BEFORE UPDATE ON store_users
FOR EACH ROW
BEGIN
  DECLARE cnt2 INT;

  IF NEW.store_id <> OLD.store_id THEN

    SELECT COUNT(*) INTO cnt2
    FROM store_users
    WHERE store_id = NEW.store_id;

    IF cnt2 >= 3 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Target store would exceed 3 users';
    END IF;

  END IF;

END$$

DELIMITER ;

-- Store images table
CREATE TABLE IF NOT EXISTS store_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Store reviews table
CREATE TABLE IF NOT EXISTS store_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    user_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    INDEX idx_store_rating (store_id, rating)
) ENGINE=InnoDB;

-- Store analytics table
CREATE TABLE IF NOT EXISTS store_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    orders INT DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0.00,
    UNIQUE KEY unique_store_date (store_id, date),
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insert sample data
INSERT INTO stores (name, description, address, city, state, zip_code, phone, email, status, business_hours) VALUES
('Tech Haven', 'Your one-stop electronics store', '123 Tech Street', 'San Francisco', 'CA', '94102', '555-0101', 'info@techhaven.com', 'active', 
 '{"monday": {"open": "09:00", "close": "21:00"}, "tuesday": {"open": "09:00", "close": "21:00"}}'),
('Fashion Forward', 'Trendy clothing for everyone', '456 Style Avenue', 'Los Angeles', 'CA', '90001', '555-0202', 'hello@fashionfwd.com', 'active', NULL),
('Green Grocers', 'Fresh organic produce daily', '789 Market Street', 'New York', 'NY', '10001', '555-0303', 'fresh@greengrocers.com', 'active', NULL);