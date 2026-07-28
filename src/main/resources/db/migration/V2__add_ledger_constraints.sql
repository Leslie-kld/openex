ALTER TABLE ledger_entries ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE ledger_entries ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);
ALTER TABLE ledger_entries ADD CONSTRAINT chk_direction_valid CHECK (direction IN ('CREDIT', 'DEBIT'));