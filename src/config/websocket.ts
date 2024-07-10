import WebSocket from "ws";
import { userModel } from "./mongoose";

const onConnect = (ws: WebSocket) => {
  ws.on("message", async (message) => {
    try {
      const user_id = message.toString();
      const user = await userModel.findOne({ user_id });
      user.balance_common += 1;
      await user.save();

      ws.send(JSON.stringify({success: true, message: "Saved", newUser: user}));
    }
    catch(e) {
      ws.send(JSON.stringify({
        success: false,
        message: e
      }))
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
