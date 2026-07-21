export type PromotionTemporalStatus = "planned" | "active" | "archived";

export type PromotionTransitionReason =
  | "waiting_start"
  | "inside_active_period"
  | "waiting_next_session"
  | "promotion_finished"
  | "manually_archived"
  | "promotion_not_found";

export interface PromotionLifecycleState {
  exists: boolean;

  next_status: PromotionTemporalStatus;

  /*
   * Workflow shu holatdan keyin tugaydimi?
   */
  terminal: boolean;

  /*
   * Keyingi tekshiruv vaqti.
   * ACTIVE bo‘lsa end time.
   * PLANNED bo‘lsa next start time.
   */
  next_transition_at: string | null;

  reason: PromotionTransitionReason;
}
