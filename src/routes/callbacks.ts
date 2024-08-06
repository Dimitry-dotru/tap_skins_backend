import { Request, Response } from "express";
import { Client } from "@notionhq/client";
import { SkinStoreDataStructured, SkinStoreOrders } from "../config/dbTypes";

import { checkingInitData, getRewards } from "../utils/functions";
import { bot, connection } from "../index";
import { User } from "../config/dbTypes";

export const authUser = async (req: Request, res: Response) => {
  const init_data = req.body.initData;
  const referalManId =
    req.query.referalId === undefined ? null : req.query.referalId;

  const bonus = {
    purple: 1000,
    common: 1000000,
  };

  const referalManBonus = {
    purple: 10,
    common: 10,
  };

  try {
    const userInfo = checkingInitData(init_data, res) as any;

    if (userInfo) {
      // вернем тут объект юзера
      const user_id = userInfo.id;
      const [response] = await connection.query<any[]>(
        `SELECT balance_common, balance_purple, user_id, last_daily_bonus_time_clicked, invited_users, last_click, stamina FROM users WHERE user_id=${user_id}`
      );

      // создаем пользователя....
      let addReferalBonus: boolean = false;
      if (!response || !response.length) {
        if (referalManId) {
          try {
            // находим человека, который дал реферальную ссылку
            const referalMan = (await connection.query(
              `SELECT * FROM users WHERE user_id=${referalManId}`
            )[0][0]) as User;

            referalMan.balance_common += referalManBonus.common;
            referalMan.balance_purple += referalManBonus.purple;

            referalMan.invited_users += 1;

            await connection.query(
              `UPDATE users SET balance_common=${referalMan.balance_common}, balance_purple=${referalMan.balance_purple}, invited_users=${referalMan.invited_users} WHERE user_id=${referalManId}`
            );

            addReferalBonus = true;
          } catch (e) {
            console.log("Error with searching referal man!", e);
          }
        }

        const createUserQuery = `INSERT INTO users (balance_common, balance_purple, user_id, last_daily_bonus_time_clicked, invited_users, last_click, stamina) VALUES (${
          addReferalBonus ? bonus.common : 0
        }, ${addReferalBonus ? bonus.purple : 0}, ${user_id}, 0, 0, 0, 1000)`;

        try {
          await connection.query(createUserQuery);
        } catch (e) {
          console.log("Error to create new user!");
          return res.send(500).json({ message: e, success: false });
        }

        const [newUser] = await connection.query<any[]>(
          `SELECT * FROM users WHERE user_id=${user_id}`
        );

        return res.json({
          user: newUser[0],
          success: true,
          bonus: addReferalBonus ? bonus : null,
        });
      }

      // возвращаем пользователя из бд
      const user = response[0] as User;
      return res.json({
        user,
        success: true,
        bonus: null,
      });
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

      const [response] = await connection.query(
        "SELECT user_id, skin_store_orders_ids FROM users"
      );
      const users = response as SkinStoreOrders[];

      for (const user of users) {
        const itemsId = user.skin_store_orders_ids.split(",");

        itemsId.forEach((id) => {
          const itemId = storeDataStructured.findIndex(
            (el) => el.item_id === Number(id)
          );
          if (itemId !== -1) storeDataStructured.splice(itemId, 1);
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
};

export const checkSkins = async (req: Request, res: Response) => {
  const skinIds = (req.body.skinIds as string).split(",");
  try {
    const [rows] = await connection.query(
      "SELECT user_id, skin_store_orders_ids FROM users"
    );
    const data = rows as SkinStoreOrders[];
    const allReservedIds = data
      .map((el) => el.skin_store_orders_ids)
      .join(",")
      .split(",")
      .filter((el) => {
        const index = skinIds.findIndex((e) => el === e);
        if (index === -1) return false;
        else {
          skinIds.splice(index, 1);
          return true;
        }
      });

    return res.send(allReservedIds.join(","));
  } catch (e) {
    console.log(e);
    return res.status(500).send("Some error with db");
  }
};

export const reward = async (req: Request, res: Response) => {
  const reward_id = parseInt(req.params.reward_id);
  const init_data = req.body.initData;

  const rewardObj = {
    common: 0,
    purple: 0,
  };

  try {
    const userInfo = checkingInitData(init_data, res) as any;
    const user_id = userInfo.id;

    const rewards = await getRewards();

    if (!rewards) {
      console.log("Some error with notion");
      return res.status(500).json({
        message: "Unknown error, please try again later",
        success: false,
      });
    }

    const user = (
      (
        await connection.query(
          `SELECT invited_users, balance_common, balance_purple FROM users WHERE user_id=${user_id}`
        )
      )[0] as any
    )[0];

    const clickedReferal = rewards.find((el) => el.reward_id === reward_id);

    if (!clickedReferal) {
      return res.status(404).json({
        success: false,
        message: "Error to find such referal!",
      });
    }

    if (user.invited_users - clickedReferal.referal_amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Not enough invited people to claim reward!",
      });
    }

    if (clickedReferal.reward_type === "purple_coin")
      rewardObj.purple += clickedReferal.reward;
    else if (clickedReferal.reward_type === "yellow_coin")
      rewardObj.common += clickedReferal.reward;

    await connection.query(
      `UPDATE users SET invited_users=${
        user.invited_users - clickedReferal.referal_amount
      }, balance_common=${
        user.balance_common + rewardObj.common
      }, balance_purple=${
        user.balance_purple + rewardObj.purple
      } WHERE user_id=${user_id}`
    );

    return res.json({
      success: true,
      message: "Reward was claimed!",
    });
  } catch (e) {
    console.log(e);
    return res.status(400).json({
      success: false,
      message: "Unknown error, please try again later",
      details: e,
    });
  }
};

export const dailyReward = async (req: Request, res: Response) => {
  const initData = req.body.initData;
  const dailyBonusReward = {
    purple: 0,
    common: 5000,
  };

  try {
    const userInfo = checkingInitData(initData, res) as any;
    const user_id = userInfo.id;

    try {
      interface SelectedUserFields {
        last_daily_bonus_time_clicked: number;
        balance_common: number;
        balance_purple: number;
      }

      const userData = (
        await connection.query(
          `SELECT last_daily_bonus_time_clicked, balance_common, balance_purple FROM users WHERE user_id=${user_id}`
        )
      )[0][0] as SelectedUserFields;

      const currentTime = Date.now();
      if (
        Math.abs(currentTime - userData.last_daily_bonus_time_clicked) >=
        24 * 60 * 60 * 1000
      ) {
        userData.balance_common += dailyBonusReward.common;
        userData.balance_purple += dailyBonusReward.purple;

        await connection.query(
          `UPDATE users SET balance_common=${
            userData.balance_common
          }, balance_purple=${
            userData.balance_purple
          }, last_daily_bonus_time_clicked=${Date.now()} WHERE user_id=${user_id}`
        );

        return res.json({
          message: "",
          success: true,
        });
      }

      return res.json({
        message: "You can't claim reward!",
        success: false,
      });
    } catch (e) {}
  } catch (e) {
    res.status(500).json({
      message: "Error!",
      details: e,
      success: false,
    });
  }
};

// async function getRewards() {
//   const user_id = 16123123;

//   // Извлечение имен из мультиселектов
//   function extractMultiSelectNames(options: {
//     multi_select: MultiSelectOption[];
//   }): string {
//     return options.multi_select.map((option) => option.name).join(", ");
//   }

//   // Извлечение только URL из объекта files
//   function extractFileUrls(
//     files: { name: string; file: { url: string } }[]
//   ): string {
//     return files.map((file) => file.file.url).join(", ");
//   }

//   const notionSecret = process.env.NOTION_SECRET;
//   const notionStoreDataBaseld =
//     process.env.NOTION_REFERAL_REWARD_STORE_DATABASE_ID;
//   const notion = new Client({ auth: notionSecret });

//   // Проверка наличия необходимых переменных окружения
//   if (!notionSecret || !notionStoreDataBaseld) {
//     // res.status(500).json({ error: "Missing notion secret or DB-ID." });
//     return;
//   }

//   try {
//     const query = await notion.databases.query({
//       database_id: notionStoreDataBaseld,
//     });

//     const rows = query.results.map(
//       (res) => (res as any).properties
//     ) as RowReferal[];

//     const referalRewardStoreStructured: ReferalRewardStoreDataStructured[] =
//       rows.map((row) => ({
//         reward_id: row.reward_id.unique_id.number || 0,
//         reward_name:
//           row.reward_name.title?.[0]?.text?.content ?? "Default Name",
//         reward_type: extractMultiSelectNames(row.reward_type),
//         referal_amount: row.referal_amount.number || 0,
//         reward: row.reward.number || 0,
//         referal_icon: extractFileUrls(row.referal_icon.files),
//       }));

//     const claimedUsersRewards: { user_id: number; claimed_referals: string }[] =
//       (
//         await connection.query(
//           `SELECT * FROM claimed_referals WHERE user_id=${user_id}`
//         )
//       )[0] as any;

//     if (claimedUsersRewards.length) {
//       const claimedIds = claimedUsersRewards[0].claimed_referals.split(",");
//       referalRewardStoreStructured.map((el) => {
//         const completed =
//           claimedIds.findIndex((id) => parseInt(id) === el.reward_id) !== -1;
//           console.log({ ...el, completed: completed });
//         return { ...el, completed: completed };
//       });
//     }

//     // console.log(referalRewardStoreStructured);

//     // res.json({ referalRewardStoreStructured });
//   } catch (error) {
//     console.log(error);
//     // res.status(500).json({ error: "Failed to fetch data from Notion" });
//   }
// }
