import WebSocket from "ws";
import { connection } from "../index";
import { User } from "./dbTypes";

const onConnect = (ws: WebSocket) => {
  ws.on("message", async (message) => {
    try {
      let { user_id, stamina, balance_common } = JSON.parse(
        message.toString()
      );

      const [response] = await connection.query<any[]>(
        `SELECT * FROM users WHERE user_id=${user_id}`
      );
      const user = response[0] as User;
      try {
        const query = `
          UPDATE users
          SET last_click = ${Date.now()}, stamina = ${stamina}, balance_common = ${balance_common}
          WHERE user_id = ${user_id};
        `;
        await connection.query(query);

        ws.send(
          JSON.stringify({
            success: true,
            message: "Success!",
            newUser: user,
          })
        );
        return;
      } catch (e) {
        console.log("Error saving user data on websocket! Error:" ,e);
        ws.send(
          JSON.stringify({
            success: false,
            message: "Error: " + e,
          })
        );

        return;
      }
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
