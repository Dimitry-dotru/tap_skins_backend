import { app } from "../index";
import {
  authUser,
  checkSkins,
  convertBalance,
  getSkins,
  userSubscription,
} from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);
app.post("/convert", convertBalance);
// app.post("/");

app.get("/skins", getSkins);
app.post("/check-skins", checkSkins);
