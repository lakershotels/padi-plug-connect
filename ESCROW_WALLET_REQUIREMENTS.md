# PadiPlug Escrow & Wallet System - Production Implementation

This document outlines the complete Escrow & Wallet system that needs to be implemented.

## ✅ Completed Components
- Supabase backend configured
- Flutter app initialized
- Authentication provider
- Basic database schema

## ❌ Missing Components (To Be Built)

### 1. Database Schema (Complete)
```sql
-- Wallets
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) DEFAULT 0,
  available_balance DECIMAL(15, 2) DEFAULT 0,
  escrow_balance DECIMAL(15, 2) DEFAULT 0,
  pending_balance DECIMAL(15, 2) DEFAULT 0,
  total_withdrawn DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallet Transactions
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'REFUND', 'ESCROW_IN', 'ESCROW_OUT')),
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'reversed')),
  payment_method TEXT,
  reference_id TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id),
  wallet_id UUID REFERENCES wallets(id),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'VIRTUAL_ACCOUNT')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
  provider TEXT,
  provider_transaction_id TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  product_id UUID,
  quantity INT DEFAULT 1,
  total_amount DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'wallet_funded', 'paid', 'funds_in_escrow',
    'seller_accepted', 'processing', 'shipped', 'waiting_confirmation',
    'completed', 'dispute_open', 'refunded', 'cancelled'
  )),
  delivery_deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Escrow Transactions
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed')),
  escrow_id TEXT UNIQUE,
  transaction_id TEXT UNIQUE,
  locked_at TIMESTAMP DEFAULT NOW(),
  released_at TIMESTAMP,
  release_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  escrow_id UUID REFERENCES escrow_transactions(id),
  customer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  customer_evidence JSONB,
  seller_response TEXT,
  admin_decision TEXT,
  admin_id UUID REFERENCES auth.users(id),
  resolution_amount DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  wallet_id UUID REFERENCES wallets(id),
  amount DECIMAL(15, 2) NOT NULL,
  bank_account TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transaction_reference TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Receipts
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  user_id UUID REFERENCES auth.users(id),
  receipt_data JSONB,
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Flutter Screens (To Build)

**Wallet Screens:**
- ✅ Wallet Dashboard (balance, transactions, history)
- ✅ Fund Wallet Screen (payment methods)
- ✅ Withdrawal Screen
- ✅ Transaction History

**Order & Escrow:**
- ✅ Order Confirmation Screen
- ✅ Escrow Status Screen
- ✅ Delivery Confirmation (DONE / REPORT ISSUE buttons)
- ✅ Dispute Form & Evidence Upload

**Admin Panel:**
- ✅ Dispute Management Dashboard
- ✅ Wallet Monitoring
- ✅ Admin Chat (with buyer/seller)
- ✅ Payment Release/Refund Controls

### 3. API Endpoints (Supabase Edge Functions)

**Wallet APIs:**
- POST `/api/wallets/fund` - Fund wallet
- POST `/api/wallets/withdraw` - Request withdrawal
- GET `/api/wallets/{id}/balance` - Get balance
- GET `/api/wallets/{id}/transactions` - Get history

**Payment APIs:**
- POST `/api/payments/create` - Create payment
- POST `/api/payments/verify` - Verify payment
- GET `/api/payments/{id}/status` - Check status

**Order & Escrow:**
- POST `/api/orders/create` - Create order
- POST `/api/orders/{id}/pay` - Move funds to escrow
- POST `/api/orders/{id}/done` - Release escrow
- POST `/api/orders/{id}/report-issue` - Open dispute

**Admin APIs:**
- GET `/api/admin/disputes` - List disputes
- POST `/api/admin/disputes/{id}/resolve` - Resolve dispute
- POST `/api/admin/disputes/{id}/refund` - Refund customer
- POST `/api/admin/disputes/{id}/release` - Release to seller

### 4. Features Status

**Wallet System:**
- [ ] Fund wallet (multiple payment methods)
- [ ] Real-time balance updates
- [ ] Transaction history with filters
- [ ] Withdrawal management
- [ ] Receipt generation

**Escrow System:**
- [ ] Funds locked during order
- [ ] Automatic release on DONE
- [ ] Funds remain locked on REPORT ISSUE
- [ ] Dispute tracking
- [ ] Complete transaction lifecycle

**Notifications:**
- [ ] Push notifications (Firebase)
- [ ] Email notifications
- [ ] In-app notifications
- [ ] Real-time updates

**Security:**
- [ ] Atomic database transactions
- [ ] Balance validation
- [ ] Double payment prevention
- [ ] Duplicate request protection
- [ ] Complete audit logs
- [ ] RLS policies enforced

### 5. Test Scenarios

- [ ] Fund wallet with card
- [ ] Pay for order (escrow created)
- [ ] Seller accepts order
- [ ] Seller marks shipped
- [ ] Customer receives notification
- [ ] Customer clicks DONE
- [ ] Escrow releases automatically
- [ ] Customer clicks REPORT ISSUE
- [ ] Dispute opened
- [ ] Admin reviews dispute
- [ ] Admin refunds customer
- [ ] Admin releases seller payment
- [ ] All balances update correctly
- [ ] Transaction history complete
- [ ] Notifications sent
- [ ] Receipts generated

## Implementation Priority

1. **Phase 1 (Critical):** Database schema + RLS policies
2. **Phase 2:** Supabase Edge Functions (payment APIs)
3. **Phase 3:** Flutter wallet screens
4. **Phase 4:** Flutter order & escrow screens
5. **Phase 5:** Admin dashboard
6. **Phase 6:** Notifications system
7. **Phase 7:** Testing & bug fixes

---

**Status:** Implementation required for production readiness
**Estimated Time:** 80-120 hours of development

