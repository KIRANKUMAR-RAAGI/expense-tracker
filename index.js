const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expense_tracker.db");

app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      category INTEGER,
      amount REAL,
      date TEXT,
      description TEXT,
      FOREIGN KEY (category) REFERENCES categories(id)
    )`);
});

app.post("/transactions", (req, res) => {
  const { type, category, amount, date, description } = req.body;
  if (!type || !category || !amount || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    `INSERT INTO transactions (type, category, amount, date, description)
     VALUES ('income', 1, 2000, '2024-10-23', 'Salary')`,
    [type, category, amount, date, description],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});
app.get("/transactions", (req, res) => {
  db.all(`SELECT * FROM transactions`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(rows);
  });
});
app.get("/transactions/:id", (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM transactions WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.status(200).json(row);
  });
});
app.put("/transactions/:id", (req, res) => {
  const { id } = req.params;
  const { type, category, amount, date, description } = req.body;

  db.run(
    'UPDATE transactions
        SET type = 'expense', category = 2, amount = 150, date = '2024-10-24', description = 'Groceries'
        WHERE id = 1';

    [type, category, amount, date, description, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.status(200).json({ updated: this.changes });
    }
  );
});
app.delete("/transactions/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM transactions WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.status(204).send();
  });
});
app.get("/summary", (req, res) => {
  const { start_date, end_date, category } = req.query;

  let query = `SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
                (SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) as balance
              FROM transactions`;

  let params = [];
  if (start_date && end_date) {
    query += ` WHERE date BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  }

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(row);
  });
});
