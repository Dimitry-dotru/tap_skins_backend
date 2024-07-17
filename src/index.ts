import express from "express";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import WebSocket from "ws";
import { createServer, Server as HTTPServer } from "http";
import { onConnect } from "./config/websocket";

dotenv.config({ path: "./.env" });

const { serverPort, botToken, frontendLink, mongoUrl, webSocketPort } =
  process.env;
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

// mongoose
//   .connect(mongoUrl)
//   .then(() => {
//     console.log("Connected to db successfully");
//   })
//   .catch((err) => console.log("Error to connect to db!", err));

app.listen(serverPort, async () => {
  console.log("Server running in port " + serverPort);
  bot.launch();
  wss.on("connection", onConnect);
});
import "./config/bot";
import "./config/mongoose";
import "./config/websocket";
import "./routes/index";

export { bot, frontendLink, mongoose, app, botToken, wss };
