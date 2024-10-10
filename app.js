/*
  This JavaScript file contains code generated with assistance from ChatGPT,
  an AI language model developed by OpenAI.

  ChatGPT was used for advice on certain functionalities and structures in
  this project.

  For more information, visit: https://openai.com/chatgpt
*/

const http = require("http");
const url = require("url");
const mysql = require("mysql2/promise");

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "your_password",
  database: "patientDB",
};

const ALLOWED_ORIGIN = "http://127.0.0.1:5500";

const pool = mysql.createPool(dbConfig);

// Initialize the database
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`
    );
    await connection.query(`USE ${dbConfig.database}`);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS patients (
        patientID INT(11) AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        dateOfBirth DATE NOT NULL
        ) ENGINE=InnoDB
    `);
    console.log("Database and table initialized successfully");
    await connection.end();
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

// Create the server
const server = http.createServer(async (req, res) => {
  // Add CORS headers to all responses
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const method = req.method;
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith("/lab5/api/")) {
    if (method == "GET") {
      await handleGETRequest(req, res);
    } else if (method == "POST") {
      await handlePOSTRequest(req, res);
    } else {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message:
            "This method is not allowed. Only 'GET' and 'POST' methods are allowed.",
        })
      );
    }
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Not Found" }));
  }
});

function isAllowedQuery(query) {
  const lowerQuery = query.toLowerCase().trim();
  return lowerQuery.startsWith("select") || lowerQuery.startsWith("insert");
}

async function handleGETRequest(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const sqlQuery = decodeURIComponent(
      parsedUrl.pathname.slice("/lab5/api/".length)
    );

    if (!isAllowedQuery(sqlQuery)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          message: "Query not allowed. Only SELECT queries are permitted.",
        })
      );
    }

    const connection = await pool.getConnection();
    try {
      const [results] = await connection.execute(sqlQuery);
      res.writeHead(200, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ results }));
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.writeHead(400, {
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        message: "An error occurred while executing the query.",
      })
    );
  }
}

async function handlePOSTRequest(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      const { params } = JSON.parse(body);
      console.log("Received params:", params);

      const connection = await pool.getConnection();
      try {
        const placeholders = params.map(() => "(?, ?)").join(", ");
        const sql = `INSERT INTO patients (name, dateOfBirth) VALUES ${placeholders}`;

        if (!isAllowedQuery(sql)) {
          res.writeHead(403, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              message:
                "Query not allowed. Only INSERT queries are permitted for POST requests.",
            })
          );
        }

        const flattenedParams = params.flat();
        console.log(flattenedParams);
        const [results] = await connection.execute(sql, flattenedParams);

        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({ message: "Patient added successfully", results })
        );
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(error);
      res.writeHead(400, {
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          message: "An error occurred while executing the query.",
        })
      );
    }
  });
}

initializeDatabase().then(() => {
  const PORT = process.env.PORT || 3002;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
