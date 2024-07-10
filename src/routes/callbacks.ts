import { Request, Response } from "express";
import { createHmac } from "crypto";
import { botToken } from "../index";
import { parse } from "querystring";
import { userModel } from "../config/mongoose";

export const authUser = async (req: Request, res: Response) => {
  const init_data = req.body.initData;

  try {
    const parsed_data = parse(init_data);
    if (!parsed_data.hash) {
      return res
        .status(400)
        .json({ error: "Hash is not present in init data" });
    }

    const hash = parsed_data.hash;
    delete parsed_data.hash;

    // Строка для проверки данных
    const data_check_string = Object.keys(parsed_data)
      .sort()
      .map((key) => `${key}=${parsed_data[key]}`)
      .join("\n");

    // Создаем секретный ключ для HMAC
    const secret_key = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Вычисляем HMAC хеш для данных
    const calculated_hash = createHmac("sha256", secret_key)
      .update(data_check_string)
      .digest("hex");

    // Сравниваем полученный хеш с ожидаемым
    if (calculated_hash === hash) {
      console.log("Validated!");
      // вернем тут объект юзера
      const user_id = JSON.parse((parsed_data as any).user).id;
      const user = await userModel.findOne({ user_id });
      if (!user) {
        // создаем тут юзера
        const newUser = new userModel({
          balance_common: 0,
          ballance_purple: 0,
          user_id: user_id,
          last_daily_bonus_time_clicked: 0,
          invited_users: 0,
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
    console.log("Invalid init data format or error to create user");
    res.status(400).json({ error: "Invalid init data format or error to create user" });
  }
};
