-- Add reimbursement_status column to budget_entries table
ALTER TABLE budget_entries 
ADD COLUMN reimbursement_status VARCHAR(20) CHECK (reimbursement_status IN ('pending', 'completed')) DEFAULT 'pending';

-- Update existing records where to_be_reimbursed is true to have pending status
UPDATE budget_entries 
SET reimbursement_status = 'pending' 
WHERE to_be_reimbursed = true;

-- Create index for better performance
CREATE INDEX idx_budget_entries_reimbursement_status ON budget_entries(reimbursement_status);
