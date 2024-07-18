import WebSocket from "ws";

const onConnect = (ws: WebSocket) => {
  console.log("User connected");
  ws.on("message", async (message) => {
    try {
      const { user_id, last_click, stamina, balance_common } = JSON.parse(message.toString());
      // const user = await userModel.findOne({ user_id });
      
      // user.balance_common = balance_common;
      // user.last_click = last_click;
      // user.stamina = stamina;
      // await user.save();

      // ws.send(
      //   JSON.stringify({ success: true, message: "Saved", newUser: user })
      // );
    } catch (e) {
      ws.send(
        JSON.stringify({
          success: false,
          message: e,
        })
      );
    }
  });

  ws.on("close", () => {
    try {
      ws.send(
        JSON.stringify({
          message: "Connection closed",
          success: true,
        })
      );
    } catch (e) {
      console.log(e);
    }
  });

  ws.on("error", (err) => {
    console.log(err);
    ws.send(
      JSON.stringify({
        message: err,
        success: false,
      })
    );
  });
};

export { onConnect };
