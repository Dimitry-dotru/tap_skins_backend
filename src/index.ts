import express from "express";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import mongoose from "mongoose";
import bodyParser from "body-parser";

dotenv.config({ path: "./.env" });

const { serverPort, botToken, frontendLink, mongoUrl } = process.env;
const app = express();
const bot = new Telegraf(botToken);
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

import "./bot/index";
import "./config/mongoose";
import "./routes/index";


mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("Connected to db successfully");
    app.listen(serverPort, async () => {
      console.log("Server running in port " + serverPort);
      bot.launch();

      // const newUser = new userModel({
      //   experience: 0,
      //   balance_common: 0,
      //   ballance_purple: 0,
      //   id: 623165387,
      //   last_daily_bonus_time_clicked: 0,
      //   invited_users: 0,
      // });

      // await newUser.save();
    });
  })
  .catch((err) => console.log("Error to connect to db!", err));

export { bot, frontendLink, mongoose, app, botToken };
