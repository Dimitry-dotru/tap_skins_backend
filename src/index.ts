import express from "express";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import mongoose from "mongoose";
import { userModel } from "./config/mongoose";

dotenv.config({ path: "./.env" });

const { serverPort, botToken, frontendLink, mongoUrl } = process.env;
const app = express();
const bot = new Telegraf(botToken);

import "./bot/index";
import "./config/mongoose";

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

export { bot, frontendLink, mongoose };
