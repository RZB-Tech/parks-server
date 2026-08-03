import axios from "axios";

const GetBotToken = (): string => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN_NOT_CONFIGURED");
  }

  return token;
};

const CallTelegramApi = async (method: string, data: object) => {
  await axios.post(
    `https://api.telegram.org/bot${GetBotToken()}/${method}`,
    data,
    { timeout: 10_000 },
  );
};

export const SendTelegramMessage = async (
  chatID: number,
  text: string,
  replyMarkup?: object,
) => {
  await CallTelegramApi("sendMessage", {
    chat_id: chatID,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
};

export const HideTelegramMenuButton = async (chatID: number) => {
  await CallTelegramApi("setChatMenuButton", {
    chat_id: chatID,
    menu_button: { type: "commands" },
  });
};

export const ShowTelegramMenuButton = async (chatID: number) => {
  const miniAppURL = process.env.TELEGRAM_MINI_APP_URL;

  if (!miniAppURL) {
    throw new Error("TELEGRAM_MINI_APP_URL_NOT_CONFIGURED");
  }

  await CallTelegramApi("setChatMenuButton", {
    chat_id: chatID,
    menu_button: {
      type: "web_app",
      text: "Открыть Central Park",
      web_app: { url: miniAppURL },
    },
  });
};

export const ContactKeyboard = {
  keyboard: [[{ text: "Поделиться номером 📱", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export const RemoveKeyboard = { remove_keyboard: true };
