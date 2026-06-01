<div align="center">

  <h1><img src="wallet.png" alt="GroupPay logo" width="45" /> GroupPay API</h1>

  <p><strong>REST API for group expense management — scenes, deposits, balances, and notifications.</strong></p>

  <br/>

  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Heroku](https://img.shields.io/badge/Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white)

</div>

---

> Standalone Node.js + Express backend for GroupPay. Handles custom JWT authentication, group and scene management, deposit request workflows, running balance calculations, and in-app notifications. Supabase (PostgreSQL) is the datastore; the service role key is used for all DB operations.

## <img src="https://api.iconify.design/lucide/sparkles.svg?color=%236e7681&width=22" /> Features

- **Custom JWT auth** — email/password login, OTP-based email verification, forgot/reset password via Nodemailer.
- **Group management** — create groups, manage participants (ADMIN/MEMBER roles), star groups, invite by email.
- **Scene-based expense splitting** — SHARING vs INDIVIDUAL participant categories; automatic CREDIT/DEBIT ledger entry generation per participant.
- **Deposit request workflow** — members submit cash or bank-transfer requests with image proof; admins approve or decline.
- **Running balances** — per-member group balances accumulated from scene transactions.
- **Appeals** — members dispute scene calculations; admins comment and update status.
- **Personal expense tracking** — out-of-group individual expense logs.
- **Dashboard aggregation** — summary stats endpoint for the front-end dashboard.
- **File uploads** — Multer-based file handling, routed to Supabase Storage.
- **Rate limiting** — express-rate-limit on all routes.
- **Swagger UI** — auto-generated OpenAPI docs at `/docs`.

## <img src="https://api.iconify.design/lucide/layers.svg?color=%236e7681&width=22" /> Tech Stack

| | |
|---|---|
| **Runtime** | Node.js 22 |
| **Framework** | Express 4 |
| **Database** | Supabase (PostgreSQL via `@supabase/supabase-js`) |
| **Auth** | `jsonwebtoken`, `bcryptjs` |
| **Validation** | Joi |
| **Email** | Nodemailer |
| **File uploads** | Multer |
| **Docs** | swagger-jsdoc + swagger-ui-express |
| **Logging** | Morgan |
| **Rate limiting** | express-rate-limit |

## <img src="https://api.iconify.design/lucide/network.svg?color=%236e7681&width=22" /> Architecture

```
src/
├── index.js              # Server entry — binds Express app to PORT
├── app.js                # Express app init, middleware, startup
├── startup/
│   ├── routes.js         # Mounts all route groups
│   └── swagger.js        # Swagger UI setup
├── routes/up/            # Express routers (one file per domain)
├── controllers/up/       # Request handlers
├── services/             # Shared logic (auth, email, file, token, pagination)
├── validators/up/        # Joi schemas for request bodies
├── middlewares/
│   ├── token.middleware.js       # JWT verification
│   └── validators.middleware.js  # Runs Joi validators
├── database/
│   └── database.js       # Supabase client (service role)
└── templates/
    └── health.js         # Health check response
```

Request lifecycle: `Router → token middleware (if protected) → Joi validator → Controller → Service / Supabase client`.

## <img src="https://api.iconify.design/lucide/webhook.svg?color=%236e7681&width=22" /> API Reference

All routes are prefixed `/api/v1`. Protected routes require `Authorization: Bearer <jwt>`.

Interactive docs: `http://localhost:5000/docs` (Swagger UI).

<details>
<summary>Route groups</summary>

| Prefix | Domain |
|---|---|
| `/api/v1/auth` | Register, login, verify email (OTP), forgot/reset password |
| `/api/v1/account` | Profile read/update, change password |
| `/api/v1/user` | User search / lookup |
| `/api/v1/groups` | Group CRUD, participant management, starring |
| `/api/v1/scenes` | Scene CRUD, participant split calculations |
| `/api/v1/transactions` | CREDIT/DEBIT ledger entries per group |
| `/api/v1/deposits` | Deposit request create/approve/decline, image upload |
| `/api/v1/balance` | Per-member group balance queries |
| `/api/v1/invites` | Send, accept, decline group invitations |
| `/api/v1/notifications` | List and mark-read notifications |
| `/api/v1/appeals` | Create, comment, update status on scene appeals |
| `/api/v1/expense` | Personal out-of-group expenses |
| `/api/v1/file` | Upload files to Supabase Storage |
| `/api/v1/dashboard` | Aggregated summary stats |

</details>

## <img src="https://api.iconify.design/lucide/download.svg?color=%236e7681&width=22" /> Getting Started

### Prerequisites

- Node.js 22.x
- A [Supabase](https://supabase.com) project with the schema applied (see `../web/supabase/migrations/`)

### Installation

```bash
cd api
npm install
cp .env.example .env
# Fill in .env values
```

### Running

```bash
npm run dev    # nodemon + dotenv (development)
npm start      # node (production)
```

## <img src="https://api.iconify.design/lucide/key-round.svg?color=%236e7681&width=22" /> Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port | No (default `5000`) |
| `NODE_ENV` | `development` \| `production` | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | Secret for signing access tokens | Yes |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) | Yes |
| `EMAIL_HOST` | SMTP host | Yes |
| `EMAIL_PORT` | SMTP port | Yes |
| `EMAIL_USER` | SMTP username | Yes |
| `EMAIL_PASS` | SMTP app password | Yes |
| `EMAIL_FROM` | Sender display name + address | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in ms | No (default `900000`) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No (default `100`) |

## <img src="https://api.iconify.design/lucide/rocket.svg?color=%236e7681&width=22" /> Deployment

Includes a `Procfile` for Heroku-compatible platforms:

```
web: node --experimental-json-modules src/index.js
```

Set all environment variables in your platform's config. Ensure the Supabase service role key has access to all tables used by the API.

## <img src="https://api.iconify.design/lucide/scale.svg?color=%236e7681&width=22" /> License

MIT — see [LICENSE](LICENSE). Free to use; keep the copyright notice.
