import express from "express";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import bodyParser from "body-parser";
import WebSocket from "ws";
import { createServer, Server as HTTPServer } from "http";
import { onConnect } from "./config/websocket";
import mysql from "mysql2/promise";
dotenv.config({ path: "./.env" });
const {
  serverPort,
  botToken,
  frontendLink,
  webSocketPort,
  dbHost,
  dbPassword,
  dbUsername,
  dbDbName,
} = process.env;
const app = express();
const bot = new Telegraf(botToken);
const server: HTTPServer = createServer(app);
const wss = new WebSocket.Server({ port: Number(webSocketPort) });

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // заменить на домен при продакшне
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  next();
});
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

let connection: null | mysql.Connection = null;
(async function startServer() {
  // DB connection
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUsername,
      password: dbPassword,
      database: dbDbName,
    });
  }
  catch (e) {
    console.log("Error connecting to db", e);
  }
  console.log("Connected to db successfully!");
  app.listen(serverPort, async () => {
    console.log(`Server port: ${serverPort}\nWebsocket port: ${webSocketPort}`);
    bot.launch();
    wss.on("connection", onConnect);
  });
})()

import "./config/bot";
import "./config/websocket";
import "./routes/index";
export { bot, frontendLink, app, botToken, wss, connection };
