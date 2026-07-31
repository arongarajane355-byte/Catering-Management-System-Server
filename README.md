# Catering Management System

A full-stack web app for managing catering bookings across three roles: **Customer**, **Staff**, and **Admin**.

- **Frontend:** React (JavaScript) + Vite, React Router, Axios
- **Backend:** Node.js + Express, MySQL (`mysql2`), JWT auth, bcrypt
- **Database:** MySQL — schema & stored procedures in [`DATABASE.md`](./DATABASE.md)

## Folder Structure

```
catering-management-system/
├── backend/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── server.js
│   └── src/
│       ├── config/db.js
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── utils/
├── frontend/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       │   ├── customer/
│       │   ├── staff/
│       │   └── admin/
│       └── styles/
├── DATABASE.md
└── README.md
```

## Roles & Workflow

- **Customer** — browses services on the landing page (grouped by category), logs in, submits booking requests (**Input**), and tracks status.
- **Staff** — creates Customer accounts (profile: Firstname, Lastname, Gender, Age, Number, Email, Password). These accounts are `pending` until an Admin verifies them. Staff also reviews new bookings and moves them to **Processing**.
- **Admin** — verifies/approves or rejects Staff-created Customer accounts, creates Staff accounts, manages the service catalog, and marks processed bookings as **Completed** (**Output**).

Every booking moves through: **Input → Processing → Completed** (or **Cancelled**), with each transition logged for audit purposes (see `booking_status_history` in `DATABASE.md`).

## Getting Started

### 1. Database

1. Install MySQL and create the credentials matching `backend/.env`:
   - `DB_USER=cms_db`, `DB_PASS=cms_db`, `DB_NAME=cms`
2. Run the SQL in [`DATABASE.md`](./DATABASE.md) (tables + stored procedures + seed data).
3. Insert your first Admin account (see the last section of `DATABASE.md`).

### 2. Backend

```bash
cd backend
npm install
npm run dev      # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:5173
```

## Services Offered (shown on the landing page, grouped by category)

1. **Event Catering (Special Occasions)** — Weddings (Kasal), Birthdays, Baptismal, Anniversaries, Family Reunions.
2. **Food Delivery & On-Site Setup** — Buffet station setup, chafing dish provision, optional serving staff/crew.
3. **Dessert & Beverage Packages** — Custom cakes, pastry platters, drink stations, dessert bars.
4. **Equipment & Utensil Rental** — Tables, chairs, tablecloths, plates, glasses, cutlery, serving trays.
