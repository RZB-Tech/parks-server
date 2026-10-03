import { UserLanguageTypes } from "../../models/postgresql/client/user-model/enums";
import { NormalizeUserLanguage } from "../../utils/client/UserLanguage";

type TelegramBotMessages = {
  blocked: string;
  welcomeBack: (name: string) => string;
  registrationWelcome: string;
  askFullName: string;
  invalidFullName: string;
  askDateOfBirth: (firstName: string) => string;
  invalidDateOfBirth: string;
  askPhone: string;
  ownContactRequired: string;
  invalidUzPhone: string;
  phoneAlreadyRegistered: string;
  registrationBlocked: string;
  registrationError: string;
  registrationComplete: (firstName: string) => string;
  noRegistration: string;
  contactButton: string;
  menuButton: string;
};

export const TelegramBotTranslations: Record<
  UserLanguageTypes,
  TelegramBotMessages
> = {
  [UserLanguageTypes.UZ]: {
    blocked:
      "Akkauntga kirish vaqtincha cheklangan. Vaziyatni aniqlashtirish uchun yordam xizmatimizga murojaat qiling.",
    welcomeBack: (name) =>
      `Sizni yana ko‘rib turganimizdan xursandmiz, ${name}! 🎡\n\nHammasi tayyor — Central Park ilovasini oching va yangi taassurotlarni tanlang.`,
    registrationWelcome:
      "Central Park’ka xush kelibsiz! 🎡\n\nSevimli attraksionlar, yorqin taassurotlar va butun oila uchun hordiq — barchasi bitta ilovada. Ro‘yxatdan o‘tish bir daqiqadan kam vaqt oladi.",
    askFullName:
      "Tanishishni boshlaymiz: ism va familiyangizni bitta xabarda yozing.\n\nMasalan: Ali Valiyev.",
    invalidFullName:
      "Ism yoki familiyada xatolik bor. Iltimos, ularni to‘liq yozing.\n\nMasalan: Ali Valiyev.",
    askDateOfBirth: (firstName) =>
      `Tanishganimdan xursandman, ${firstName}! 😊\n\nTug‘ilgan sanangizni KK.OO.YYYY formatida kiriting.\n\nMasalan: 15.08.1995.`,
    invalidDateOfBirth:
      "Sanani aniqlab bo‘lmadi. Tekshirib, KK.OO.YYYY formatida qayta yuboring.\n\nMasalan: 15.08.1995.",
    askPhone:
      "Deyarli tayyor! Faqat bitta qadam qoldi. 📱\n\nTelefon raqamingizni xavfsiz yuborish uchun quyidagi «Telefon raqamini yuborish 📱» tugmasini bosing.",
    ownContactRequired:
      "Akkaunt xavfsizligi uchun aynan o‘zingizning raqamingizni yuborishingiz kerak. Iltimos, quyidagi tugmadan foydalaning.",
    invalidUzPhone:
      "Hozircha ro‘yxatdan o‘tish faqat O‘zbekiston raqamlari uchun mavjud. Iltimos, quyidagi tugma orqali to‘g‘ri raqam yuboring.",
    phoneAlreadyRegistered:
      "Bu raqam boshqa Telegram akkauntiga bog‘langan. Agar raqam sizniki bo‘lsa, yordam xizmati kirishni tiklashga yordam beradi.",
    registrationBlocked:
      "Akkauntga kirish vaqtincha cheklangan. Iltimos, yordam xizmatiga murojaat qiling.",
    registrationError:
      "Nimadir xato ketdi, ammo ma’lumotlaringiz yo‘qolmadi. Raqamni qayta yuboring yoki ro‘yxatdan o‘tishni yangidan boshlash uchun /start ni bosing.",
    registrationComplete: (firstName) =>
      `Tayyor, ${firstName}! 🎉\n\nCentral Park’ka xush kelibsiz — yorqin taassurotlar olami siz uchun ochiq. Xabar yozish maydoni yonidagi menyu tugmasi orqali ilovani oching!`,
    noRegistration:
      "Central Park’ka xush kelibsiz! 🎡\n\n/start ni bosing — ro‘yxatdan o‘tish bir daqiqadan kam vaqt oladi va parkning barcha imkoniyatlari ochiladi.",
    contactButton: "Telefon raqamini yuborish 📱",
    menuButton: "Central Parkni ochish",
  },
  [UserLanguageTypes.RU]: {
    blocked:
      "Доступ к аккаунту временно ограничен. Наша служба поддержки поможет разобраться — пожалуйста, свяжитесь с нами.",
    welcomeBack: (name) =>
      `Рады видеть вас снова, ${name}! 🎡\n\nВсё готово — открывайте Central Park и выбирайте новые впечатления.`,
    registrationWelcome:
      "Добро пожаловать в Central Park! 🎡\n\nЛюбимые аттракционы, яркие эмоции и отдых для всей семьи — всё в одном приложении. Регистрация займёт меньше минуты.",
    askFullName:
      "Начнём знакомство: напишите ваши имя и фамилию одним сообщением.\n\nНапример: Иван Петров.",
    invalidFullName:
      "Кажется, в имени есть опечатка. Пожалуйста, напишите имя и фамилию полностью.\n\nНапример: Иван Петров.",
    askDateOfBirth: (firstName) =>
      `Приятно познакомиться, ${firstName}! 😊\n\nУкажите дату рождения в формате ДД.ММ.ГГГГ.\n\nНапример: 15.08.1995.`,
    invalidDateOfBirth:
      "Не удалось распознать дату. Проверьте её и отправьте в формате ДД.ММ.ГГГГ.\n\nНапример: 15.08.1995.",
    askPhone:
      "Почти готово! Остался один шаг. 📱\n\nЧтобы безопасно отправить номер телефона, нажмите кнопку «Поделиться номером 📱» ниже.",
    ownContactRequired:
      "Для безопасности аккаунта необходимо отправить именно ваш номер. Пожалуйста, воспользуйтесь кнопкой ниже.",
    invalidUzPhone:
      "Сейчас регистрация доступна для номеров Узбекистана. Пожалуйста, отправьте корректный номер с помощью кнопки ниже.",
    phoneAlreadyRegistered:
      "Этот номер уже привязан к другому Telegram-аккаунту. Если это ваш номер, служба поддержки поможет быстро восстановить доступ.",
    registrationBlocked:
      "Доступ к аккаунту временно ограничен. Пожалуйста, обратитесь в службу поддержки.",
    registrationError:
      "Что-то пошло не так, но ваши данные не потеряны. Попробуйте отправить номер ещё раз или нажмите /start, чтобы начать заново.",
    registrationComplete: (firstName) =>
      `Готово, ${firstName}! 🎉\n\nДобро пожаловать в Central Park — ваш мир ярких эмоций уже открыт. Откройте приложение с помощью кнопки меню слева от поля ввода и выбирайте развлечения!`,
    noRegistration:
      "Добро пожаловать в Central Park! 🎡\n\nНажмите /start — регистрация займёт меньше минуты, и все возможности парка станут доступны.",
    contactButton: "Поделиться номером 📱",
    menuButton: "Открыть Central Park",
  },
  [UserLanguageTypes.EN]: {
    blocked:
      "Access to your account is temporarily restricted. Please contact our support team for assistance.",
    welcomeBack: (name) =>
      `Welcome back, ${name}! 🎡\n\nEverything is ready — open Central Park and choose your next adventure.`,
    registrationWelcome:
      "Welcome to Central Park! 🎡\n\nFavorite attractions, bright emotions, and fun for the whole family — all in one app. Registration takes less than a minute.",
    askFullName:
      "Let’s get acquainted: send your first and last name in one message.\n\nFor example: John Smith.",
    invalidFullName:
      "There seems to be a typo in the name. Please enter your full first and last name.\n\nFor example: John Smith.",
    askDateOfBirth: (firstName) =>
      `Nice to meet you, ${firstName}! 😊\n\nEnter your date of birth in DD.MM.YYYY format.\n\nFor example: 15.08.1995.`,
    invalidDateOfBirth:
      "The date could not be recognized. Check it and send it in DD.MM.YYYY format.\n\nFor example: 15.08.1995.",
    askPhone:
      "Almost done! Just one step left. 📱\n\nTo share your phone number securely, tap the “Share phone number 📱” button below.",
    ownContactRequired:
      "For account security, you must share your own phone number. Please use the button below.",
    invalidUzPhone:
      "Registration is currently available for Uzbekistan phone numbers. Please share a valid number using the button below.",
    phoneAlreadyRegistered:
      "This number is already linked to another Telegram account. If it belongs to you, our support team can help restore access.",
    registrationBlocked:
      "Access to your account is temporarily restricted. Please contact our support team.",
    registrationError:
      "Something went wrong, but your information was not lost. Send the number again or press /start to restart registration.",
    registrationComplete: (firstName) =>
      `All set, ${firstName}! 🎉\n\nWelcome to Central Park — your world of bright experiences is now open. Use the menu button next to the message field to open the app!`,
    noRegistration:
      "Welcome to Central Park! 🎡\n\nPress /start — registration takes less than a minute and unlocks all park features.",
    contactButton: "Share phone number 📱",
    menuButton: "Open Central Park",
  },
};

export const GetTelegramBotMessages = (languageCode: unknown) =>
  TelegramBotTranslations[NormalizeUserLanguage(languageCode)];
