const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const dbPath = path.join(__dirname, "canteen.db");
let database;

async function initialize() {
  const SQL = await initSqlJs({
    locateFile: file => require.resolve("sql.js/dist/" + file)
  });

  if (fs.existsSync(dbPath)) {
    const bytes = fs.readFileSync(dbPath);
    database = new SQL.Database(bytes);
  } else {
    database = new SQL.Database();
  }

  database.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      low_stock_limit INTEGER NOT NULL DEFAULT 5 CHECK(low_stock_limit >= 0),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
        CHECK(status IN ('Pending','Preparing','Ready','Completed','Cancelled')),
      priority TEXT NOT NULL DEFAULT 'Normal'
        CHECK(priority IN ('Normal','High','Urgent')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES inventory(id)
    );
  `);

  // Add priority to an existing SQLite database from the previous ZIP.
  const orderColumns = database.exec("PRAGMA table_info(orders)");
  const hasPriority = orderColumns.length &&
    orderColumns[0].values.some(column => column[1] === "priority");
  if (!hasPriority) database.run("ALTER TABLE orders ADD COLUMN priority TEXT NOT NULL DEFAULT 'Normal'");

  const count = database.exec("SELECT COUNT(*) AS count FROM inventory")[0].values[0][0];
  if (count === 0) {
    const seed = database.prepare(
      "INSERT INTO inventory (name, price, stock, low_stock_limit) VALUES (?, ?, ?, ?)"
    );
    [
      ["Veg Sandwich",40,30,5],
      ["Masala Dosa",60,20,5],
      ["Veg Burger",50,25,5],
      ["Cold Coffee",35,18,5],
      ["Samosa",15,40,8]
    ].forEach(row => seed.run(row));
    seed.free();
  }
  save();
}

function save() {
  if (!database) return;
  fs.writeFileSync(dbPath, Buffer.from(database.export()));
}

function all(sql, params = []) {
  const stmt = database.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  database.run(sql, params);
  const changes = database.getRowsModified();
  const lastId = get("SELECT last_insert_rowid() AS id").id;
  save();
  return { changes, lastInsertRowid: lastId };
}

function transaction(callback) {
  database.run("BEGIN");
  try {
    const result = callback({
      all: (sql, params=[]) => all(sql, params),
      get: (sql, params=[]) => get(sql, params),
      run: (sql, params=[]) => {
        database.run(sql, params);
        return { changes: database.getRowsModified(),
          lastInsertRowid: get("SELECT last_insert_rowid() AS id").id };
      }
    });
    database.run("COMMIT");
    save();
    return result;
  } catch (error) {
    database.run("ROLLBACK");
    throw error;
  }
}

module.exports = { initialize, all, get, run, transaction };
