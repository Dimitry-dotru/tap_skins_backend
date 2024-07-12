import { Request, Response } from "express";
import { userModel } from "../config/mongoose";
import { checkingInitData } from "../utils/functions";
import { bot } from "../index";

export const authUser = async (req: Request, res: Response) => {
  const init_data = req.body.initData;

  try {
    const userInfo = checkingInitData(init_data, res) as any;

    if (userInfo) {
      console.log("Validated!");
      // вернем тут объект юзера
      const user_id = userInfo.id;
      const user = await userModel.findOne({ user_id });
      if (!user) {
        // создаем тут юзера
        const newUser = new userModel({
          balance_common: 0,
          ballance_purple: 0,
          user_id: user_id,
          last_daily_bonus_time_clicked: 0,
          invited_users: 0,
          stamina: 1000,
          last_click: 0,
        });

        await newUser.save();
        return res.status(200).json(newUser);
      }
      return res.status(200).json(user);
    } else {
      console.log("Invalid!");
      res.status(403).json({ success: false });
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
