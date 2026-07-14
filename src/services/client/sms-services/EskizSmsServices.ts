import axios, { AxiosError } from "axios";

import { InternalServerError } from "../../../exceptions";

const ESKIZ_API_URL = "https://notify.eskiz.uz/api";

interface EskizAuthResponse {
  message?: string;

  data?: {
    token?: string;
  };
}

export interface EskizSmsResponse {
  id?: string | number;
  message?: string;
  status?: string;
  status_code?: number;

  data?: {
    id?: string | number;
    status?: string;
  };
}

let cachedEskizToken: string | null = null;

let eskizLoginPromise: Promise<string> | null = null;

const GetEskizCredentials = () => {
  const email = process.env.ESKIZ_EMAIL;

  const password = process.env.ESKIZ_PASSWORD;

  const sender = process.env.ESKIZ_FROM || "4546";

  if (!email || !password) {
    throw new Error("Eskiz credentials are not configured!");
  }

  return {
    email,
    password,
    sender,
  };
};

const GetEskizErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Unknown Eskiz error";
  }

  const responseData = error.response?.data;

  if (
    responseData &&
    typeof responseData === "object" &&
    "message" in responseData &&
    typeof responseData.message === "string"
  ) {
    return responseData.message;
  }

  return error.message || "Unknown Eskiz request error";
};

const LoginEskiz = async (): Promise<string> => {
  const { email, password } = GetEskizCredentials();

  try {
    const form = new URLSearchParams();

    form.set("email", email);
    form.set("password", password);

    const response = await axios.post<EskizAuthResponse>(
      `${ESKIZ_API_URL}/auth/login`,
      form.toString(),
      {
        timeout: 15_000,

        headers: {
          Accept: "application/json",

          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const token = response.data?.data?.token;

    if (!token) {
      throw new Error("Eskiz access token was not returned!");
    }

    cachedEskizToken = token;

    return token;
  } catch (error) {
    console.error("Eskiz authentication failed:", GetEskizErrorMessage(error));

    throw InternalServerError("ESKIZ_AUTH_FAILED");
  }
};

const GetEskizToken = async (forceRefresh = false): Promise<string> => {
  if (forceRefresh) {
    cachedEskizToken = null;
  }

  if (cachedEskizToken) {
    return cachedEskizToken;
  }

  /*
   * Bir vaqtda bir nechta SMS kelsa,
   * Eskiz login endpointiga ko‘p marta
   * request ketmasligi uchun.
   */
  if (!eskizLoginPromise) {
    eskizLoginPromise = LoginEskiz();
  }

  try {
    return await eskizLoginPromise;
  } finally {
    eskizLoginPromise = null;
  }
};

const SendEskizRequest = async (
  token: string,
  phoneNumber: string,
  message: string,
): Promise<EskizSmsResponse> => {
  const { sender } = GetEskizCredentials();

  const form = new URLSearchParams();

  form.set("mobile_phone", phoneNumber);

  form.set("message", message);
  form.set("from", sender);

  const response = await axios.post<EskizSmsResponse>(
    `${ESKIZ_API_URL}/message/sms/send`,
    form.toString(),
    {
      timeout: 15_000,

      headers: {
        Accept: "application/json",

        Authorization: `Bearer ${token}`,

        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  return response.data;
};

const IsUnauthorizedEskizError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401 || error.response?.status === 403;
};

export const SendEskizSmsService = async (
  phoneNumber: string,
  message: string,
): Promise<EskizSmsResponse> => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    throw InternalServerError("SMS_PHONE_NUMBER_REQUIRED");
  }

  if (!message || typeof message !== "string") {
    throw InternalServerError("SMS_MESSAGE_REQUIRED");
  }

  try {
    const token = await GetEskizToken();

    return await SendEskizRequest(token, phoneNumber, message);
  } catch (error) {
    /*
     * Token tugagan yoki yaroqsiz bo‘lsa,
     * bir marta yangidan login qilib
     * SMS yuborishni qayta sinaymiz.
     */
    if (IsUnauthorizedEskizError(error)) {
      try {
        const refreshedToken = await GetEskizToken(true);

        return await SendEskizRequest(refreshedToken, phoneNumber, message);
      } catch (retryError) {
        console.error(
          "Eskiz SMS retry failed:",
          GetEskizErrorMessage(retryError),
        );

        throw InternalServerError("ESKIZ_SMS_SEND_FAILED");
      }
    }

    console.error("Eskiz SMS send failed:", GetEskizErrorMessage(error));

    throw InternalServerError("ESKIZ_SMS_SEND_FAILED");
  }
};
