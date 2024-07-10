import { app } from "../index";
import { authUser } from "./callbacks";

app.post("/auth", authUser);

app.post("/log", (req, res) => {
  console.log("\n\nReceived:...");
  console.log(req.body);
});
