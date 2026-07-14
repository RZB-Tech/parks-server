export const AddSeconds = (date: Date, seconds: number): Date => {
  return new Date(date.getTime() + seconds * 1000);
};

export const GetRemainingSeconds = (
  targetDate: Date,
  now = new Date(),
): number => {
  return Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / 1000));
};

export const IsDateInFuture = (
  date: Date | null,
  now = new Date(),
): boolean => {
  if (!date) {
    return false;
  }

  return date.getTime() > now.getTime();
};

export const IsDateExpired = (date: Date, now = new Date()): boolean => {
  return date.getTime() <= now.getTime();
};
