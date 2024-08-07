import { Request, Response } from "express";
import { Client } from "@notionhq/client";
import { config } from "../index";
import {
  RowTaskStore,
  SkinStoreOrders,
  TaskStoreDataStructured,
  TelegramUser,
} from "../config/dbTypes";

import {
  checkingInitData,
  clearUsersCart,
  extractFileUrls,
  extractMultiSelectNames,
  getRewards,
  getSkinsItemsById,
  getSkinsList,
  getSummaryPriceOfSkins,
  getTasksById,
} from "../utils/functions";
import { bot, connection } from "../index";
import { User } from "../config/dbTypes";

const notionSecret = process.env.NOTION_SECRET;

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

    if (!userInfo) {
      console.log("Invalid!");
      return res.status(403).json({ success: false, message: "Invalid" });
    }

    const [response] = await connection.query<any[]>(
      `SELECT balance_common, balance_purple, user_id, last_daily_bonus_time_clicked, invited_users, last_click, stamina FROM users WHERE user_id=${userInfo.id}`
    );

    let addReferalBonus: boolean = false;
    if (!response || !response.length) {
      if (referalManId) {
        try {
          const referalMan = (
            await connection.query(
              `SELECT * FROM users WHERE user_id=${referalManId}`
            )
          )[0][0] as User;

          referalMan.balance_common += referalManBonus.common;
          referalMan.balance_purple += referalManBonus.purple;
          referalMan.invited_users += 1;

          await connection.query(
            `UPDATE users SET balance_common=${referalMan.balance_common}, balance_purple=${referalMan.balance_purple}, invited_users=${referalMan.invited_users} WHERE user_id=${referalManId}`
          );

          addReferalBonus = true;
        } catch (e) {
          console.log("Error with searching referal man!", e);
          return res
            .status(500)
            .json({ message: "Error with referal bonus", success: false });
        }
      }

      const createUserQuery = `INSERT INTO users (balance_common, balance_purple, user_id, last_daily_bonus_time_clicked, invited_users, last_click, stamina) VALUES (${
        addReferalBonus ? bonus.common : 0
      }, ${addReferalBonus ? bonus.purple : 0}, ${userInfo.id}, 0, 0, 0, 1000)`;

      try {
        await connection.query(createUserQuery);
      } catch (e) {
        console.log("Error to create new user!", e);
        return res
          .status(500)
          .json({ message: "Error to create new user", success: false });
      }

      const [newUser] = await connection.query<any[]>(
        `SELECT * FROM users WHERE user_id=${userInfo.id}`
      );

      return res.json({
        user: newUser[0],
        success: true,
        bonus: addReferalBonus ? bonus : null,
      });
    }

    const user = response[0] as User;
    return res.json({
      user,
      success: true,
      bonus: null,
    });
  } catch (error) {
    console.log(error);
    return res
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
  const maxHoursToStoreCart = config.cart_holding_time;

  try {
    const storeDataStructured = await getSkinsList();

    const [response] = await connection.query(
      "SELECT user_id, skin_store_orders_ids, skin_store_items_cart_ids, order_date FROM users"
    );
    const users = response as SkinStoreOrders[];

    for (const user of users) {
      if (
        user.skin_store_orders_ids.trim() === "" &&
        user.skin_store_items_cart_ids.trim() === ""
      )
        continue;

      if (
        user.order_date !== 0 &&
        (Date.now() - user.order_date) / (1000 * 60 * 60) >= maxHoursToStoreCart
      ) {
        user.skin_store_items_cart_ids = "";
        await clearUsersCart(user.user_id);
      }

      const cartIds = (
        user.skin_store_items_cart_ids.trim() === ""
          ? []
          : JSON.parse(user.skin_store_items_cart_ids)
      ) as number[];

      const orderIds = (
        user.skin_store_orders_ids.trim() === ""
          ? []
          : JSON.parse(user.skin_store_orders_ids)
      ) as number[];

      const totalIds = cartIds.concat(orderIds);

      totalIds.forEach((id) => {
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
};
export const addToCartHandle = async (req: Request, res: Response) => {
  try {
    const item_id = parseInt(req.params.item_id);
    const init_data = req.body.initData;

    const user_id = (checkingInitData(init_data, res) as any).id;

    try {
      const usersOrders = (
        await connection.query(
          `SELECT skin_store_items_cart_ids, user_id, skin_store_orders_ids, balance_purple FROM users`
        )
      )[0] as {
        skin_store_orders_ids: string;
        skin_store_items_cart_ids: string;
        user_id: number;
        balance_purple: number;
      }[];

      // Проверяем не лежит ли товар уже у кого-то, или занят тем же пользователем
      for (const order of usersOrders) {
        if (
          order.skin_store_orders_ids.trim() === "" &&
          order.skin_store_items_cart_ids.trim() === ""
        )
          continue;

        const cartIds = (
          order.skin_store_items_cart_ids.trim() === ""
            ? []
            : JSON.parse(order.skin_store_items_cart_ids)
        ) as number[];
        const orderIds = (
          order.skin_store_orders_ids.trim() === ""
            ? []
            : JSON.parse(order.skin_store_orders_ids)
        ) as number[];

        const totalIds = cartIds.concat(orderIds);

        if (totalIds.find((el) => el === item_id)) {
          return res.json({
            success: false,
            message:
              order.user_id === user_id
                ? "Item already in the cart!"
                : "This item is taken by some user!",
          });
        }
      }

      const usersCart = usersOrders.find((el) => el.user_id === user_id);

      if (!usersCart) {
        console.log("Can't find user with id " + user_id);
        return res.json({
          message: "Some error occured, try again later",
          success: false,
        });
      }

      // добавляем в корзину товар
      const list =
        usersCart.skin_store_items_cart_ids.trim() === ""
          ? []
          : JSON.parse(usersCart.skin_store_items_cart_ids);

      list.push(item_id);

      const totalPrice = await getSummaryPriceOfSkins(list);

      if (usersCart.balance_purple < totalPrice) {
        return res.json({
          message: "Not enough balance!",
          success: false,
        });
      }

      usersCart.skin_store_items_cart_ids = JSON.stringify(list);

      await connection.query(
        `UPDATE users SET skin_store_items_cart_ids="${
          usersCart.skin_store_items_cart_ids
        }", order_date=${Date.now()} WHERE user_id=${user_id}`
      );

      return res.json({
        message: "Successfully addded to cart!",
        success: true,
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({
        message: "Some error occured, try again!",
        success: false,
        details: e,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(403).json({
      message: "Unable to auth!",
      success: false,
      details: error,
    });
  }
};
export const getCartHandle = async (req: Request, res: Response) => {
  try {
    const initData = req.query;
    const user = checkingInitData(initData, res);
    const maxCartHoursHolding = config.cart_holding_time;

    try {
      const user_id = user.id;

      const usersCart = (
        await connection.query(
          `SELECT order_date, skin_store_items_cart_ids FROM users WHERE user_id=${user_id}`
        )
      )[0][0] as {
        order_date: number;
        skin_store_items_cart_ids: string;
      };

      // если у пользователя товары лежат уже слишком долго
      if (
        (Date.now() - usersCart.order_date) / (1000 * 60 * 60) >
        maxCartHoursHolding
      ) {
        await clearUsersCart(user_id);
        return {
          message: "The items have been in the cart for too long!",
          success: false,
        };
      }

      const itemsIdsInCart =
        usersCart.skin_store_items_cart_ids.trim() === ""
          ? []
          : JSON.parse(usersCart.skin_store_items_cart_ids);

      const itemsInCart = await getSkinsItemsById(itemsIdsInCart);

      return res.json({
        items: itemsInCart,
        message: "Cart successfully loaded!",
        success: true,
      });
    } catch (e) {
      console.log("Error with connection to db!", e);
      return res.status(500).json({
        message: "Some error occured, try again later",
        success: false,
        details: e,
      });
    }
  } catch (e) {
    console.log("Error to get user's cart", e);
    return res.status(500).json({
      message: "Some error occured, try again later",
      success: false,
      details: e,
    });
  }
};
export const removeFromCartHandle = async (req: Request, res: Response) => {
  try {
    const item_id = req.params.item_id;
    const init_data = req.body.initData;

    const user_id = (checkingInitData(init_data, res) as any).id;

    try {
      const usersCart = (
        await connection.query(
          `SELECT skin_store_items_cart_ids, user_id FROM users WHERE user_id=${user_id}`
        )
      )[0][0] as { skin_store_items_cart_ids: string; user_id: number };

      if (!usersCart) {
        console.log("Can't find user with id " + user_id);
        return res.status(404).send({
          message: "Can't find user, try again later",
          success: false,
        });
      }

      if (usersCart.skin_store_items_cart_ids.trim() === "") {
        return res.json({
          success: false,
          message: "Cart is already empty!",
        });
      }
      const list = JSON.parse(usersCart.skin_store_items_cart_ids).filter(
        (el) => parseInt(el) !== parseInt(item_id)
      );

      if (!list.length) {
        await clearUsersCart(user_id);
      }

      usersCart.skin_store_items_cart_ids = list.length
        ? JSON.stringify(list)
        : "";
      await connection.query(
        `UPDATE users SET skin_store_items_cart_ids="${usersCart.skin_store_items_cart_ids}" WHERE user_id=${user_id}`
      );

      return res.json({
        message: "Deleted successfully!",
        success: true,
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({
        message: "Some error occured, try again!",
        success: false,
        details: e,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(403).json({
      message: "Unable to auth!",
      success: false,
      details: error,
    });
  }
};
export const checkSkins = async (req: Request, res: Response) => {
  const skinIds = (req.body.skinIds as string).split(",");
  const initData = req.body.initData;
  try {
    const user_id = (checkingInitData(initData, res) as any).id;
    const [rows] = await connection.query(
      "SELECT user_id, skin_store_orders_ids FROM users"
    );
    const data = (rows as SkinStoreOrders[]).filter(
      (el) => el.user_id !== user_id
    );
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
export const getTasks = async (req: Request, res: Response) => {
  const notionStoreDataBaseld = process.env.NOTION_TASK_STORE_DATABASE_ID;
  const notion = new Client({ auth: notionSecret });

  // Проверка наличия необходимых переменных окружения
  if (!notionSecret || !notionStoreDataBaseld) {
    return res.status(500).json({
      success: false,
      message: "Error getting tasks",
      details: "No db secrets",
    });
  }

  const user = checkingInitData(req.query, res) as TelegramUser;
  const user_id = user.id;

  try {
    const query = await notion.databases.query({
      database_id: notionStoreDataBaseld,
    });

    const rows = query.results.map(
      (res) => (res as any).properties
    ) as RowTaskStore[];
    const taskStoreDataStructured: TaskStoreDataStructured[] = rows.map(
      (row) => ({
        task_id: row.task_id.unique_id.number || 0,
        task_name: row.task_name.title?.[0]?.text?.content ?? "Default Name",
        platform_type: extractMultiSelectNames(row.platform_type),
        reward_type: extractMultiSelectNames(row.reward_type),
        reward: row.reward.number || 0,
        link_to_join: row.link_to_join?.url ?? "URL not available",
        social_icon: extractFileUrls(row.social_icon.files),
      })
    );

    const response = (
      await connection.query(
        `SELECT completed_tasks_ids FROM users WHERE user_id=${user_id}`
      )
    )[0][0].completed_tasks_ids;

    const completedTasks = response.trim() === "" ? [] : JSON.parse(response);

    const unCompletedTasks: TaskStoreDataStructured[] =
      taskStoreDataStructured.filter((el) => {
        return !completedTasks.find(
          (task_id) => el.task_id === parseInt(task_id)
        );
      });

    return res.json({
      unCompletedTasks,
      tasks: {
        completed: completedTasks.length,
        total: taskStoreDataStructured.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      succcess: false,
      message: "Some error occured!",
      details: error,
    });
  }
};
export const checkRewardForTasks = async (req: Request, res: Response) => {
  // вернет список заданий, за которые нужно получить награду
  // возвращаемый формат:
  // {
  //   success: boolean,
  //   rewardsClaimed: {
  //     purple: number,
  //     yellow: number,
  //   }
  //   message: string
  // }
  try {
    const initData = req.query;
    const user = checkingInitData(initData, res);
    const user_id = user.id;
    const rewardsForUser = (
      await connection.query(
        `SELECT tasks_to_claim, balance_common, balance_purple FROM users WHERE user_id=${user_id}`
      )
    )[0][0] as {
      tasks_to_claim: string;
      balance_purple: number;
      balance_common: number;
    };

    if (rewardsForUser.tasks_to_claim.trim() === "") {
      // нечего получать
      return res.json({
        message: "",
        success: true,
        rewardsClaimed: {
          purple: 0,
          yellow: 0,
        },
      });
    }

    const completedTasks = JSON.parse(
      rewardsForUser.tasks_to_claim
    ) as number[];
    const allTasks = await getTasksById(completedTasks);

    const reward = {
      purple: allTasks.reduce((acc, cur) => {
        return (acc += cur.reward_type === "purple_coin" ? cur.reward : 0);
      }, 0),
      yellow: allTasks.reduce((acc, cur) => {
        return (acc += cur.reward_type === "yellow_coin" ? cur.reward : 0);
      }, 0),
    };

    try {
      await connection.query(
        `UPDATE users SET balance_common=${(rewardsForUser.balance_common +=
          reward.yellow)}, balance_purple=${(rewardsForUser.balance_purple +=
          reward.purple)}, tasks_to_claim='' WHERE user_id=${user_id}`
      );
    } catch (error) {
      console.log(error);
      // вернуть сообщение о том что награда не была получена
      return res.status(500).json({
        message: "Error with the server, try again later",
        success: false,
        details: error,
      });
    }

    return res.json({
      message: "Success!",
      success: true,
      rewardsClaimed: reward,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Error with the server, try again later",
      success: false,
      details: e,
    });
  }
};
