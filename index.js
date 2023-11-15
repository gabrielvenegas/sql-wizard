#!/usr/bin/env node

import { createConnection } from "mysql";
import fs from "fs";
import inquirer from "inquirer";
import pg from "pg";

async function getDatabaseConfig() {
  const questions = [
    {
      type: "list",
      name: "type",
      message: "Select your database type:",
      choices: ["mysql", "pg"],
    },
    {
      type: "input",
      name: "host",
      message: "Enter your database host:",
      default: "localhost",
    },
    {
      type: "input",
      name: "user",
      message: "Enter your database user:",
    },
    {
      type: "password",
      name: "password",
      message: "Enter your database password:",
    },
    {
      type: "input",
      name: "database",
      message: "Enter your database name:",
    },
    {
      type: "input",
      name: "port",
      message: "Enter your database port:",
      default: (response) => {
        if (response.type === "pg") {
          return 5432;
        } else {
          return 3306;
        }
      },
    },
  ];

  return await inquirer.prompt(questions);
}

async function getMySQLMetadata(config) {
  // Configure your database connection here
  const connection = createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  // Connect to the database
  connection.connect((err) => {
    if (err) {
      return console.error("error: " + err.message);
    }

    console.log("✅ Conectado ao banco de dados");
  });

  const query = `
    SELECT 
    c.TABLE_NAME, 
    c.COLUMN_NAME, 
    c.DATA_TYPE,
    tc.CONSTRAINT_TYPE,
    kcu.REFERENCED_TABLE_NAME,
    kcu.REFERENCED_COLUMN_NAME
    FROM 
      INFORMATION_SCHEMA.COLUMNS c
    LEFT JOIN 
      INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME AND c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    LEFT JOIN 
      INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA AND kcu.TABLE_NAME = tc.TABLE_NAME
    WHERE 
      c.TABLE_SCHEMA = 'your_database_name' AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY';
  `;

  connection.query(query, (err, results, fields) => {
    if (err) {
      console.error(err);
      return;
    }

    // save rows to a JSON file
    fs.writeFileSync("metadata.json", JSON.stringify(results));

    console.log("✅ Arquivo metadata.json salvo com sucesso!");

    console.log(
      "🪄  Agora é só importar no https://chat.openai.com/g/g-b6NBRSd47-sql-wizard e começar a gerar suas queries!"
    );

    connection.end();
  });
}

async function getPostgresMetadata(config) {
  // Configure your database connection here
  const client = new pg.Client({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port,
  });

  // Connect to the database
  client.connect(async (err) => {
    if (err) {
      return console.error("error connecting to the database", err.stack);
    }

    console.log("✅ Conectado ao banco de dados");

    try {
      // Example query to fetch tables and columns (modify as needed)
      const query = `
        SELECT 
          c.table_name, 
          c.column_name, 
          c.data_type,
          v.table_name AS view_name,
          tc.constraint_type,
          kcu.column_name AS foreign_key_column
        FROM 
          information_schema.columns c
        LEFT JOIN 
          information_schema.views v ON c.table_name = v.table_name
        LEFT JOIN 
          information_schema.table_constraints tc ON c.table_name = tc.table_name
        LEFT JOIN 
          information_schema.key_column_usage kcu ON c.column_name = kcu.column_name AND tc.constraint_name = kcu.constraint_name
        WHERE 
          c.table_schema = 'public'
          AND (tc.constraint_type IS NULL OR tc.constraint_type = 'FOREIGN KEY');
    `;
      const res = await client.query(query);

      // save rows to a JSON file
      fs.writeFileSync("metadata.json", JSON.stringify(res.rows));

      console.log("✅ Arquivo metadata.json salvo com sucesso!");

      console.log(
        "🪄  Agora é só importar no https://chat.openai.com/g/g-b6NBRSd47-sql-wizard e começar a gerar suas queries!"
      );
      // Format and save the JSON data here...
    } catch (err) {
      console.error(err.stack);
    } finally {
      client.end();
    }
  });
}

async function getMSSQLMetadata(config) {}

async function main() {
  const config = await getDatabaseConfig();

  if (config.type === "mysql") {
    await getMySQLMetadata(config);
  } else if (config.type === "pg") {
    await getPostgresMetadata(config);
  }
}

main();
