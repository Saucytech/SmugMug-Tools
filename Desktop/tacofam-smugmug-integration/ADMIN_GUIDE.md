# Smugtools Admin Guide

Administrator's guide to platform management, user administration, and system monitoring.

---

## Accessing Admin Dashboard

**URL**: `/admin`

**Requirements**:
- User account with `role = 'admin'` in database
- Active authenticated session (logged in)

**Default Admin**:
- First user created, or
- Manually set in database: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';`

---

## Admin Dashboard Overview

The admin dashboard (`/admin`) provides comprehensive platform analytics and management tools.

### Key Metrics Displayed

**Platform Statistics**:
- **Total Users**: Count of all registered users
- **Total AI Operations**: Lifetime AI API calls across all users
- **Total Coins Granted**: Bonus coins given by admins
- **Total Coins Used**: Aggregate AI spending
- **Active Users**: Users with activity in last 30 days
- **Revenue**: Total Stripe payments (if configured)

**Recent Activity**:
- Latest user registrations (last 10)
- Recent AI operations (last 20)
- Recent coin transactions (last 15)
- Failed operations (errors, issues)

**System Health**:
- Database connection status
- SmugMug API status
- Anthropic API status
- Stripe webhook status

---

## User Management

### View All Users

**Location**: `/admin` → Users tab

**User List Displays**:
- Email address
- Full name
- Role (admin/user)
- Coin balance
- Created date
- Last login
- AI operations count
- Total coins spent

**Actions Per User**:
- View details
- Grant bonus coins
- Change role (via database)
- View activity log
- Disable account (via database)

### Grant Bonus Coins

**Purpose**: Give free coins to users for testing, compensation, or promotions

**Steps**:
1. Click user's coin balance in dashboard
2. Modal dialog opens
3. Enter coin amount to grant
4. Enter description (required)
   - Examples:
     - "Welcome bonus for new user"
     - "Compensation for service issue"
     - "Beta testing reward"
     - "Promotional credit"
5. Click "Grant Coins"
6. Transaction recorded in `coin_transactions` table
7. User's balance updated immediately

**Use Cases**:
- **Welcome bonuses**: 100 coins for new signups
- **Compensation**: Refund coins for failed operations
- **Promotions**: Holiday/seasonal giveaways
- **Beta testing**: Reward testers with free coins
- **Referrals**: Bonus for user referrals

**Best Practices**:
- Always include descriptive reason
- Document large grants (>500 coins)
- Track promotion effectiveness
- Set limits for each promotion type

### Change User Roles

**Warning**: Requires direct database access

**To Promote User to Admin**:
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

**To Demote Admin to User**:
```sql
UPDATE users SET role = 'user' WHERE email = 'admin@example.com';
```

**Role Permissions**:

| Permission | User | Admin |
|------------|------|-------|
| Use all 8 tools | ✅ | ✅ |
| Purchase coins | ✅ | ✅ |
| View own analytics | ✅ | ✅ |
| Access `/admin` | ❌ | ✅ |
| Grant bonus coins | ❌ | ✅ |
| Change tool states | ❌ | ✅ |
| View all users | ❌ | ✅ |
| View platform analytics | ❌ | ✅ |

### User Activity Logs

**View User Activity**:
1. Click user email in dashboard
2. Activity panel shows:
   - All AI operations with timestamps
   - Coin transactions history
   - Login/logout events
   - SmugMug connection status
   - Last tool used

**Use Cases**:
- Troubleshooting user issues
- Analyzing usage patterns
- Identifying power users
- Detecting abuse

---

## Tool State Management

**URL**: `/admin/tools`

### Tool States Explained

**Three States**:

#### ON (Green Button)
- **Appearance**: Tool visible on homepage with full colors
- **Behavior**: Fully functional, users can click and access
- **Use When**: Tool is production-ready and working
- **User Experience**: Normal access, no restrictions

#### DISABLED (Yellow Button)
- **Appearance**: Tool visible but grayed out on homepage
- **Behavior**: Not clickable, hover shows disabled message
- **Use When**: Tool temporarily unavailable (maintenance, bugs)
- **User Experience**: See tool exists but cannot access, see reason

#### OFF (Red Button)
- **Appearance**: Tool completely hidden from homepage
- **Behavior**: Not rendered, users cannot see it exists
- **Use When**: Tool deprecated, removed, or long-term disabled
- **User Experience**: Tool doesn't exist for them

### Changing Tool States

**UI Method** (`/admin/tools`):
1. Navigate to Tool State Management
2. Find tool in list
3. Current state shown with colored button
4. Click button to toggle:
   - Green → Yellow → Red → Green (cycles)
5. Confirm change
6. State updates immediately for all users

**Database Method**:
```sql
UPDATE tool_states
SET status = 'disabled'
WHERE tool_id = 'metadata-monster';
```

### Custom Disabled Messages

**Purpose**: Communicate why tool is disabled

**Default Message**:
"This feature is temporarily disabled and will return soon."

**Custom Message Examples**:
- "Upgrading AI model - back in 2 hours"
- "Maintenance in progress - check back tomorrow"
- "Coming soon! Expected launch: March 2025"
- "Fixing bug - see #123 for updates"

**How to Set Custom Message**:
```sql
UPDATE tool_states
SET disabled_message = 'Fixing critical bug - estimated 4 hours'
WHERE tool_id = 'metadata-monster';
```

### Tool State Strategy

**Planned Maintenance**:
1. One day before: Announce in UI (banner)
2. During maintenance: Set to DISABLED with ETA
3. After fix: Test thoroughly
4. Set back to ON

**Bug Discovery**:
1. Immediately set to DISABLED
2. Custom message with ticket number
3. Fix bug in development
4. Test on staging
5. Set back to ON

**New Tool Launch**:
1. Develop tool with status OFF (hidden)
2. Beta test with status DISABLED (visible but not accessible)
3. Soft launch: ON for admins only
4. Full launch: ON for all users

**Feature Sunset**:
1. Month 1: Announce deprecation in UI
2. Month 2: Set to DISABLED with migration info
3. Month 3: Set to OFF
4. Month 4: Remove code (optional)

---

## AI Operations Monitoring

### AI Operations Table

**Location**: `/admin` → AI Operations tab

**Data Displayed**:
- User email
- Tool used (MetaData Monster, etc.)
- Operation type (metadata generation, etc.)
- Tokens consumed (Anthropic usage)
- Coin cost
- Status (pending/completed/failed)
- Error message (if failed)
- Timestamp
- Duration

**Filters**:
- By user
- By tool
- By status
- By date range

**Export Options**:
- CSV download
- JSON export
- PDF report

### Analytics

**Usage Metrics**:
- Total operations by tool
- Average tokens per operation
- Success rate percentage
- Peak usage times
- Most active users

**Cost Analysis**:
- Anthropic API cost (tokens → dollars)
- Coin revenue (purchases)
- Coin costs (usage)
- Profit margin per operation
- Break-even analysis

**Performance Metrics**:
- Average operation duration
- Error rate by tool
- Timeout frequency
- Retry rate

### Identifying Issues

**High Error Rate**:
- **Symptom**: >10% failed operations
- **Possible Causes**:
  - Anthropic API issues
  - Invalid image URLs
  - Timeout problems
  - Rate limiting
- **Actions**:
  - Check Anthropic API status
  - Review error messages
  - Adjust timeout settings
  - Contact Anthropic support

**Unusual Token Usage**:
- **Symptom**: Tokens per operation suddenly spike
- **Possible Causes**:
  - Anthropic model change
  - Prompt length increased
  - User sending huge images
- **Actions**:
  - Review recent code changes
  - Check user's operation details
  - Adjust coin pricing if needed

**Coin Economy Imbalance**:
- **Symptom**: Usage exceeds purchases
- **Possible Causes**:
  - Coin pricing too low
  - Excessive bonus coin grants
  - Abuse/fraud
- **Actions**:
  - Review grant history
  - Adjust coin package pricing
  - Implement usage limits
  - Investigate suspicious accounts

---

## Platform Health Monitoring

### Key Metrics to Watch

**Daily Checks**:
- [ ] Active users (trend up = growth)
- [ ] Error rate (keep below 5%)
- [ ] Coin balance (purchases > usage)
- [ ] New signups (marketing effectiveness)

**Weekly Checks**:
- [ ] Revenue trends
- [ ] Most popular tools
- [ ] Average AI operations per user
- [ ] Database size growth

**Monthly Checks**:
- [ ] User retention rate
- [ ] Churn analysis
- [ ] Tool usage distribution
- [ ] Feature requests trends

### Warning Signs

**🚨 Critical Alerts**:
- Error rate >20%
- Database connection failures
- Stripe webhook failures
- No new signups for 7 days
- Anthropic API key invalid

**⚠️ Warning Signals**:
- Error rate >10%
- Coin usage exceeding purchases by 2x
- Single user consuming >50% of AI operations
- Tool state changes without admin action

**ℹ️ Optimization Opportunities**:
- Tool consistently disabled (remove?)
- Low usage tool (<1% of operations)
- High-cost operations (can we optimize?)

---

## Database Management

### Database Access

**Neon Console**: neon.tech
**Connection String**: `$DATABASE_URL_UNPOOLED` (for direct queries)

**Recommended Tools**:
- Neon SQL Editor (web-based)
- psql (command-line)
- DBeaver (GUI)
- pgAdmin (GUI)

### Common Admin Queries

**Find High-Usage Users**:
```sql
SELECT
  u.email,
  COUNT(ao.id) as operation_count,
  SUM(ao.cost_in_coins) as total_coins_used
FROM users u
JOIN ai_operations ao ON u.id = ao.user_id
WHERE ao.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.email
ORDER BY total_coins_used DESC
LIMIT 10;
```

**Coin Economy Health Check**:
```sql
SELECT
  SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as coins_purchased,
  SUM(CASE WHEN type = 'usage' THEN amount ELSE 0 END) as coins_spent,
  SUM(CASE WHEN type = 'bonus' THEN amount ELSE 0 END) as coins_granted
FROM coin_transactions;
```

**Failed Operations Report**:
```sql
SELECT
  u.email,
  ao.tool_name,
  ao.error_message,
  ao.created_at
FROM ai_operations ao
JOIN users u ON ao.user_id = u.id
WHERE ao.status = 'failed'
  AND ao.created_at > NOW() - INTERVAL '7 days'
ORDER BY ao.created_at DESC;
```

**Tool State History**:
```sql
SELECT
  tool_id,
  tool_name,
  status,
  updated_at
FROM tool_states
ORDER BY updated_at DESC;
```

**User Growth Trend**:
```sql
SELECT
  DATE(created_at) as signup_date,
  COUNT(*) as new_users
FROM users
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date;
```

### Backup Strategy

**Neon Automatic Backups**:
- Daily automatic snapshots
- 7-day retention (free tier)
- 30-day retention (paid tier)
- Point-in-time recovery available

**Manual Backup**:
```bash
pg_dump $DATABASE_URL_UNPOOLED > backup_$(date +%Y%m%d).sql
```

**Restoration** (if needed):
1. Access Neon dashboard
2. Navigate to Backups section
3. Select restore point
4. Create new branch from backup
5. Verify data integrity
6. Update DATABASE_URL to restored branch

---

## Stripe Integration (Payments)

### Setup Checklist

- [ ] Stripe account created
- [ ] API keys added to environment variables
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to environment
- [ ] Test mode working
- [ ] Production mode activated
- [ ] Coin packages configured

### Webhook Configuration

**Webhook URL**: `https://your-domain.com/api/stripe/webhook`

**Events to Listen For**:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created` (future)
- `customer.subscription.deleted` (future)

**Testing Webhooks**:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Monitoring Payments

**Stripe Dashboard**: dashboard.stripe.com

**Key Metrics**:
- Total revenue
- Successful payments
- Failed payments
- Refund rate
- Popular packages

**Database Tracking**:
```sql
SELECT
  ct.reference_id as stripe_payment_id,
  u.email,
  ct.amount as coins_purchased,
  ct.created_at
FROM coin_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE ct.type = 'purchase'
ORDER BY ct.created_at DESC
LIMIT 20;
```

### Handling Refunds

**Process**:
1. User requests refund
2. Review case (terms of service)
3. Issue refund in Stripe dashboard
4. Manually deduct coins from user account:
```sql
-- First check current balance
SELECT coin_balance FROM users WHERE email = 'user@example.com';

-- Deduct coins (if they haven't spent them yet)
UPDATE users
SET coin_balance = coin_balance - 1000
WHERE email = 'user@example.com';

-- Record refund transaction
INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
SELECT id, -1000, 'refund', 'Refund for purchase #ch_xxx', 'ch_xxx'
FROM users WHERE email = 'user@example.com';
```

---

## Security Administration

### Admin Access Control

**Best Practices**:
- [ ] Use strong passwords (16+ characters)
- [ ] Enable 2FA (if implemented)
- [ ] Don't share admin credentials
- [ ] Log out after admin sessions
- [ ] Review admin action logs regularly

**Revoking Admin Access**:
```sql
UPDATE users SET role = 'user' WHERE email = 'former-admin@example.com';
```

### User Data Protection

**Encryption**:
- SmugMug tokens: AES-256-CBC encrypted
- Passwords: bcrypt hashed (10 rounds)
- Sessions: HTTP-only cookies

**Data Access Rules**:
- Admins cannot see user passwords (hashed)
- Admins cannot see raw SmugMug tokens (encrypted)
- Admins can see usage patterns (analytics)
- Admins can grant coins but not steal them

**Audit Trail**:
```sql
SELECT
  ct.description,
  ct.amount,
  ct.type,
  ct.created_at,
  u.email as admin_email
FROM coin_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE ct.type = 'bonus'
ORDER BY ct.created_at DESC;
```

### Security Incident Response

**Suspected Breach**:
1. **Immediately**: Rotate ENCRYPTION_KEY
2. **Immediately**: Force logout all users (clear sessions table)
3. **Within 1 hour**: Review access logs
4. **Within 4 hours**: Notify affected users
5. **Within 24 hours**: Implement additional security measures
6. **Within 7 days**: Post-mortem and prevention plan

**Rotation Procedure**:
1. Generate new ENCRYPTION_KEY
2. Decrypt all tokens with old key
3. Re-encrypt with new key
4. Update environment variable
5. Deploy new code
6. Verify all integrations working

---

## Maintenance Tasks

### Daily Tasks (5 minutes)
- [ ] Check error rate in dashboard
- [ ] Review failed AI operations
- [ ] Monitor Stripe payments (if any)
- [ ] Check for user support emails

### Weekly Tasks (30 minutes)
- [ ] Review tool usage metrics
- [ ] Analyze coin economy health
- [ ] Check database size growth
- [ ] Review and respond to feature requests
- [ ] Update tool states if needed

### Monthly Tasks (2 hours)
- [ ] User growth analysis
- [ ] Revenue vs cost analysis
- [ ] Database performance review
- [ ] Security audit (access logs)
- [ ] Backup verification
- [ ] Plan feature roadmap based on requests

### Quarterly Tasks (1 day)
- [ ] Comprehensive platform audit
- [ ] Review all tool states and usage
- [ ] Analyze churn rate
- [ ] Update pricing if needed
- [ ] Review and update documentation
- [ ] Plan major features for next quarter

---

## Troubleshooting Common Issues

### Platform Down

**Symptoms**: No users can access site

**Checks**:
1. Vercel deployment status (vercel.com/dashboard)
2. Neon database status (neon.tech/dashboard)
3. DNS configuration
4. SSL certificate validity

**Actions**:
1. Check Vercel logs for errors
2. Verify environment variables set
3. Test database connection
4. Roll back to previous deployment if needed

### Users Can't Login

**Symptoms**: Login fails with error

**Checks**:
1. Database connection working?
2. NextAuth configured correctly?
3. Session cookies being set?

**Actions**:
```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'user@example.com';

-- Check sessions
SELECT * FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');

-- Reset password if needed (generate hash first)
UPDATE users SET password_hash = '$2a$10$...' WHERE email = 'user@example.com';
```

### Users Can't Connect SmugMug

**Symptoms**: OAuth flow fails

**Checks**:
1. SmugMug API keys valid?
2. Callback URL correct?
3. Encryption key set?

**Actions**:
1. Verify SMUGMUG_API_KEY and SMUGMUG_API_SECRET
2. Check callback matches: `https://your-domain.com/api/auth/smugmug/callback`
3. Test with fresh OAuth flow
4. Review SmugMug API status page

### AI Operations Failing

**Symptoms**: High error rate for AI tools

**Checks**:
1. Anthropic API key valid?
2. API rate limits exceeded?
3. User has enough coins?

**Actions**:
```sql
-- Check recent errors
SELECT error_message, COUNT(*) as count
FROM ai_operations
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY error_message;
```

1. Verify ANTHROPIC_API_KEY in environment
2. Check Anthropic dashboard for rate limits
3. Review error messages for patterns
4. Contact Anthropic support if API issue

### Stripe Webhooks Not Working

**Symptoms**: Coins not credited after purchase

**Checks**:
1. Webhook endpoint responding?
2. Webhook secret correct?
3. Events being sent from Stripe?

**Actions**:
1. Check Vercel logs for webhook requests
2. Verify STRIPE_WEBHOOK_SECRET matches Stripe dashboard
3. Use `stripe listen` to test locally
4. Manually credit coins if needed:
```sql
INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
VALUES ((SELECT id FROM users WHERE email = 'user@example.com'), 1000, 'purchase', 'Manual credit for failed webhook', 'manual_001');

UPDATE users SET coin_balance = coin_balance + 1000 WHERE email = 'user@example.com';
```

---

## Emergency Procedures

### Complete Platform Outage

**Response Time**: Immediate

**Steps**:
1. **0-5 minutes**: Assess scope (Vercel, Neon, both?)
2. **5-10 minutes**: Check status pages (Vercel, Neon, Stripe)
3. **10-20 minutes**: Review recent deployments, roll back if needed
4. **20-30 minutes**: If external service issue, wait for resolution
5. **30+ minutes**: Communicate status to users (Twitter, email, banner)

### Data Loss Incident

**Response Time**: Immediate

**Steps**:
1. **Immediately**: Stop all write operations
2. **Within 5 minutes**: Assess extent of data loss
3. **Within 15 minutes**: Begin restore from Neon backup
4. **Within 30 minutes**: Verify restored data integrity
5. **Within 1 hour**: Resume operations, monitor closely
6. **Within 24 hours**: Root cause analysis, prevent recurrence

### Security Breach

**Response Time**: Immediate

**Steps**:
1. **Immediately**: Isolate affected systems
2. **Immediately**: Rotate all secrets (encryption key, API keys)
3. **Within 15 minutes**: Force logout all users
4. **Within 1 hour**: Assess damage, identify breach vector
5. **Within 4 hours**: Notify affected users
6. **Within 24 hours**: Implement fixes, security hardening
7. **Within 7 days**: Post-mortem, documentation, training

---

## Contact & Escalation

### Support Channels

**Platform Issues**:
- Vercel: vercel.com/support
- Neon: neon.tech/docs/introduction/support
- Anthropic: support@anthropic.com
- Stripe: stripe.com/support

**Emergency Contacts**:
- Primary Admin: [add email]
- Technical Lead: [add email]
- Security Team: [add email]
- Business Contact: [add email]

### Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| P0 (Critical) | 15 minutes | Immediate SMS/call |
| P1 (High) | 1 hour | Email + Slack |
| P2 (Medium) | 4 hours | Email |
| P3 (Low) | 24 hours | Ticket system |

**P0 Examples**: Platform down, data loss, security breach
**P1 Examples**: Major feature broken, payment processing down
**P2 Examples**: Tool disabled, performance degraded
**P3 Examples**: UI bug, minor feature request

---

## Admin Dashboard Power!

As an admin, you have significant responsibility and capability:

**✅ What You Can Do**:
- View all platform analytics
- Monitor all user activity
- Grant bonus coins generously
- Control tool availability
- Access support channels
- Make database changes

**❌ What You Cannot Do**:
- See user passwords (they're hashed)
- Access user SmugMug accounts directly (tokens encrypted)
- Spend users' coins (only grant, not take)
- Guarantee 100% uptime (dependent on external services)

**🎯 Your Mission**:
- Keep platform healthy and secure
- Support users effectively
- Monitor for abuse
- Optimize coin economy
- Plan feature roadmap
- Maintain documentation

**Use your admin power wisely!** 🦸‍♂️

---

**Last Updated**: 2025-10-08

**Admin Guide Version**: 1.0
