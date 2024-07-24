import { app } from "../index";
import { authUser, userSubscription } from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);
app.get("/test-req", (req, res) => {
  return res.json({ message: "Get req from /test-req" });
});
app.get("/", (req, res) => {
  return res.json({message: "Get req"});
});

app.post("/log", (req, res) => {
  console.log("\n\nReceived:...");
  console.log(req.body);
});
