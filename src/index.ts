import express from "express";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const PORT = process.env.port;
const app = express();

app.listen(PORT, () => {
  console.log("Server running in port " + PORT);
})