import { Request, Response } from "express";
import { checkingInitData } from "../utils/functions";
import { bot, connection } from "../index";
import { User } from "../config/dbTypes";

export const authUser = async (req: Request, res: Response) => {
  const init_data = req.body.initData;

  try {
    const userInfo = checkingInitData(init_data, res) as any;

    if (userInfo) {
      console.log("Validated!");
      // вернем тут объект юзера
      const user_id = userInfo.id;
      const [response] = await connection.query<any[]>(
        `SELECT * FROM users WHERE user_id=${user_id}`
      );

      if (!response || !response.length) {
        const createUserQuery = `INSERT INTO users (balance_common, balance_purple, user_id, last_daily_bonus_time_clicked, invited_users, last_click, stamina) VALUES (0, 0, ${user_id}, 0, 0, 0, 1000)`;

        
        try {
          await connection.query(createUserQuery);
        }
        catch(e) {
          console.log("Error to create new user!");
          return res.send(500).json({message: e, success: false});
        }

        const [newUser] = await connection.query<any[]>(
          `SELECT * FROM users WHERE user_id=${user_id}`
        );

        return res.json(newUser[0]);
      }
      const user = response[0] as User;
      return res.json(user);
    } else {
      console.log("Invalid!");
      res.status(403).json({ success: false, message: "Invalid" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ error: "Invalid init data format or error to create user" });
  }
};

export const userSubscription = async (req: Request, res: Response) => {
  const { user_id, channelId } = req.body;
  try {
    if (!user_id || !channelId) {
      return res.status(404).json({
        success: false,
        message: "No user/channel id",
      });
    }

    const userInChannel = await bot.telegram.getChatMember(channelId, user_id);

    if (
      userInChannel.status === "member" ||
      userInChannel.status === "administrator" ||
      userInChannel.status === "creator"
    ) {
      return res.status(200).json({
        subscribed: true,
      });
    }
    return res.status(200).json({
      subscribed: false,
    });
  } catch (e) {
    const errMsg = e.description;

    switch (errMsg) {
      case "Bad Request: PARTICIPANT_ID_INVALID":
        return res.status(200).json({
          subscribed: false,
        });
      default:
        console.log(e);
        return res.status(400).json(e);
    }
  }
};
