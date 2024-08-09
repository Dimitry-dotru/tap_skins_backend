import express from "express";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import bodyParser from "body-parser";
import WebSocket from "ws";
import { onConnect } from "./config/websocket";
import mysql from "mysql2/promise";
dotenv.config({ path: "./.env" });
import { getConfig } from "./utils/functions";
import { ConfigFields } from "./config/dbTypes";
const {
  serverPort,
  botToken,
  frontendLink,
  websocketPort,
  dbHost,
  dbPassword,
  dbUsername,
  dbDbName,
} = process.env;
const app = express();
const bot = new Telegraf(botToken);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // заменить на домен при продакшне
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  next();
});

app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));


const wss = new WebSocket.Server({ port: Number(websocketPort) });

let connection: null | mysql.Connection = null;
let config: null | ConfigFields = null;
(async function startServer() {
  // DB connection
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUsername,
      password: dbPassword,
      database: dbDbName,
    });
  } catch (e) {
    console.log("Error connecting to db", e);
    return;
  }
  console.log("Connected to db successfully!");
  app.listen(serverPort, async () => {
    console.log(`Server port: ${serverPort}\n`);
    config = await getConfig(connection);
    if (!config) {
      const defaulParams: ConfigFields = {
        cart_holding_time: 24,
        yellow_coin_per_tap: 1,
        max_user_stamina: 1000,
      };
      console.log("No config available");
      config = defaulParams;
    }
    bot.launch();
    wss.on("connection", onConnect);
  });
})();

import "./config/bot";
import "./config/websocket";
import "./routes/index";
export { bot, frontendLink, app, botToken, wss, connection, config };
