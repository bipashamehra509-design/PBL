require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const allowedStatuses = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"];
const allowedPriorities = ["Normal", "High", "Urgent"];

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  try {
    const items = db.all("SELECT * FROM inventory ORDER BY name");
    res.render("home", { items, error: req.query.error || "" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not load menu.");
  }
});

app.post("/order", (req, res) => {
  const customer = (req.body.customer_name || "").trim();
  const itemId = Number(req.body.item_id);
  const quantity = Number(req.body.quantity);
  const priority = allowedPriorities.includes(req.body.priority) ? req.body.priority : "Normal";

  if (!customer || customer.length > 120 || !Number.isInteger(itemId) ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return res.redirect("/?error=" + encodeURIComponent("Please enter valid order details."));
  }

  try {
    db.transaction(tx => {
      const item = tx.get("SELECT id, price, stock FROM inventory WHERE id=?", [itemId]);
      if (!item || item.stock < quantity) throw new Error("NOT_ENOUGH_STOCK");
      tx.run("INSERT INTO orders (customer_name,item_id,quantity,total,priority) VALUES (?,?,?,?,?)",
        [customer, itemId, quantity, item.price * quantity, priority]);
      tx.run("UPDATE inventory SET stock=stock-? WHERE id=?", [quantity, itemId]);
    });
    res.redirect("/orders?success=1");
  } catch (err) {
    if (err.message === "NOT_ENOUGH_STOCK") {
      return res.redirect("/?error=" + encodeURIComponent("Not enough stock available."));
    }
    console.error(err);
    res.status(500).send("Could not place order.");
  }
});

app.get("/orders", (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const status = req.query.status || "";
    const priority = req.query.priority || "";
    const conditions = [];
    const params = [];
    if (search) {
      conditions.push("(o.customer_name LIKE ? OR i.name LIKE ? OR CAST(o.id AS TEXT) LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (allowedStatuses.includes(status)) {
      conditions.push("o.status=?");
      params.push(status);
    }
    if (allowedPriorities.includes(priority)) {
      conditions.push("o.priority=?");
      params.push(priority);
    }
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const orders = db.all(
      `SELECT o.*, i.name AS item_name FROM orders o
       JOIN inventory i ON i.id=o.item_id ${where}
       ORDER BY CASE o.priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,
       o.created_at ASC, o.id ASC`,
      params
    );
    res.render("orders", { orders, search, status, priority, statuses: allowedStatuses,
      priorities: allowedPriorities, success: req.query.success === "1" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not load orders.");
  }
});

app.post("/update-status/:id", (req, res) => {
  const id = Number(req.params.id);
  const status = req.body.status;
  if (!Number.isInteger(id) || !allowedStatuses.includes(status)) return res.status(400).send("Invalid update.");
  try {
    db.run("UPDATE orders SET status=? WHERE id=?", [status, id]);
    res.redirect("/orders");
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not update status.");
  }
});

app.get("/admin", (req, res) => {
  try {
    const summary = db.get(`
      SELECT COUNT(*) AS total_orders,
      COALESCE(SUM(CASE WHEN status NOT IN ('Completed','Cancelled') THEN 1 ELSE 0 END),0) AS active_orders,
      COALESCE(SUM(CASE WHEN status='Completed' THEN total ELSE 0 END),0) AS revenue
      FROM orders`);
    const stockSummary = db.get(
      "SELECT COUNT(*) AS products, COALESCE(SUM(stock),0) AS units, COALESCE(SUM(CASE WHEN stock <= low_stock_limit THEN 1 ELSE 0 END),0) AS low_stock FROM inventory"
    );
    const recent = db.all(
      `SELECT o.*, i.name AS item_name FROM orders o JOIN inventory i ON i.id=o.item_id
       ORDER BY CASE WHEN o.status IN ('Completed','Cancelled') THEN 1 ELSE 0 END,
       CASE o.priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,
       o.created_at ASC, o.id ASC LIMIT 6`
    );
    res.render("admin", { summary, stockSummary, recent });
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not load dashboard.");
  }
});

app.get("/inventory", (req, res) => {
  try {
    const items = db.all("SELECT * FROM inventory ORDER BY CASE WHEN stock <= low_stock_limit THEN 0 ELSE 1 END, name");
    res.render("inventory", { items, error: req.query.error || "", success: req.query.success === "1" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not load inventory.");
  }
});

app.post("/inventory/add", (req, res) => {
  const name = (req.body.name || "").trim();
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  const limit = Number(req.body.low_stock_limit);
  if (!name || name.length > 120 || !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(stock) || stock < 0 || !Number.isInteger(limit) || limit < 0) {
    return res.redirect("/inventory?error=" + encodeURIComponent("Please enter valid item details."));
  }
  try {
    db.run("INSERT INTO inventory (name,price,stock,low_stock_limit) VALUES (?,?,?,?)",
      [name, price, stock, limit]);
    res.redirect("/inventory?success=1");
  } catch (err) {
    console.error(err);
    res.redirect("/inventory?error=" + encodeURIComponent("Item could not be added. Name may already exist."));
  }
});

app.post("/inventory/update/:id", (req, res) => {
  const id = Number(req.params.id);
  const stock = Number(req.body.stock);
  const price = Number(req.body.price);
  const limit = Number(req.body.low_stock_limit);
  if (!Number.isInteger(id) || !Number.isInteger(stock) || stock < 0 ||
      !Number.isFinite(price) || price < 0 || !Number.isInteger(limit) || limit < 0) {
    return res.redirect("/inventory?error=" + encodeURIComponent("Invalid stock or price."));
  }
  try {
    db.run("UPDATE inventory SET stock=?, price=?, low_stock_limit=? WHERE id=?",
      [stock, price, limit, id]);
    res.redirect("/inventory?success=1");
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not update item.");
  }
});

app.get("/test-db", (req, res) => {
  try {
    db.get("SELECT 1 AS ok");
    res.send("Local SQLite database connected successfully!");
  } catch (err) {
    res.status(500).send("Database error: " + err.message);
  }
});

db.initialize().then(() => {
  app.listen(PORT, () => console.log(`Smart Canteen running at http://localhost:${PORT}`));
}).catch(err => {
  console.error("Could not initialize local database:", err);
  process.exit(1);
});
