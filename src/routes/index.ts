import { app } from "../index";
import {
  authUser,
  checkSkins,
  convertBalance,
  dailyReward,
  getSkins,
  reward,
  userSubscription,
} from "./callbacks";

app.post("/auth", authUser);
//! поменять на get
app.post("/subscription", userSubscription);
app.post("/convert", convertBalance);
app.post("/check-skins", checkSkins);
app.post("/reward/:reward_id", reward);
app.post("/daily-reward", dailyReward);

app.get("/skins", getSkins);