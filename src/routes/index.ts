import { app } from "../index";
import { authUser, userSubscription } from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);


app.post("/log", (req, res) => {
  console.log("\n\nReceived:...");
  console.log(req.body);
});
