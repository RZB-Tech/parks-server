import assert from "node:assert/strict";
import { test } from "node:test";
import { UserLanguageTypes, UserStatusTypes } from "../src/models/postgresql/client/user-model/enums";
import { UserModel } from "../src/models/postgresql/client/user-model/UserModel";
import { EnsureUsersSchema } from "../src/plugins/db/postgresql/usersSchema";
import * as TelegramBotApi from "../src/services/telegram-bot-services/TelegramBotApiServices";
import { ProcessTelegramUpdate } from "../src/services/telegram-bot-services/TelegramBotServices";
import {
  GetTelegramBotMessages,
  TelegramBotTranslations,
} from "../src/services/telegram-bot-services/TelegramBotTranslations";
import {
  NormalizeUserLanguage,
  ParseUserLanguage,
} from "../src/utils/client/UserLanguage";

test("Telegram language codes normalize to uz, ru, or en", () => {
  assert.equal(ParseUserLanguage("uz-UZ"), UserLanguageTypes.UZ);
  assert.equal(ParseUserLanguage("ru_RU"), UserLanguageTypes.RU);
  assert.equal(ParseUserLanguage("en-US"), UserLanguageTypes.EN);
  assert.equal(ParseUserLanguage("de-DE"), null);
  assert.equal(ParseUserLanguage(undefined), null);
  assert.equal(NormalizeUserLanguage("de-DE"), UserLanguageTypes.UZ);
});

test("bot translations include localized messages and buttons", () => {
  assert.match(GetTelegramBotMessages("uz").registrationWelcome, /xush kelibsiz/i);
  assert.match(GetTelegramBotMessages("ru").registrationWelcome, /Добро пожаловать/);
  assert.match(GetTelegramBotMessages("en").registrationWelcome, /Welcome/);
  assert.doesNotMatch(
    GetTelegramBotMessages("ru").registrationWelcome,
    /Начнём знакомство/,
  );
  assert.match(GetTelegramBotMessages("uz").askFullName, /Masalan: Ali Valiyev/);
  assert.match(GetTelegramBotMessages("ru").askFullName, /Например: Иван Петров/);
  assert.match(GetTelegramBotMessages("en").askFullName, /For example: John Smith/);
  assert.match(
    GetTelegramBotMessages("ru").askDateOfBirth("Иван"),
    /Например: 15\.08\.1995/,
  );
  assert.equal(
    TelegramBotTranslations[UserLanguageTypes.UZ].contactButton,
    "Telefon raqamini yuborish 📱",
  );
  assert.equal(
    TelegramBotTranslations[UserLanguageTypes.RU].menuButton,
    "Открыть Central Park",
  );
  assert.equal(
    TelegramBotTranslations[UserLanguageTypes.EN].menuButton,
    "Open Central Park",
  );
});

test("new user receives separate welcome and full-name prompt after /start", async (t) => {
  const sentMessages: string[] = [];

  t.mock.method(UserModel, "findOne", async () => null);
  t.mock.method(
    TelegramBotApi,
    "HideTelegramMenuButton",
    async () => undefined,
  );
  t.mock.method(
    TelegramBotApi,
    "SendTelegramMessage",
    async (_chatID: number, text: string) => {
      sentMessages.push(text);
    },
  );

  await ProcessTelegramUpdate({
    update_id: 2,
    message: {
      text: "/start",
      chat: { id: 2002, type: "private" },
      from: {
        id: 2002,
        first_name: "Ivan",
        language_code: "ru",
      },
    },
  });

  assert.equal(sentMessages.length, 2);
  assert.match(sentMessages[0], /Добро пожаловать в Central Park/);
  assert.doesNotMatch(sentMessages[0], /Начнём знакомство/);
  assert.match(sentMessages[1], /Начнём знакомство/);
  assert.match(sentMessages[1], /Например: Иван Петров/);
});

test("users schema persists a normalized language for proactive messages", async () => {
  const sql: string[] = [];
  const sequelize = {
    transaction: async (callback: any) => callback({ id: "transaction" }),
    query: async (query: string) => {
      sql.push(query);
      return [];
    },
  } as any;

  await EnsureUsersSchema(sequelize);

  const statements = sql.join("\n");
  assert.match(
    statements,
    /ADD COLUMN IF NOT EXISTS "language"[\s\S]+VARCHAR\(2\) NOT NULL DEFAULT 'uz'/,
  );
  assert.match(statements, /"language" NOT IN \('uz', 'ru', 'en'\)/);
  assert.match(statements, /ALTER COLUMN "language" SET NOT NULL/);
});

test("returning user language is saved from /start and used in the reply", async (t) => {
  const sentMessages: string[] = [];
  const menuLanguages: UserLanguageTypes[] = [];
  let updatedLanguage: UserLanguageTypes | undefined;
  const user = {
    id: 1,
    telegram_id: 1001,
    telegram_first_name: "Ivan",
    fullname: "Ivan Petrov",
    language: UserLanguageTypes.UZ,
    status: UserStatusTypes.ACTIVE,
    phone_verified_at: new Date(),
    registered_at: new Date(),
    update: async (values: { language: UserLanguageTypes }) => {
      updatedLanguage = values.language;
      user.language = values.language;
    },
  } as any;

  t.mock.method(UserModel, "findOne", async () => user);
  t.mock.method(
    TelegramBotApi,
    "ShowTelegramMenuButton",
    async (_chatID: number, language: UserLanguageTypes) => {
      menuLanguages.push(language);
    },
  );
  t.mock.method(
    TelegramBotApi,
    "SendTelegramMessage",
    async (_chatID: number, text: string) => {
      sentMessages.push(text);
    },
  );

  await ProcessTelegramUpdate({
    update_id: 1,
    message: {
      text: "/start",
      chat: { id: 1001, type: "private" },
      from: {
        id: 1001,
        first_name: "Ivan",
        language_code: "ru-RU",
      },
    },
  });

  assert.equal(updatedLanguage, UserLanguageTypes.RU);
  assert.deepEqual(menuLanguages, [UserLanguageTypes.RU]);
  assert.match(sentMessages[0], /Рады видеть вас снова/);
});
