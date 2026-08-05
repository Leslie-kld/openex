ALTER TABLE orders ADD COLUMN filled_quantity DECIMAL(18, 8) NOT NULL DEFAULT 0;

CREATE TABLE trades (
    id UUID PRIMARY KEY,
    buy_order_id UUID NOT NULL REFERENCES orders(id),
    sell_order_id UUID NOT NULL REFERENCES orders(id),
    price DECIMAL(18, 8) NOT NULL CHECK (price > 0),
    quantity DECIMAL(18, 8) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trades_buy_order ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order ON trades(sell_order_id);