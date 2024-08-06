import { app } from "../index";
import {
  addToCartHandle,
  authUser,
  checkSkins,
  convertBalance,
  dailyReward,
  getSkins,
  removeFromCartHandle,
  reward,
  userSubscription,
} from "./callbacks";

app.post("/auth", authUser);

app.post("/subscription", userSubscription);
app.post("/convert", convertBalance);

app.post("/check-skins", checkSkins);
app.get("/skins", getSkins);
app.post("/cart/add/:item_id", addToCartHandle);
app.post("/cart/remove/:item_id", removeFromCartHandle);

app.post("/reward/:reward_id", reward);
app.post("/daily-reward", dailyReward);
