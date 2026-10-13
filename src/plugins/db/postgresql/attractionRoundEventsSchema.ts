import { Sequelize } from "sequelize";

// Database triggers cover all writers, including bulk report recovery in workers.
// PostgreSQL delivers their notifications only after the outer transaction commits.
export const EnsureAttractionRoundEventsSchema = async (sequelize: Sequelize): Promise<void> => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:lockName))", {
      replacements: { lockName: "parks-server:attraction-round-events-schema-v1" }, transaction,
    });
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION parks_notify_attraction_round_change()
      RETURNS trigger LANGUAGE plpgsql AS $function$
      DECLARE change_reason text;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          change_reason := 'round.opened';
        ELSE
          IF (to_jsonb(NEW) - 'updated_at') IS NOT DISTINCT FROM
             (to_jsonb(OLD) - 'updated_at') THEN RETURN NEW; END IF;
          IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text = 'finished' THEN
            change_reason := 'round.closed';
          ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text = 'cancelled' THEN
            change_reason := 'round.cancelled';
          ELSIF NEW.people_count < OLD.people_count THEN
            change_reason := 'round.refunded';
          ELSIF NEW.people_count > OLD.people_count AND NEW.online_count > OLD.online_count THEN
            change_reason := 'payment.client';
          ELSIF NEW.people_count > OLD.people_count THEN
            change_reason := 'payment.operator';
          ELSE
            change_reason := 'round.updated';
          END IF;
        END IF;
        PERFORM pg_notify('parks_attraction_round_events', json_build_object(
          'attraction_id', NEW.attraction, 'operator_id', NEW.operator,
          'round_id', NEW.id, 'reason', change_reason
        )::text);
        RETURN NEW;
      END;
      $function$;

      DROP TRIGGER IF EXISTS parks_attraction_round_change ON attraction_rounds;
      CREATE TRIGGER parks_attraction_round_change
        AFTER INSERT OR UPDATE ON attraction_rounds
        FOR EACH ROW EXECUTE FUNCTION parks_notify_attraction_round_change();

      CREATE OR REPLACE FUNCTION parks_notify_attraction_report_change()
      RETURNS trigger LANGUAGE plpgsql AS $function$
      BEGIN
        IF NEW.report_type::text <> 'xreport' OR NEW.operator IS NULL THEN RETURN NEW; END IF;
        IF TG_OP = 'UPDATE' THEN
          IF NEW.status IS NOT DISTINCT FROM OLD.status AND
             NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN RETURN NEW; END IF;
        END IF;
        PERFORM pg_notify('parks_attraction_round_events', json_build_object(
          'attraction_id', NEW.attraction, 'operator_id', NEW.operator,
          'round_id', NULL, 'reason', 'report.changed'
        )::text);
        RETURN NEW;
      END;
      $function$;

      DROP TRIGGER IF EXISTS parks_attraction_report_change ON attraction_reports;
      CREATE TRIGGER parks_attraction_report_change
        AFTER INSERT OR UPDATE ON attraction_reports
        FOR EACH ROW EXECUTE FUNCTION parks_notify_attraction_report_change();
    `, { transaction });
  });
};
