import WebSocket from "ws";
import { connection } from "../index";

const onConnect = (ws: WebSocket) => {
  ws.on("message", async (message) => {
    try {
      const { user_id, last_click, stamina, balance_common } = JSON.parse(
        message.toString()
      );

      const query = `
        UPDATE users
        SET last_click = ${last_click}, stamina = ${stamina}, balance_common = ${balance_common}
        WHERE user_id = ${user_id};
      `;
      try {
        await connection.query(query);

        const [response] = await connection.query<any[]>(
          `SELECT * FROM users WHERE user_id=${user_id}`
        );
        ws.send(
          JSON.stringify({
            success: true,
            message: "Success!",
            newUser: response[0]
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
