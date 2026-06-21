# Backend (NestJS)

REST API for OTP authentication, a digital wallet, and document-based KYC verification.

**Stack:** NestJS · Prisma · PostgreSQL · JWT · class-validator

---

## Features

### Auth

- OTP-based register / login (one unified flow)
- New users provide a name to complete registration
- JWT issued on successful verification (custom guard, no Passport)

### Wallet

- Add money, withdraw (with balance validation)
- Passbook / transaction history (paginated, with running balance)
- Wallet summary using SQL aggregates (`SUM`, `COUNT`)

### KYC

- Document upload + verification (Aadhaar / PAN)
- Swappable provider interface (`KycProvider`)
- Status flow: `NOT_STARTED → PENDING → VERIFIED / FAILED`

### Security

- **JWT auth** via a custom guard + `@CurrentUser` decorator
- **OTP hashing** — OTPs stored as bcrypt hashes, never plaintext
- **Attempt lockout** — OTP invalidated after 3 incorrect attempts
- **OTP expiry** — configurable window (default 5 min)
- DTO validation with `class-validator`

---

## Architecture Notes

**KYC provider abstraction.** Real Aadhaar e-KYC requires AUA/KUA licensing
(UIDAI) or a licensed aggregator (e.g. Cashfree Smart OCR), both needing business
onboarding unavailable in an interview timeframe. The module is built against the
real provider contract (Cashfree `bharat-ocr` response shape) behind a
`KycProvider` interface, with a `MockOcrProvider` returning the exact sandbox
response structure. Swapping to the live `CashfreeOcrProvider` is a one-line
binding change in `kyc.module.ts`. The mock can force `VALID / FAILED / PENDING`
outcomes for demonstration.

**OTP delivery.** Delivering SMS to Indian numbers requires DLT registration
(a TRAI business process) regardless of provider. For the demo the OTP is
returned in the `request-otp` response; in production this is where a
DLT-registered SMS provider plugs in and the code would never be returned.

**Money handling.** Balances use Prisma `Decimal` (no floats). Updates use an
atomic conditional update (optimistic locking) so concurrent transactions cannot
corrupt the balance. Each transaction stores `balanceAfter` for the passbook.

---

## Structure

```
src/
  auth/        # OTP auth, JWT guard, decorators
  users/       # user details endpoint
  wallet/      # add / withdraw / passbook / summary
  kyc/         # KYC verification + provider abstraction
  prisma/      # Prisma service (global module)
prisma/
  schema.prisma
```

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted, e.g. Neon)

### Install & configure

```bash
npm install
```

### Run

```bash
npx prisma generate
npx prisma migrate dev      # local   (use migrate deploy in production)
npm run start:dev
```

API runs at `http://localhost:3000`.

---

## API Endpoints

Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/request-otp` | Request an OTP for a mobile number |
| POST | `/auth/verify-otp` | Verify OTP (+ name for new users), returns JWT |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Profile + wallet balance |

### Wallet

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wallet/add` | Add money |
| POST | `/wallet/withdraw` | Withdraw money |
| GET | `/wallet/passbook` | Transaction history (paginated) |
| GET | `/wallet/summary` | Totals via SQL aggregates |

### KYC

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/kyc/verify` | Upload document (multipart) + verify |
| GET | `/kyc/status` | Current KYC status |

---
