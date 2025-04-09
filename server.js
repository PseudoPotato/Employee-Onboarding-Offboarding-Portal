require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// MySQL Connection Pool with enhanced configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  supportBigNumbers: true,
  bigNumberStrings: false,
  timezone: '+00:00'
});

// Enhanced connection test
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT 1+1 AS result');
    console.log('✅ Database connection test successful:', rows);
    conn.release();
    return true;
  } catch (err) {
    console.error('⚠️ Database connection failed:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack
    });
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Serve HTML Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/employees", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "employees.html"));
});

app.get("/onboarding", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "onboarding.html"));
});

app.get("/offboarding", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "offboarding.html"));
});

// API Routes - Enhanced with error handling
app.get("/active-employees", async (req, res) => {
  console.log("Fetching active employees...");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Convert limit and offset to numbers explicitly
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    let query = `SELECT * FROM onboarded_employees WHERE status = 'active'`;
    let countQuery = `SELECT COUNT(*) AS total FROM onboarded_employees WHERE status = 'active'`;
    const params = [];
    const countParams = [];

    if (search) {
      query += ` AND (e_id LIKE ? OR name LIKE ? OR email LIKE ? OR project_id LIKE ?)`;
      countQuery += ` AND (e_id LIKE ? OR name LIKE ? OR email LIKE ? OR project_id LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Remove parameterization for LIMIT/OFFSET and use template literals
    query += ` ORDER BY onboard_date DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [employees] = await pool.execute(query, params);
    const [[{total}]] = await pool.execute(countQuery, countParams);

    res.json({
      employees: employees.map(emp => ({
        ...emp,
        _id: emp.id, // For frontend compatibility
        timestamp: emp.onboard_date
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Database error:", {
      message: err.message,
      stack: err.stack,
      sql: err.sql
    });
    res.status(500).json({ 
      message: "Failed to fetch active employees",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Database error'
    });
  }
});

// Add this new endpoint for offboarded employees
app.get("/offboarded-employees", async (req, res) => {
  console.log("Fetching offboarded employees...");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    let query = `SELECT * FROM offboarded_employees`;
    let countQuery = `SELECT COUNT(*) AS total FROM offboarded_employees`;
    const params = [];
    const countParams = [];

    if (search) {
      query += ` WHERE (e_id LIKE ? OR name LIKE ? OR email LIKE ?)`;
      countQuery += ` WHERE (e_id LIKE ? OR name LIKE ? OR email LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY offboard_date DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [employees] = await pool.execute(query, params);
    const [[{total}]] = await pool.execute(countQuery, countParams);

    res.json({
      employees: employees.map(emp => ({
        ...emp,
        _id: emp.id, // For frontend compatibility
        other_reason: emp.other_reason || null
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Database error:", {
      message: err.message,
      stack: err.stack,
      sql: err.sql
    });
    res.status(500).json({ 
      message: "Failed to fetch offboarded employees",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Database error'
    });
  }
});

// Add this new endpoint for offboarding
app.post("/offboard", async (req, res) => {
  try {
    const { eid, name, email, reason, otherReason, lastWorkingDay, exitNotes, knowledgeTransfer } = req.body;

    if (!eid || !name || !email || !reason) {
      return res.status(400).json({ 
        message: "All required fields are missing.",
        success: false
      });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // 1. Get the active employee
      const [activeEmployee] = await conn.execute(
        'SELECT * FROM onboarded_employees WHERE e_id = ? AND status = "active"',
        [eid]
      );

      if (activeEmployee.length === 0) {
        return res.status(404).json({ 
          message: "Active employee not found or already offboarded",
          success: false
        });
      }

      const employee = activeEmployee[0];

      // 2. Insert into offboarded_employees with proper null handling
      const [offboardResult] = await conn.execute(
        `INSERT INTO offboarded_employees 
         (e_id, name, email, manager_name, manager_email, project_id, 
          reason, other_reason, last_working_day, exit_notes, knowledge_transfer, offboard_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          employee.e_id,
          employee.name,
          employee.email,
          employee.manager_name || null,
          employee.manager_email || null,
          employee.project_id || null,
          reason,
          otherReason || null,
          lastWorkingDay || null,
          exitNotes || null,
          knowledgeTransfer || null
        ]
      );

      // 3. Update status in onboarded_employees
      await conn.execute(
        'UPDATE onboarded_employees SET status = "offboarded" WHERE e_id = ?',
        [eid]
      );

      await conn.commit();
      conn.release();

      res.status(200).json({
        message: `Employee ${name} has been successfully offboarded!`,
        success: true
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error("Transaction error:", {
        message: err.message,
        code: err.code,
        sql: err.sql,
        stack: err.stack
      });
      res.status(500).json({ 
        message: "Internal server error while offboarding employee.",
        error: process.env.NODE_ENV === 'development' ? err.message : null,
        success: false
      });
    }
  } catch (err) {
    console.error("Offboarding error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: "Internal server error while offboarding employee.",
      success: false
    });
  }
});

// Add this new endpoint for initiating offboarding
app.get("/initiate-offboard/:employeeId", async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    
    const [employee] = await pool.execute(
      'SELECT * FROM onboarded_employees WHERE e_id = ? AND status = "active"',
      [employeeId]
    );

    if (employee.length === 0) {
      return res.status(404).json({ message: "Employee not found or already offboarded" });
    }

    res.json(employee[0]);
  } catch (err) {
    console.error("Error initiating offboarding:", err);
    res.status(500).json({ message: "Failed to initiate offboarding" });
  }
});

app.get("/employee-stats", async (req, res) => {
  try {
      const [[{totalEmployees}]] = await pool.execute(
          `SELECT COUNT(*) AS totalEmployees FROM onboarded_employees`
      );
      
      const [[{activeEmployees}]] = await pool.execute(
          `SELECT COUNT(*) AS activeEmployees FROM onboarded_employees WHERE status = 'active'`
      );
      
      const [[{offboardedEmployees}]] = await pool.execute(
          `SELECT COUNT(*) AS offboardedEmployees FROM offboarded_employees`
      );
      
      res.json({ totalEmployees, activeEmployees, offboardedEmployees });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch employee stats" });
  }
});

app.get("/onboarding-trend", async (req, res) => {
  try {
      const [trendData] = await pool.execute(`
          SELECT 
              DATE_FORMAT(onboard_date, '%Y-%m') AS month,
              COUNT(*) AS count
          FROM onboarded_employees
          WHERE onboard_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(onboard_date, '%Y-%m')
          ORDER BY month
      `);
      res.json(trendData);
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch onboarding trend" });
  }
});

app.get("/offboarding-reasons", async (req, res) => {
  try {
      const [reasonsData] = await pool.execute(`
          SELECT 
              reason,
              COUNT(*) AS count
          FROM offboarded_employees
          GROUP BY reason
      `);
      res.json(reasonsData);
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch offboarding reasons" });
  }
});

app.get("/recent-onboardings", async (req, res) => {
  try {
      const [recentOnboardings] = await pool.execute(`
          SELECT * FROM onboarded_employees
          WHERE status = 'active'
          ORDER BY onboard_date DESC
          LIMIT 6
      `);
      res.json(recentOnboardings);
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch recent onboardings" });
  }
});

app.post("/onboard", async (req, res) => {
  try {
    const { eid, name, email, managerName, managerEmail, projectId, department, position, startDate, employmentType } = req.body;

    if (!eid || !name || !email || !managerName || !managerEmail || !projectId || !department || !position || !startDate || !employmentType) {
      return res.status(400).send("All fields are required.");
    }

    const query = `
      INSERT INTO onboarded_employees 
      (e_id, name, email, manager_name, manager_email, project_id, department, position, start_date, employment_type, status, onboard_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `;

    await pool.execute(query, [
      eid, 
      name, 
      email, 
      managerName, 
      managerEmail, 
      projectId,
      department,
      position,
      startDate,
      employmentType
    ]);

    res.status(200).send(`Employee ${name} has been successfully onboarded!`);
  } catch (err) {
    console.error("Error inserting employee:", err);
    res.status(500).send("Internal server error while onboarding employee.");
  }
});

// Start server with connection test
testConnection().then(success => {
  if (success) {
    app.listen(port, () => {
      console.log(`✅ Server running at http://localhost:${port}`);
    });
  } else {
    console.error('❌ Server cannot start without database connection');
    process.exit(1);
  }
});