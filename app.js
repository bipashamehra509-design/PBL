const express = require("express");
const db = require("./db");

const app = express();
const PORT = 3000;

// EJS setup
app.set("view engine", "ejs");

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Parse JSON
app.use(express.json());


// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {

    db.query(
        "SELECT * FROM menu WHERE available = TRUE",
        (err, results) => {

            if (err) {
                return res.status(500).send(
                    "Database Error: " + err.message
                );
            }

            res.render("home", { menu: results });
        }
    );

});


// ===============================
// PLACE ORDER
// ===============================

app.post("/order", (req, res) => {

    const menuId = req.body.menu_id;
    const userId = 1;

    const tokenQuery = `
        SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token
        FROM orders
    `;

    db.query(tokenQuery, (err, tokenResult) => {

        if (err) {
            return res.status(500).send(
                "Token Error: " + err.message
            );
        }

        const tokenNumber = tokenResult[0].next_token;

        db.query(
            "SELECT * FROM menu WHERE id = ? AND available = TRUE AND quantity > 0",
            [menuId],
            (err, menuResult) => {

                if (err) {
                    return res.status(500).send(
                        "Menu Error: " + err.message
                    );
                }

                if (menuResult.length === 0) {
                    return res.status(404).send(
                        "Food item is out of stock!"
                    );
                }

                const item = menuResult[0];
                const totalAmount = item.price;

                const orderQuery = `
                    INSERT INTO orders
                    (user_id, token_number, total_amount, status)
                    VALUES (?, ?, ?, 'Pending')
                `;

                db.query(
                    orderQuery,
                    [userId, tokenNumber, totalAmount],
                    (err, orderResult) => {

                        if (err) {
                            return res.status(500).send(
                                "Order Error: " + err.message
                            );
                        }

                        const itemQuery = `
                            INSERT INTO order_items
                            (order_id, menu_id, quantity, price)
                            VALUES (?, ?, 1, ?)
                        `;

                        db.query(
                            itemQuery,
                            [
                                orderResult.insertId,
                                menuId,
                                item.price
                            ],
                            (err) => {

                                if (err) {
                                    return res.status(500).send(
                                        "Order Item Error: " +
                                        err.message
                                    );
                                }

                                // Decrease menu stock by 1
                                const stockQuery = `
                                    UPDATE menu
                                    SET quantity = quantity - 1
                                    WHERE id = ? AND quantity > 0
                                `;

                                db.query(
                                    stockQuery,
                                    [menuId],
                                    (err) => {

                                        if (err) {
                                            return res.status(500).send(
                                                "Stock Update Error: " +
                                                err.message
                                            );
                                        }

                                        res.send(`
                                            <!DOCTYPE html>
                                            <html>

                                            <head>
                                                <title>Order Successful</title>
                                            </head>

                                            <body>

                                                <h1>
                                                    🎉 Order Placed Successfully!
                                                </h1>

                                                <h2>
                                                    🎟️ Your Token Number:
                                                    ${tokenNumber}
                                                </h2>

                                                <p>
                                                    🍔 Item:
                                                    ${item.name}
                                                </p>

                                                <p>
                                                    💰 Total:
                                                    ₹${totalAmount}
                                                </p>

                                                <p>
                                                    📦 Remaining Stock:
                                                    ${item.quantity - 1}
                                                </p>

                                                <p>
                                                    📋 Status:
                                                    Pending
                                                </p>

                                                <br>

                                                <a href="/">
                                                    ⬅ Back to Menu
                                                </a>

                                            </body>

                                            </html>
                                        `);

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    });

});


// ===============================
// ORDER QUEUE
// ===============================

app.get("/orders", (req, res) => {

    const query = `
        SELECT
            orders.id,
            orders.token_number,
            orders.total_amount,
            orders.status,
            menu.name AS item_name
        FROM orders
        JOIN order_items
            ON orders.id = order_items.order_id
        JOIN menu
            ON order_items.menu_id = menu.id
        ORDER BY
            CASE
                WHEN orders.status = 'Pending' THEN 1
                WHEN orders.status = 'Preparing' THEN 2
                WHEN orders.status = 'Ready' THEN 3
                WHEN orders.status = 'Collected' THEN 4
            END,
            orders.token_number ASC
    `;

    db.query(query, (err, results) => {

        if (err) {
            return res.status(500).send(
                "Queue Error: " + err.message
            );
        }

        res.render("orders", { orders: results });

    });

});


// ===============================
// UPDATE ORDER STATUS
// ===============================

app.post("/update-status", (req, res) => {

    const orderId = req.body.order_id;
    const newStatus = req.body.status;

    const allowedStatuses = [
        "Pending",
        "Preparing",
        "Ready",
        "Collected"
    ];

    if (!allowedStatuses.includes(newStatus)) {
        return res.status(400).send(
            "Invalid order status!"
        );
    }

    const query = `
        UPDATE orders
        SET status = ?
        WHERE id = ?
    `;

    db.query(
        query,
        [newStatus, orderId],
        (err) => {

            if (err) {
                return res.status(500).send(
                    "Status Update Error: " +
                    err.message
                );
            }

            res.redirect("/orders");

        }
    );

});

// ===============================
// ADMIN DASHBOARD
// ===============================

app.get("/admin", (req, res) => {

    const query = `
        SELECT
            COUNT(*) AS totalOrders,
            COALESCE(SUM(total_amount), 0) AS totalSales,

            SUM(CASE
                WHEN status = 'Pending' THEN 1
                ELSE 0
            END) AS pendingOrders,

            SUM(CASE
                WHEN status = 'Preparing' THEN 1
                ELSE 0
            END) AS preparingOrders,

            SUM(CASE
                WHEN status = 'Ready' THEN 1
                ELSE 0
            END) AS readyOrders,

            SUM(CASE
                WHEN status = 'Collected' THEN 1
                ELSE 0
            END) AS collectedOrders

        FROM orders
    `;

    db.query(query, (err, results) => {

        if (err) {
            return res.status(500).send(
                "Admin Dashboard Error: " + err.message
            );
        }

        const stats = results[0];

        res.render("admin", { stats: stats });

    });

});
// ===============================
// INVENTORY PAGE
// ===============================

app.get("/inventory", (req, res) => {

    const query = `
        SELECT *
        FROM inventory
        ORDER BY item_name ASC
    `;

    db.query(query, (err, results) => {

        if (err) {
            return res.status(500).send(
                "Inventory Error: " + err.message
            );
        }

        res.render("inventory", { inventory: results });

    });

});


// ===============================
// TEST DATABASE CONNECTION
// ===============================

app.get("/test-db", (req, res) => {

    db.query(
        "SELECT 1 AS result",
        (err, results) => {

            if (err) {
                return res.status(500).send(
                    "Database Error: " + err.message
                );
            }

            res.send(
                "✅ Database Connected Successfully!"
            );

        }
    );

});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log(
        `🚀 Server running at http://localhost:${PORT}`
    );

});