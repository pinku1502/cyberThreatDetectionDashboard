-- Multi-tenant security control plane.
-- Run after 001_website_security_events.sql.

CREATE TABLE IF NOT EXISTS dashboard_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SUPER_ADMIN', 'SITE_ADMIN', 'ANALYST', 'CLIENT') NOT NULL DEFAULT 'CLIENT',
  status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dashboard_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitored_websites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  base_url VARCHAR(2048) NOT NULL,
  authorization_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('ACTIVE', 'PAUSED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_monitored_websites_status (status),
  CONSTRAINT fk_monitored_websites_creator
    FOREIGN KEY (created_by) REFERENCES dashboard_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS website_memberships (
  website_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('SITE_ADMIN', 'ANALYST', 'CLIENT') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (website_id, user_id),
  KEY idx_website_memberships_user (user_id),
  CONSTRAINT fk_website_memberships_website
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE,
  CONSTRAINT fk_website_memberships_user
    FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS website_ingest_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  website_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(120) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  token_last4 CHAR(4) NOT NULL,
  revoked_at TIMESTAMP NULL,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_website_ingest_tokens_hash (token_hash),
  KEY idx_website_ingest_tokens_website (website_id),
  CONSTRAINT fk_website_ingest_tokens_website
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE website_security_events
  ADD COLUMN website_id BIGINT UNSIGNED NULL,
  ADD KEY idx_website_security_events_website_created (website_id, created_at);

ALTER TABLE prediction_logs
  ADD COLUMN website_id BIGINT UNSIGNED NULL,
  ADD KEY idx_prediction_logs_website_created (website_id, created_at);

CREATE TABLE IF NOT EXISTS security_alerts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  website_id BIGINT UNSIGNED NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
  title VARCHAR(200) NOT NULL,
  details JSON NULL,
  status ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_security_alerts_website_status (website_id, status, last_seen_at),
  CONSTRAINT fk_security_alerts_website
    FOREIGN KEY (website_id) REFERENCES monitored_websites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;