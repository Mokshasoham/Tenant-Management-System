export default {
  flags: {
    LEASE_RENEWAL: {
      enabled: process.env.LEASE_RENEWAL_ENABLED !== 'false',
      expiresAt: '2026-12-31',
      description: 'Enables Lease Renewal SaaS capabilities',
      owner: 'Lease Operations Team'
    },
    AI_OPERATIONS: {
      enabled: process.env.AI_ENABLED === 'true',
      expiresAt: '2026-12-31',
      description: 'Enables AI Property Operation Assistant features',
      owner: 'Product Team'
    },
    PAYMENTS_AUTOMATION: {
      enabled: process.env.PAYMENTS_ENABLED !== 'false',
      expiresAt: '2026-12-31',
      description: 'Enables Stripe payment collections billing processes',
      owner: 'Billing Operations Team'
    }
  }
};
