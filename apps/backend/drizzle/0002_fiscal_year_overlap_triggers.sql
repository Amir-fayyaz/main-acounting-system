DROP TRIGGER IF EXISTS fiscal_years_no_overlap_insert--> statement-breakpoint
CREATE TRIGGER fiscal_years_no_overlap_insert BEFORE INSERT ON fiscal_years
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE tenant_id = NEW.tenant_id
      AND id <> NEW.id
      AND start_date <= NEW.end_date
      AND end_date >= NEW.start_date
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FISCAL_YEAR_OVERLAP';
  END IF;
END--> statement-breakpoint
DROP TRIGGER IF EXISTS fiscal_years_no_overlap_update--> statement-breakpoint
CREATE TRIGGER fiscal_years_no_overlap_update BEFORE UPDATE ON fiscal_years
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE tenant_id = NEW.tenant_id
      AND id <> NEW.id
      AND start_date <= NEW.end_date
      AND end_date >= NEW.start_date
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FISCAL_YEAR_OVERLAP';
  END IF;
END
