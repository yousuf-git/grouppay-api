# GroupPay API

Standalone Node.js + Express API for GroupPay, using Supabase as the database.

## Features

- **Custom Auth:** JWT-based authentication with passwords stored in the `person` table.
- **Group Management:** CRUD for groups, participant roles, and starring.
- **Scenes & Ledger:** Complex logic for splitting bills and maintaining group balances.
- **Deposit Requests:** Cash/Bank transfer tracking between members.
- **Notifications:** In-app notification system.
- **API Documentation:** Swagger UI available at `/docs`.
- **Health Check:** Standardized health check at `/`.

## Setup

1.  Navigate to the `api/` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file based on `.env.example`:
    ```bash
    cp .env.example .env
    ```
4.  Update the `.env` file with your Supabase credentials and SMTP settings.
5.  Start the development server:
    ```bash
    npm run dev
    ```

## API Documentation

Once the server is running, visit `http://localhost:5000/docs` to view the OpenAPI documentation.

## Database Note

This API uses the Supabase Service Role Key to perform operations. Ensure that the `person` table has a `password` (text), `email_verified` (boolean), `verification_otp` (text), and `otp_expires_at` (timestamptz) columns for authentication to work correctly.
