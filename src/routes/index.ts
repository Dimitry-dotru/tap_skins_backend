import { app } from "../index";
import {
  addToCartHandle,
  authUser,
  checkSkins,
  convertBalance,
  dailyReward,
  getCartHandle,
  getSkins,
  getTasks,
  removeFromCartHandle,
  reward,
  userSubscription,
} from "./callbacks";

app.post("/auth", authUser);

app.post("/subscription", userSubscription);
app.post("/convert", convertBalance);

app.get("/skins", getSkins);
app.post("/check-skins", checkSkins);

app.post("/cart/add/:item_id", addToCartHandle);
app.post("/cart/remove/:item_id", removeFromCartHandle);
app.get("/cart", getCartHandle);

app.post("/reward/:reward_id", reward);
app.post("/daily-reward", dailyReward);

app.get("/tasks", getTasks);