import { Request, Response } from "express";
import { Client } from "@notionhq/client";
import { SkinStoreDataStructured, SkinStoreOrders } from "../config/dbTypes";

import { checkingInitData } from "../utils/functions";
import { bot, connection } from "../index";
import { User } from "../config/dbTypes";

export const authUser = async (req: Request, res: Response) => {
  const init_data = req.body.initData;

  try {
    const userInfo = checkingInitData(init_data, res) as any;

    if (userInfo) {
      // вернем тут объект юзера
      const user_id = userInfo.id;
      const [response] = await connection.query<any[]>(
        `SELECT * FROM users WHERE user_id=${user_id}`
      );

      if (!response || !response.length) {
        const createUserQuery = `INSERT INTO users (balance_common, balance_purple, user_id, last_daily_bonus_time_clicked, invited_users, last_click, stamina) VALUES (0, 0, ${user_id}, 0, 0, 0, 1000)`;

        try {
          await connection.query(createUserQuery);
        } catch (e) {
          console.log("Error to create new user!");
          return res.send(500).json({ message: e, success: false });
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

export const convertBalance = async (req: Request, res: Response) => {
  const exchangeCoeff = 10000;
  const init_data = req.body.initData;

  try {
    const userInfo = checkingInitData(init_data, res) as any;
    const user_id = userInfo.id;

    const [response] = await connection.query(
      `SELECT * FROM users WHERE user_id=${user_id}`
    );
    const user = response[0] as User;

    let { balance_common, balance_purple } = user;

    const amntOfPurpleCoins = Math.floor(balance_common / exchangeCoeff);

    balance_purple += amntOfPurpleCoins;
    balance_common -= amntOfPurpleCoins * exchangeCoeff;

    if (balance_common < 0) balance_common = 0;

    await connection.query(
      `UPDATE users SET balance_purple=${balance_purple}, balance_common=${balance_common} WHERE user_id=${user_id}`
    );

    return res.json({
      success: {
        message: "Successfully converted!",
        success: true,
      },
      result: {
        balance_common,
        balance_purple,
      },
    });
  } catch (e) {
    console.log("Can't find such user!");
    return res
      .sendStatus(404)
      .json({ message: "Some error occured!", success: false });
  }
};

export const getSkins = async (req: Request, res: Response) => {
  function extractMultiSelectNames(options) {
    return options.multi_select.map((option) => option.name).join(", ");
  }
  const notionSecret = process.env.NOTION_SECRET;
  const notionStoreDataBaseld = process.env.NOTION_SKIN_STORE_DATABASE_ID;
  const notion = new Client({ auth: notionSecret });

  try {
    try {
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

      const [response] = await connection.query("SELECT * FROM skin_store_orders");
      const users = response as SkinStoreOrders[];

      for (const user of users) {
        const itemsId = user.items_id.split(",");

        itemsId.forEach((id) => {
          const itemId = storeDataStructured.findIndex(
            (el) => el.item_id === Number(id)
          );
          if (itemId === -1) {
            console.log(
              "Trying to delete element " + itemId + " but it wasn't found!"
            );
          }
          storeDataStructured.splice(itemId, 1);
        });
      }

      return res.json(storeDataStructured);
    } catch (error) {
      console.log("Error to get skin list!", error);

      return res.status(400).json({
        success: false,
        message: "Error to get skin list!",
        details: error,
      });
    }
  } catch (e) {
    console.log("Error with user data!", e);
    return res.status(400).json({
      success: false,
      message: "Error with user data!",
      details: e,
    });
  }
}