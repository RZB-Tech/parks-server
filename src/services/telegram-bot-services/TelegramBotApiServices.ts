import axios from "axios";
import { UserLanguageTypes } from "../../models/postgresql/client/user-model/enums";
import { TelegramBotTranslations } from "./TelegramBotTranslations";

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

export const ShowTelegramMenuButton = async (
  chatID: number,
  language: UserLanguageTypes,
) => {
  const miniAppURL = process.env.TELEGRAM_MINI_APP_URL;

  if (!miniAppURL) {
    throw new Error("TELEGRAM_MINI_APP_URL_NOT_CONFIGURED");
  }

  await CallTelegramApi("setChatMenuButton", {
    chat_id: chatID,
    menu_button: {
      type: "web_app",
      text: TelegramBotTranslations[language].menuButton,
      web_app: { url: miniAppURL },
    },
  });
};

export const GetContactKeyboard = (language: UserLanguageTypes) => ({
  keyboard: [
    [
      {
        text: TelegramBotTranslations[language].contactButton,
        request_contact: true,
      },
    ],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
});

export const RemoveKeyboard = { remove_keyboard: true };
