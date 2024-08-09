import { parse } from "querystring";
import { botToken, connection } from "../index";
import { createHmac } from "crypto";
import { Response } from "express";
import { Connection } from "mysql2/promise";
import {
  ConfigFields,
  MultiSelectOption,
  ReferalRewardStoreDataStructured,
  RowReferal,
  SkinStoreDataStructured,
  TaskStoreDataStructured,
} from "../config/dbTypes";
import { Client } from "@notionhq/client";

const notionSecret = process.env.NOTION_SECRET;

export function extractMultiSelectNames(options: {
  multi_select: MultiSelectOption[];
}): string {
  return options.multi_select.map((option) => option.name).join(", ");
}
export function extractFileUrls(
  files: { name: string; file: { url: string } }[]
): string {
  return files.map((file) => file.file.url).join(", ");
}

// проверяет авторизацию юзера, если все ок, то вернет его, если нет, то null
export const checkingInitData = (init_data, res: Response) => {
  const parsed_data =
    typeof init_data === "string" ? parse(init_data) : init_data;

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

export const getRewards = async (): Promise<
  null | ReferalRewardStoreDataStructured[]
> => {
  const notionStoreDataBaseld =
    process.env.NOTION_REFERAL_REWARD_STORE_DATABASE_ID;
  const notion = new Client({ auth: notionSecret });
  if (!notionSecret || !notionStoreDataBaseld) {
    console.log("No secret for dbs");
    return;
  }
  try {
    const query = await notion.databases.query({
      database_id: notionStoreDataBaseld,
    });
    const rows = query.results.map(
      (res) => (res as any).properties
    ) as RowReferal[];
    const referalRewardStoreStructured: ReferalRewardStoreDataStructured[] =
      rows.map((row) => ({
        reward_id: row.reward_id.unique_id.number || 0,
        reward_name:
          row.reward_name.title?.[0]?.text?.content ?? "Default Name",
        reward_type: extractMultiSelectNames(row.reward_type),
        referal_amount: row.referal_amount.number || 0,
        reward: row.reward.number || 0,
        referal_icon: extractFileUrls(row.referal_icon.files),
      }));

    return referalRewardStoreStructured;
  } catch (error) {
    console.log(error);
    return null;
  }
};
export const clearUsersCart = async (user_id: number) => {
  return await connection.query(
    `UPDATE users SET skin_store_items_cart_ids='', order_date=0 WHERE user_id=${user_id}`
  );
};

export const getSkinsList = async (): Promise<SkinStoreDataStructured[]> => {
  const notion = new Client({ auth: notionSecret });
  const notionStoreDataBaseld = process.env.NOTION_SKIN_STORE_DATABASE_ID;
  const query = await notion.databases.query({
    database_id: notionStoreDataBaseld,
  });
  const rows = query.results.map((res) => (res as any).properties);
  const storeDataStructured = rows.map((row) => ({
    item_id: row.item_id.unique_id.number || 0,
    skin_name: row.skin_name.title?.[0]?.text?.content ?? "Default Name",
    weapon_name:
      row.weapon_name.rich_text
        .map((richText) => richText.text.content)
        .filter((content) => content.trim() !== "")
        .join(" ") || "Default Description",
    image_src: row.image_src?.url ?? "URL not available",
    price: row.price.number || 0,
    float: parseFloat(row.float.number.toFixed(5)) || 0,
    rarity: extractMultiSelectNames(row.rarity),
    weapon_type: extractMultiSelectNames(row.weapon_type),
    startrack: extractMultiSelectNames(row.startrack),
  })) as SkinStoreDataStructured[];
  return storeDataStructured;
};
export const getSkinsItemsById = async (
  items_id: number[]
): Promise<SkinStoreDataStructured[]> => {
  if (!items_id.length) return [];
  const notion = new Client({ auth: notionSecret });
  const notionStoreDataBaseld = process.env.NOTION_SKIN_STORE_DATABASE_ID;
  const query = await notion.databases.query({
    database_id: notionStoreDataBaseld,
    filter: {
      or: items_id.map((id) => ({
        property: "item_id",
        number: {
          equals: id,
        },
      })),
    },
  });
  const rows = query.results.map((res) => (res as any).properties);
  const storeDataStructured = rows.map((row) => ({
    item_id: row.item_id.unique_id.number || 0,
    skin_name: row.skin_name.title?.[0]?.text?.content ?? "Default Name",
    weapon_name:
      row.weapon_name.rich_text
        .map((richText) => richText.text.content)
        .filter((content) => content.trim() !== "")
        .join(" ") || "Default Description",
    image_src: row.image_src?.url ?? "URL not available",
    price: row.price.number || 0,
    float: parseFloat(row.float.number.toFixed(5)) || 0,
    rarity: extractMultiSelectNames(row.rarity),
    weapon_type: extractMultiSelectNames(row.weapon_type),
    startrack: extractMultiSelectNames(row.startrack),
  })) as SkinStoreDataStructured[];

  return storeDataStructured;
};
export const getSummaryPriceOfSkins = async (
  items_id: number[]
): Promise<number> => {
  const totalPrice = (await getSkinsItemsById(items_id)).reduce(
    (accum, curVal) => curVal.price + accum,
    0
  );

  return totalPrice;
};

export const getTasksById = async (tasks_id: number[]) => {
  if (!tasks_id.length) return [];
  const notion = new Client({ auth: notionSecret });
  const notionStoreDataBaseld = process.env.NOTION_TASK_STORE_DATABASE_ID;
  const query = await notion.databases.query({
    database_id: notionStoreDataBaseld,
    filter: {
      or: tasks_id.map((id) => ({
        property: "task_id",
        number: {
          equals: id,
        },
      })),
    },
  });
  const rows = query.results.map((res) => (res as any).properties);
  const tasksDataStructured = rows.map((row) => ({
    task_id: row.task_id.unique_id.number || 0,
    task_name: row.task_name.title?.[0]?.text?.content ?? "Default Name",
    platform_type: extractMultiSelectNames(row.platform_type),
    reward_type: extractMultiSelectNames(row.reward_type),
    reward: row.reward.number || 0,
    link_to_join: row.link_to_join?.url ?? "URL not available",
    social_icon: extractFileUrls(row.social_icon.files),
  })) as TaskStoreDataStructured[];

  return tasksDataStructured;
};

export const completeTask = async () => {
  
}

export async function getConfig(
  connection: Connection
): Promise<ConfigFields | null> {
  try {
    const fields = (
      await connection.query("SELECT * FROM config")
    )[0][0] as ConfigFields;

    return fields;
  } catch (e) {
    console.log(e);
    return null;
  }
}
