import { app } from "../index";
import { authUser, convertBalance, getSkins, userSubscription } from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);
app.post("/convert", convertBalance);
app.post("/cheat", async (req, res) => {
  
});


app.get("/skins", getSkins);


