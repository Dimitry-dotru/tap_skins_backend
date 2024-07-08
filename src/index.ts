import express from "express";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
dotenv.config({ path: "./.env" });

const { serverPort, botToken, frontendLink } = process.env;
const app = express();
const bot = new Telegraf(botToken);

app.listen(serverPort, () => {
  console.log("Server running in port " + serverPort);
  bot.launch();
});

export { bot, frontendLink };
import "./bot/index";