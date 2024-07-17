import { bot, frontendLink } from "../index";

bot.start((ctx) => {
  ctx.reply(
    `This is test CS bot application for development, this message will change due to deploy\nAddress to frontend: ${frontendLink}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Press me", web_app: { url: frontendLink } }],
        ],
      },
    }
  );
});