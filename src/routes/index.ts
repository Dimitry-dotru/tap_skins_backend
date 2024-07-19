import { app } from "../index";
import { authUser, userSubscription } from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);
app.get("/test-req", (req, res) => {
  return res.send("Everything is okay");
});

app.post("/log", (req, res) => {
  console.log("\n\nReceived:...");
  console.log(req.body);
});
