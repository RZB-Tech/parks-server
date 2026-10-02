import { Op, Transaction } from "sequelize";
import {
  UserLanguageTypes,
  UserStatusTypes,
} from "../../models/postgresql/client/user-model/enums";
import { UserModel } from "../../plugins/db/postgresql/db";
import { NormalizeUzPhoneNumber } from "../../utils/client/NormilizePhoneNumber";
import {
  GetContactKeyboard,
  HideTelegramMenuButton,
  RemoveKeyboard,
  SendTelegramMessage,
  ShowTelegramMenuButton,
} from "./TelegramBotApiServices";
import {
  GetTelegramBotMessages,
} from "./TelegramBotTranslations";
import {
  ParseUserLanguage,
} from "../../utils/client/UserLanguage";

const registrationStates = new Map<number, TelegramRegistrationState>();

const ParseFullName = (value?: string) => {
  const fullName = value?.trim().replace(/\s+/g, " ");

  if (!fullName || fullName.length > 100) return null;

  const parts = fullName.split(" ");
  if (
    parts.length < 2 ||
    parts.some((part) => !/^[\p{L}'-]{2,50}$/u.test(part))
  ) {
    return null;
  }

  return {
    full_name: fullName,
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
};

const IsValidDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date <= today &&
    year >= 1900
  );
};

const FormatDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const ParseDateOfBirth = (value?: string) => {
  const match = value?.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  return IsValidDate(year, month, day) ? FormatDate(year, month, day) : null;
};

const ShowMiniApp = async (
  chatID: number,
  text: string,
  language: UserLanguageTypes,
) => {
  await ShowTelegramMenuButton(chatID, language);
  await SendTelegramMessage(chatID, text, RemoveKeyboard);
};

const StartRegistration = async (message: TelegramMessage) => {
  const from = message.from!;
  const chatID = message.chat.id;
  const detectedLanguage = ParseUserLanguage(from.language_code);
  const user = await UserModel.findOne({ where: { telegram_id: from.id } });
  const language = detectedLanguage ?? user?.language ?? UserLanguageTypes.UZ;
  const messages = GetTelegramBotMessages(language);

  if (user && detectedLanguage && user.language !== detectedLanguage) {
    await user.update({ language: detectedLanguage });
  }

  if (user?.status === UserStatusTypes.BLOCKED) {
    registrationStates.delete(from.id);
    await SendTelegramMessage(
      chatID,
      messages.blocked,
      RemoveKeyboard,
    );
    return;
  }

  if (
    user?.status === UserStatusTypes.ACTIVE &&
    user.phone_verified_at &&
    user.registered_at
  ) {
    registrationStates.delete(from.id);
    await ShowMiniApp(
      chatID,
      messages.welcomeBack(user.telegram_first_name || user.fullname),
      language,
    );
    return;
  }

  registrationStates.set(from.id, { step: "full_name", language });
  await HideTelegramMenuButton(chatID);
  await SendTelegramMessage(
    chatID,
    messages.registrationWelcome,
    RemoveKeyboard,
  );
  await SendTelegramMessage(chatID, messages.askFullName);
};

const SaveRegisteredUser = async (
  message: TelegramMessage,
  state: TelegramRegistrationState,
  dateOfBirth: string,
  phoneNumber: string,
) => {
  const from = message.from!;
  const sequelize = UserModel.sequelize!;

  await sequelize.transaction(async (transaction: Transaction) => {
    const users = await UserModel.findAll({
      where: {
        [Op.or]: [{ telegram_id: from.id }, { phone_number: phoneNumber }],
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const byTelegram = users.find((user) => Number(user.telegram_id) === from.id);
    const byPhone = users.find((user) => user.phone_number === phoneNumber);

    if (byTelegram?.status === UserStatusTypes.BLOCKED || byPhone?.status === UserStatusTypes.BLOCKED) {
      throw new Error("USER_BLOCKED");
    }

    if (
      byPhone?.status === UserStatusTypes.ACTIVE &&
      byPhone.phone_verified_at &&
      byPhone.telegram_id !== null &&
      Number(byPhone.telegram_id) !== from.id
    ) {
      throw new Error("PHONE_NUMBER_ALREADY_REGISTERED");
    }

    const now = new Date();
    const language =
      ParseUserLanguage(from.language_code) ?? state.language ?? null;
    const values = {
      telegram_id: from.id,
      telegram_chat_id: String(message.chat.id),
      telegram_username: from.username ?? null,
      telegram_avatar: null,
      telegram_first_name: state.first_name!,
      telegram_last_name: state.last_name!,
      fullname: state.full_name!,
      phone_number: phoneNumber,
      date_of_birth: dateOfBirth,
      status: UserStatusTypes.ACTIVE,
      phone_verified_at: now,
      registered_at: now,
      ...(language ? { language } : {}),
    };

    if (byPhone) {
      if (byTelegram && Number(byTelegram.id) !== Number(byPhone.id)) {
        await byTelegram.update({ telegram_id: null }, { transaction });
      }
      await byPhone.update(values, { transaction });
    } else if (byTelegram) {
      await byTelegram.update(values, { transaction });
    } else {
      await UserModel.create(values, { transaction });
    }
  });
};

const ProcessRegistration = async (
  message: TelegramMessage,
  state: TelegramRegistrationState,
) => {
  const chatID = message.chat.id;
  const telegramID = message.from!.id;
  const text = message.text?.trim();
  const detectedLanguage = ParseUserLanguage(message.from!.language_code);
  const language =
    detectedLanguage ?? state.language ?? UserLanguageTypes.UZ;
  state.language = language;
  const messages = GetTelegramBotMessages(language);
  const contactKeyboard = GetContactKeyboard(language);

  if (state.step === "full_name") {
    const name = ParseFullName(text);
    if (!name) {
      await SendTelegramMessage(
        chatID,
        messages.invalidFullName,
      );
      return;
    }
    Object.assign(state, { step: "date_of_birth", ...name });
    await SendTelegramMessage(
      chatID,
      messages.askDateOfBirth(name.first_name),
    );
    return;
  }

  if (state.step === "date_of_birth") {
    const dateOfBirth = ParseDateOfBirth(text);
    if (!dateOfBirth) {
      await SendTelegramMessage(
        chatID,
        messages.invalidDateOfBirth,
      );
      return;
    }
    Object.assign(state, { step: "phone", date_of_birth: dateOfBirth });
    await SendTelegramMessage(
      chatID,
      messages.askPhone,
      contactKeyboard,
    );
    return;
  }

  const contact = message.contact;
  if (!contact || contact.user_id !== telegramID) {
    await SendTelegramMessage(
      chatID,
      messages.ownContactRequired,
      contactKeyboard,
    );
    return;
  }

  let phoneNumber: string;
  try {
    phoneNumber = NormalizeUzPhoneNumber(contact.phone_number);
  } catch {
    await SendTelegramMessage(
      chatID,
      messages.invalidUzPhone,
      contactKeyboard,
    );
    return;
  }

  try {
    await SaveRegisteredUser(
      message,
      state,
      state.date_of_birth!,
      phoneNumber,
    );
  } catch (error) {
    const messageText =
      error instanceof Error && error.message === "PHONE_NUMBER_ALREADY_REGISTERED"
        ? messages.phoneAlreadyRegistered
        : error instanceof Error && error.message === "USER_BLOCKED"
          ? messages.registrationBlocked
          : messages.registrationError;

    await SendTelegramMessage(chatID, messageText, contactKeyboard);
    return;
  }
  registrationStates.delete(telegramID);
  await ShowMiniApp(
    chatID,
    messages.registrationComplete(state.first_name!),
    language,
  );
};

export const ProcessTelegramUpdate = async (update: TelegramUpdate) => {
  const message = update.message;
  if (!message?.from || message.chat.type !== "private") return;

  if (message.text === "/start" || message.text?.startsWith("/start ")) {
    await StartRegistration(message);
    return;
  }

  const state = registrationStates.get(message.from.id);
  if (!state) {
    const messages = GetTelegramBotMessages(message.from.language_code);
    await SendTelegramMessage(
      message.chat.id,
      messages.noRegistration,
      RemoveKeyboard,
    );
    return;
  }

  await ProcessRegistration(message, state);
};
