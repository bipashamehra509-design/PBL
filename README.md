# Smart Canteen Management System Using Data Structures

A college PBL project for managing canteen menus, online orders, token-based queues, order status tracking, inventory, and basic sales analytics.

## Features
- Smart menu display with item availability and stock
- Online food ordering
- Token generation and queue management
- Order status: Pending → Preparing → Ready → Collected
- Inventory display with low-stock alerts
- Admin dashboard with order and sales statistics
- MySQL database integration
- Data Structures: Queue (FIFO), Array, Linked List, Stack

## Technology Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Templating: EJS
- Database: MySQL
- Tools: VS Code, Git, GitHub

## Setup
1. Install Node.js and MySQL.
2. Clone the repository.
3. Run `npm install`.
4. Run `database/smartcanteen.sql` in MySQL.
5. Create `.env` in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=smartcanteen
DB_PORT=3306
```

6. Start the server:

```bash
node app.js
```

7. Open `http://localhost:3000`.

## Main Routes
- `/` — Menu and ordering
- `/orders` — Order queue/status management
- `/inventory` — Inventory and low-stock status
- `/admin` — Admin dashboard
- `/test-db` — Database connection test

## Important Notes
- `.env` and `node_modules` are excluded from GitHub.
- The current PBL demo uses a fixed test user (`user_id = 1`).
- Inventory is currently a separate raw-material demonstration; menu stock is decremented from `menu.quantity`.

## Data Structures
- **Queue (FIFO):** token/order management.
- **Array:** menu/status collections.
- **Linked List:** dynamic inventory/food-list concept in the PBL design.
- **Stack:** recent/cancelled order-history concept.
