-- Create events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  allocated_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  venue VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) CHECK (status IN ('Active', 'Completed', 'On Hold', 'Cancelled')) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('Income', 'Expense')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget entries table
CREATE TABLE budget_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(100),
  receipt_photo_url VARCHAR(500),
  receipt_filename VARCHAR(255),
  to_be_reimbursed BOOLEAN DEFAULT FALSE,
  reimbursement_source VARCHAR(255),
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_categories_event_id ON categories(event_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_budget_entries_event_id ON budget_entries(event_id);
CREATE INDEX idx_budget_entries_category_id ON budget_entries(category_id);
CREATE INDEX idx_budget_entries_entry_date ON budget_entries(entry_date);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - adjust based on your auth requirements)
CREATE POLICY "Allow all operations on events" ON events FOR ALL USING (true);
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on budget_entries" ON budget_entries FOR ALL USING (true);
