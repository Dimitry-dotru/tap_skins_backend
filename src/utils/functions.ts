import { parse } from "querystring";
import { botToken } from "../index";
import { createHmac } from "crypto";
import { Response } from "express";

// проверяет авторизацию юзера, если все ок, то вернет его, если нет, то null
const checkingInitData = (init_data, res: Response) => {
  const parsed_data = parse(init_data);

  if (!parsed_data.hash) {
    return res.status(400).json({ error: "Hash is not present in init data" });
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

  return calculated_hash === hash
    ? JSON.parse((parsed_data as any).user)
    : null;
};

export { checkingInitData };
