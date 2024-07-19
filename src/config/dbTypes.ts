
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

export type User = {
  balance_common: number;
  ballance_purple: number;
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