import { app } from "../index";
import { authUser } from "./callbacks";

app.post("/auth", authUser);
