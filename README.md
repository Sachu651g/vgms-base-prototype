# VGMS — Visitor & Gate Pass Management System

Enterprise-grade, role-based gate pass and visitor management system for multi-branch educational institutions.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **ORM**: DrizzleORM
- **Database**: PostgreSQL (Neon)
- **Styling**: TailwindCSS v4
- **Auth**: NextAuth.js v4
- **QR**: qrcode + AES-256-CBC encryption

## Setup

### 1. Clone and install
```bash
git clone https://github.com/<your-org>/vgms-base-prototype.git
cd vgms-base-prototype
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.local
# Fill in your DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

### 3. Run database migrations
```bash
npm run db:migrate
```

### 4. Seed demo data
```bash
npm run db:seed
```

### 5. Start dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/login`.

## Demo Credentials

All accounts use password: `Vgms@1234`

| Role | Email | Dashboard |
|------|-------|-----------|
| Super Admin | super_admin@vgms.com | /dashboard/super-admin |
| Branch Admin | admin@vgms.com | /dashboard/admin |
| Principal | principal@vgms.com | /dashboard/principal |
| HOD | hod@vgms.com | /dashboard/hod |
| Warden | warden@vgms.com | /dashboard/warden |
| Security Head | security@vgms.com | /dashboard/security |
| Watchman | watchman@vgms.com | /dashboard/watchman |
| Receptionist | reception@vgms.com | /dashboard/receptionist |
| Student | student@vgms.com | /dashboard/student |

## Architecture

```
app/
├── (auth)/login/          ← Login page (split-screen enterprise UI)
├── dashboard/             ← Role-specific dashboards
│   ├── layout.tsx         ← Shared navbar with role badge + sign out
│   ├── admin/             ← Branch Admin
│   ├── super-admin/       ← Super Admin
│   ├── hod/               ← Head of Department
│   ├── warden/            ← Hostel Warden
│   ├── principal/         ← Principal
│   ├── security/          ← Security Head
│   ├── watchman/          ← Gate Watchman (QR scanner UI)
│   ├── receptionist/      ← Front Desk
│   └── student/           ← Student
├── api/                   ← REST API routes
│   ├── auth/[...nextauth] ← NextAuth handler
│   ├── visitors/          ← Visitor management
│   ├── gate-passes/       ← Gate pass CRUD + scan
│   ├── hostel/            ← Hostel movements + night-out
│   ├── users/             ← User management
│   ├── notifications/     ← In-app notifications
│   ├── audit-logs/        ← Audit trail
│   ├── scan-logs/         ← QR scan history
│   └── cron/              ← Scheduled jobs (auto-expire, escalate)
db/
├── schema/                ← 13 DrizzleORM table definitions
├── migrations/            ← Generated SQL migrations
├── index.ts               ← Neon DB client
└── seed.ts                ← Demo data seeder
lib/
├── auth.ts                ← NextAuth config + RBAC middleware
├── qr.ts                  ← AES-256-CBC QR payload encryption
├── utils.ts               ← Audit log + state machine helpers
└── notifications.ts       ← In-app notification service
```

## Key Features
- **9 role types** with separate dashboards and RBAC enforcement
- **AES-256-CBC encrypted QR codes** for gate passes and visitor passes
- **Account lockout** after 5 failed login attempts (30-min lock)
- **Auto-escalation** of gate passes to Principal after 2 hours
- **Hostel tracking** with night-out approval workflow (Warden → HOD → Principal)
- **Full audit trail** for all actions
- **Cron jobs** for auto-expiry, escalation, and overdue detection

---

## NestJS Backend (Port 4000)

Runs alongside Next.js on a separate port.
Reuses the same DrizzleORM schema and DATABASE_URL.
No duplicate migrations needed.

### Setup

Install backend dependencies:
```bash
npm run backend:install
```

Run migrations (already done if Next.js works):
```bash
npm run db:migrate
```

Start NestJS on port 4000:
```bash
npm run backend:dev
```

Start both Next.js + NestJS together:
```bash
npm run dev:all
```

### 5 CRUD APIs — Users

Base URL: `http://localhost:4000/api`

| # | Method | Endpoint       | Description                        |
|---|--------|----------------|------------------------------------|
| 1 | GET    | /api/users     | List users (page, limit, search)   |
| 2 | GET    | /api/users/:id | Get single user by UUID            |
| 3 | POST   | /api/users     | Create user (password bcrypted)    |
| 4 | PUT    | /api/users/:id | Update user (partial)              |
| 5 | DELETE | /api/users/:id | Delete user                        |
|   | GET    | /api/health    | Health check                       |

### curl examples

Health check:
```bash
curl http://localhost:4000/api/health
```

List users:
```bash
curl "http://localhost:4000/api/users?page=1&limit=10"
```

Search by role:
```bash
curl "http://localhost:4000/api/users?search=ravi&role=student"
```

Get one user:
```bash
curl http://localhost:4000/api/users/<uuid>
```

Create user:
```bash
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test HOD","email":"hod2@vgms.com","password":"Vgms@1234","role":"hod"}'
```

Update user:
```bash
curl -X PUT http://localhost:4000/api/users/<uuid> \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","isActive":false}'
```

Delete user:
```bash
curl -X DELETE http://localhost:4000/api/users/<uuid>
```

### API Endpoints — Visitors (NestJS)

Base URL: `http://localhost:4000/api`

| Method | Endpoint            | Description                     |
|--------|---------------------|---------------------------------|
| GET    | /api/visitors       | List visitors (paginated)       |
| GET    | /api/visitors/:id   | Get single visitor by UUID      |
| POST   | /api/visitors       | Register a new visitor          |
| PUT    | /api/visitors/:id   | Update visitor details          |
| DELETE | /api/visitors/:id   | Delete visitor record           |

#### List visitors
```bash
curl "http://localhost:4000/api/visitors?page=1&limit=10"
```

#### Create visitor
```bash
curl -X POST http://localhost:4000/api/visitors \
  -H "Content-Type: application/json" \
  -d '{"branchId": "<branch-uuid>","name": "John Doe","phone": "9876543210","email": "john@example.com","idType": "Aadhar","idNumber": "1234-5678-9012"}'
```

#### Update visitor
```bash
curl -X PUT http://localhost:4000/api/visitors/<uuid> \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated"}'
```

#### Delete visitor
```bash
curl -X DELETE http://localhost:4000/api/visitors/<uuid>
```
