CREATE DATABASE IF NOT EXISTS smartcanteen;
USE smartcanteen;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    quantity INT DEFAULT 0,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_number INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'Preparing', 'Ready', 'Collected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_id) REFERENCES menu(id)
);

CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 0,
    unit VARCHAR(30),
    low_stock_limit INT DEFAULT 5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO menu (name, description, price, quantity, available)
SELECT 'Veg Burger', 'Fresh vegetable burger', 50.00, 20, TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name = 'Veg Burger');

INSERT INTO menu (name, description, price, quantity, available)
SELECT 'Masala Maggi', 'Spicy masala noodles', 40.00, 25, TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name = 'Masala Maggi');

INSERT INTO menu (name, description, price, quantity, available)
SELECT 'Cold Coffee', 'Chilled creamy coffee', 60.00, 15, TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name = 'Cold Coffee');

INSERT INTO menu (name, description, price, quantity, available)
SELECT 'Veg Sandwich', 'Fresh vegetable sandwich', 45.00, 20, TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name = 'Veg Sandwich');

INSERT INTO menu (name, description, price, quantity, available)
SELECT 'Samosa', 'Crispy potato samosa', 15.00, 30, TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name = 'Samosa');

INSERT INTO users (name, email, password, role)
SELECT 'Test Student', 'student@test.com', '12345', 'student'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student@test.com');

INSERT INTO inventory (item_name, quantity, unit, low_stock_limit)
SELECT 'Bread', 20, 'packets', 5
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_name = 'Bread');

INSERT INTO inventory (item_name, quantity, unit, low_stock_limit)
SELECT 'Potato', 30, 'kg', 5
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_name = 'Potato');

INSERT INTO inventory (item_name, quantity, unit, low_stock_limit)
SELECT 'Coffee', 15, 'packets', 5
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_name = 'Coffee');

INSERT INTO inventory (item_name, quantity, unit, low_stock_limit)
SELECT 'Vegetables', 20, 'kg', 5
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_name = 'Vegetables');

INSERT INTO inventory (item_name, quantity, unit, low_stock_limit)
SELECT 'Cooking Oil', 10, 'liters', 3
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_name = 'Cooking Oil');
