declare interface SmsLogModelI {
  id: number;
  phone_number: string;

  type: import("./enums").SmsTypes;
  provider: import("./enums").SmsProviderTypes;
  status: import("./enums").SmsStatusTypes;

  sender: string | null;
  template: string | null;
  message: string | null;

  provider_message_id: string | null;
  attempts: number;

  error_code: string | null;
  error_message: string | null;

  sent_at: Date | null;
  delivered_at: Date | null;
  failed_at: Date | null;

  metadata: Record<string, unknown> | null;
}
