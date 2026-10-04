/**
 * ============================================================================
 * DEVELOPER CONFIGURATION: Monitored Websites & Owner Login Accounts
 * ============================================================================
 *
 * Each website has an owner email and password defined here in the code.
 * When the website owner logs in with their email & password, the dashboard
 * opens directly for monitoring their website and NOTHING ELSE.
 *
 * All traffic and threat data is 100% REAL telemetry reported from the website.
 * ============================================================================
 */

const MONITORED_WEBSITES = [
  {
    code: "NEXAORANOTES",
    name: "NexaoraNotes",
    base_url: "http://localhost:8000",
    owner_email: "nexaoranotes@gmail.com",
    owner_password: "password123",
    owner_name: "NexaoraNotes",
    is_self: false,
    status: "ACTIVE",
  },
  {
    code: "CYBERSHIELD_SELF",
    name: "CyberShield (This Website)",
    base_url: "http://localhost:5173",
    owner_email: "admin@cybershield.com",
    owner_password: "Admin@123456",
    owner_name: "CyberShield Admin",
    is_self: true,
    status: "ACTIVE",
  },
  {
    code: "ADMIN_LOCAL",
    name: "Cyber Threat Detection Platform",
    base_url: "http://localhost:5000",
    owner_email: "admin@cyberthreat.local",
    owner_password: "Admin@123456",
    owner_name: "Platform Admin",
    is_self: true,
    status: "ACTIVE",
  },
];

module.exports = MONITORED_WEBSITES;
