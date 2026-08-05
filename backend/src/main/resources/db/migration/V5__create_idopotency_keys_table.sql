CREATE TABLE idempotency_keys (
    key VARCHAR(100) PRIMARY KEY,
    response_body TEXT NOT NULL,
    response_status INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);