import { app } from "../index";
import {
  addToCartHandle,
  authUser,
  checkSkins,
  convertBalance,
  dailyReward,
  getCartHandle,
  getSkins,
  getTasks,
  removeFromCartHandle,
  reward,
  userSubscription,
  checkRewardForTasks,
} from "./callbacks";


//? some utils
// авторизация
app.post("/auth", authUser);
// проверка на подписку пользователя
app.post("/subscription", userSubscription);
// конвертация желтых монет в фиолетовые
app.post("/convert", convertBalance);

//? skins
// получаем список незарезервированных скинов
app.get("/skins", getSkins);
// при покупке товаров, возвращает действительно ли товары доступны
app.post("/check-skins", checkSkins);

//? cart
// добавление какого-то товара в корзину
app.post("/cart/add/:item_id", addToCartHandle);
// удаление из корзины
app.post("/cart/remove/:item_id", removeFromCartHandle);
// получение корзины пользователя
app.get("/cart", getCartHandle);

//? task page
// получение ежедневной нагрды
app.post("/daily-reward", dailyReward);
// получение награды
app.post("/reward/:reward_id", reward);
// получение всех заданий
app.get("/tasks", getTasks);
// проверяем, должен ли юзер получить награду
app.get("/tasks/completed", checkRewardForTasks);