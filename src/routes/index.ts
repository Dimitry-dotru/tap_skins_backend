import { User } from "../config/dbTypes";
import { app, connection } from "../index";
import {
  authUser,
  convertBalance,
  getSkins,
  userSubscription,
} from "./callbacks";

app.post("/auth", authUser);
app.post("/subscription", userSubscription);
app.post("/convert", convertBalance);
app.post("/cheat/:user_id", async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const [response] = await connection.query(
      `SELECT * FROM users WHERE user_id=${user_id}`
    );
    const user = response[0] as User;
  
    let { balance_common, balance_purple } = user;
    balance_purple += 1000;
    balance_common += 1000000;
  
    await connection.query(
      `UPDATE users SET balance_purple=${balance_purple}, balance_common=${balance_common} WHERE user_id=${user_id}`
    );
  
    return res.json({
      message: "Небольшой бонус :)",
      success: true,
      loading: false,
    });
  }
  catch(e) {
    return res.status(500).json({
      message: "Небольшой бонус получить не удалось :(",
      success: false,
      loading: false,
    });
  }
  
});

app.get("/skins", getSkins);
