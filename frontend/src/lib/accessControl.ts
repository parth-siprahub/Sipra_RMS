/**
 * Centralised access-control constants for page-level permission checks.
 *
 * Keep in sync with backend BILLING_AUTH_EMAILS in:
 *   backend/app/billing_config/router.py
 */

export const BILLING_CONFIG_EMAILS = new Set([
    'jaicind@siprahub.com',
    'sreenath.reddy@siprahub.com',
    'rajapv@siprahub.com',
]);
