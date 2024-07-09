import { Request, Response } from "express";
import { createHmac } from "crypto";
import { botToken } from "../index";
import { parse } from "querystring";

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
      console.log("Validated!")
      res.status(200).json({ valid: true });
    } else {
      console.log("Invalid!");
      res.status(403).json({ valid: false });
    }
  } catch (error) {
    console.log("Invalid init data format");
    res.status(400).json({ error: "Invalid init data format" });
  }
};
