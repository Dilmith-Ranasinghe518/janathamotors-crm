# Janatha Motors — Invoice & Inventory Management System

A spare-parts shop management system: inventory, customers, invoicing, and
role-based admin, built as a React (Vite) frontend talking to a Laravel API
over a token-based JSON API. See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)
(or the styled [DEVELOPMENT_PLAN.html](DEVELOPMENT_PLAN.html)) for the full
architecture, data model, and deployment plan this scaffold follows.

## Stack

- **Frontend** — `frontend/`: React 18 + Vite, Tailwind CSS v4, TanStack
  Query, React Router, Recharts. Light/dark theme via a `dark` class on
  `<html>`, toggle persisted to `localStorage`, defaults to OS preference.
- **Backend** — `backend/`: Laravel 13 (PHP 8.3+), MySQL, Sanctum (bearer
  token auth — not cookie/SPA mode, since frontend and API are deployed to
  different origins), `spatie/laravel-permission` for roles/permissions,
  `barryvdh/laravel-dompdf` for invoice PDFs.

## Prerequisites

- PHP 8.3+, Composer
- Node 20+, npm
- MySQL/MariaDB running locally

> **If you also have Homebrew's MySQL installed alongside XAMPP**: the two
> run as separate servers. On this machine, XAMPP's bundled MariaDB (the one
> phpMyAdmin connects to) runs on **port 3307**, while a Homebrew MySQL
> install occupies the default **port 3306**. `backend/.env` is set to
> `DB_PORT=3307` so the app's data is the same data you see in phpMyAdmin.
> Run `lsof -iTCP:3307 -iTCP:3306 -sTCP:LISTEN` if tables ever "disappear" —
> it usually means a command connected to the wrong instance.

## First-time setup

### 1. Database

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS janatha_motors CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env   # already present locally; adjust DB_* if your MySQL differs
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

This seeds:
- Roles: **Admin**, **Manager**, **Cashier**, **Inventory Clerk** (see
  `database/seeders/RolePermissionSeeder.php` for the permission matrix)
- An admin login: **admin@janathamotors.lk / password** — change this
  password immediately in a real deployment
- Default settings: company name, invoice prefix (`JM-INV-`), tax rate

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # already present locally; set VITE_API_URL if your API differs
npm run dev
```

Open http://localhost:5173 and sign in with the admin credentials above.

## What's implemented

- Token-based auth (Sanctum), roles & permissions (Spatie), permission-gated
  API routes and frontend navigation/routes
- Inventory: categories, brands, products with SKU/compatible-models,
  stock ledger as the single source of truth for on-hand quantity, manual
  stock adjustments, low-stock flagging
- Suppliers & purchases: recording a purchase increments stock via the ledger
- Customers: profiles, running due balance, per-customer invoice history
- Invoices: atomic invoice numbering (`JM-INV-00001`, ...), automatic stock
  deduction with an availability check, partial payments, due tracking,
  void/return with stock reversal, server-rendered PDF download
- Dashboard: today/week/month sales, outstanding due, low-stock list,
  top-selling parts, 14-day revenue chart
- Admin: user management (create/deactivate, assign one role per user),
  role management (create roles, toggle permissions), company/invoice
  settings
- Light/dark theme, applied consistently across the app

## Deploying

Follow the phased plan in `DEVELOPMENT_PLAN.md`: Vercel for the frontend,
Render for the Laravel API (with an external managed MySQL, since Render
has no managed MySQL offering — only Postgres), then a later cutover to
Hostinger. Key things the code already assumes so that cutover stays a
non-event:

- Auth is bearer-token (Sanctum), not cookies — works identically across
  different domains/origins, no code change needed at cutover
- `CORS_ALLOWED_ORIGINS` in the backend `.env` controls which frontend
  origin(s) may call the API — set this to your Vercel URL(s) in production
- PDF/image storage should move to `FILESYSTEM_DISK=s3` (Cloudflare R2 or
  similar) once deployed to Render, since Render's disk isn't persistent
  across deploys — see the `AWS_*` block in `backend/.env.example`
