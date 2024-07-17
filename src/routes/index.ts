import { app } from "../index";
import { authUser, userSubscription } from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);

app.get("/test-req", (req, res) => {
  return res.send("Hello from server-side backend. Weirdo");
});

app.post("/log", (req, res) => {
  console.log("\n\nReceived:...");
  console.log(req.body);
});
