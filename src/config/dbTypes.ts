// import {
//   MultiSelectOption,
//   RichTextItemResponse,
//   PropertyObjectResponse,
// } from "@notionhq/client/build/src/api-types";
// const weaponSchemaTemplate = {
//   item_id: String,
//   name: String,
//   rarity: String,
//   price: Number,
//   float: Number,
//   weapon_type: String,
//   weapon_name: String,
//   startrack: Boolean,
//   image_src: String,
// }
export type SkinStoreOrders = {
  user_id: number;
  skin_store_orders_ids: string;
};

// Multi_select
export type MultiSelectOption = {
  id: string;
  name: string;
};

// Skin_Store_data_types
export type SkinStoreDataStructured = {
  item_id: number;
  skin_name: string;
  rarity: string;
  weapon_type: string;
  weapon_name: string;
  price: number;
  float: number;
  startrack: string;
  image_src: string;
  [key: string]: any;
}

export type ReferalRewardStoreDataStructured = {
  reward_id: number;
  reward_name: string;
  reward: number;
  referal_amount: number;
  reward_type: string;
  referal_icon: string;
  [key: string]: any;
}


export type RowReferal = {
  type(type: any): string;
  reward_id: {
    id: string;
    type: string;
    unique_id: {
      prefix: string | null;
      number: number;
    };
  };
  reward_name: {
    id: string;
    title: [{ type: string; text: { content: string } }];
  };
  reward_type: { id: string; multi_select: MultiSelectOption[] };
  reward: {
    id: string;
    name: string;
    type: string;
    number: number;
  };
  referal_amount: {
    id: string;
    name: string;
    type: string;
    number: number;
  };
  referal_icon: {
    id: string;
    name: string;
    type: string;
    files: { name: string; file: { url: string } }[];
  };
}

export type RowSkinStore = {
  item_id: {
    id: string;
    type: string;
    unique_id: {
      prefix: string | null;
      number: number;
    };
  };
  skin_name: {
    id: string;
    title: [{ type: string; text: { content: string } }];
  };
  weapon_name: { id: string; rich_text: { text: { content: string } }[] };
  image_src?: { id: string; name: string; type: string; url: string };
  price: {
    id: string;
    name: string;
    type: string;
    number: number;
  };
  float: {
    id: string;
    name: string;
    type: string;
    number: number;
  };
  rarity: { id: string; multi_select: MultiSelectOption[] };
  weapon_type: { id: string; multi_select: MultiSelectOption[] };
  startrack: { id: string; multi_select: MultiSelectOption[] };
}

export type User = {
  balance_common: number;
  balance_purple: number;
  user_id: number;
  last_daily_bonus_time_clicked: number;
  invited_users: number;
  last_click: number;
  stamina: number;
};

//! USER
// const userSchema = new mongoose.Schema({
//   balance_common: Number,
//   ballance_purple: Number,
//   user_id: Number,
//   last_daily_bonus_time_clicked: Number,
//   invited_users: Number,
//   last_click: Number,
//   stamina: Number
// });
// const userModel = mongoose.model("users", userSchema);

//! TASKS
// const tasksCompletedSchema = new mongoose.Schema({
//   tasks_completed: [{
//     task_id: String,
//     date_completed: Number
//   }],
//   user_id: Number
// });
// const tasksCompletedModel = mongoose.model("tasks_completed", userSchema);

// const taskSchema = new mongoose.Schema({
//   reward: Number,
//   name: String,
//   icon: String,
//   type: String,
//   link_to_join: String,
//   task_id: String
// });
// const taskModel = mongoose.model("tasks", userSchema);

//! HISTORY
// const historySchema = new mongoose.Schema({
//   items: [{
//     ...weaponSchemaTemplate,
//     status: String,
//     link_to_trade: String,
//   }],
//   user_id: Number
// });
// const historyModel = mongoose.model("history", userSchema);

// export { userModel };
