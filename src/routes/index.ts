import { app } from "../index";
import { authUser, convertBalance, userSubscription } from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);
app.post("/convert", convertBalance);

app.get("/test-req", (req, res) => {
  return res.json({ message: "Get req from /test-req" });
});
app.get("/", (req, res) => {
  return res.json({ message: "Get req" });
});
