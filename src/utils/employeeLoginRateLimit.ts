import { TooManyRequests } from "../exceptions";

const EMPLOYEE_LOGIN_ATTEMPT_LIMIT = 10;
const EMPLOYEE_LOGIN_WINDOW_MS = 15 * 60 * 1000;

type EmployeeLoginAttempt = {
  count: number;
  expiresAt: number;
};

const attemptsByIP = new Map<string, EmployeeLoginAttempt>();

const CleanupExpiredAttempts = (now: number) => {
  if (attemptsByIP.size < 10_000) return;

  for (const [key, attempt] of attemptsByIP.entries()) {
    if (attempt.expiresAt <= now) attemptsByIP.delete(key);
  }
};

export const AssertEmployeeLoginAllowed = (ip: string) => {
  const attempt = attemptsByIP.get(ip);

  if (!attempt || attempt.expiresAt <= Date.now()) {
    attemptsByIP.delete(ip);
    return;
  }

  if (attempt.count >= EMPLOYEE_LOGIN_ATTEMPT_LIMIT) {
    throw TooManyRequests("EMPLOYEE_LOGIN_TOO_MANY_ATTEMPTS");
  }
};

export const RegisterEmployeeLoginFailure = (ip: string) => {
  const now = Date.now();
  CleanupExpiredAttempts(now);
  const attempt = attemptsByIP.get(ip);

  if (!attempt || attempt.expiresAt <= now) {
    attemptsByIP.set(ip, {
      count: 1,
      expiresAt: now + EMPLOYEE_LOGIN_WINDOW_MS,
    });
    return;
  }

  attempt.count += 1;
};

export const ClearEmployeeLoginFailures = (ip: string) => {
  attemptsByIP.delete(ip);
};
