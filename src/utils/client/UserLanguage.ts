import { UserLanguageTypes } from "../../models/postgresql/client/user-model/enums";

export const ParseUserLanguage = (
  languageCode: unknown,
): UserLanguageTypes | null => {
  const language = String(languageCode ?? "")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  if (language === UserLanguageTypes.RU) return UserLanguageTypes.RU;
  if (language === UserLanguageTypes.EN) return UserLanguageTypes.EN;
  if (language === UserLanguageTypes.UZ) return UserLanguageTypes.UZ;
  return null;
};

export const NormalizeUserLanguage = (languageCode: unknown) =>
  ParseUserLanguage(languageCode) ?? UserLanguageTypes.UZ;
