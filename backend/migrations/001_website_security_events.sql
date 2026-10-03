CREATE TABLE IF NOT EXISTS website_security_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type VARCHAR(32) NOT NULL,
  client_ip VARCHAR(45) NULL,
  user_email VARCHAR(254) NULL,
  endpoint VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  http_status_code SMALLINT UNSIGNED NULL,
  related_event_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_website_security_events_type_created (event_type, created_at),
  KEY idx_website_security_events_ip_created (client_ip, created_at),
  KEY idx_website_security_events_email_created (user_email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;