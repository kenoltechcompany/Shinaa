# Shinaa 🗝️🗓️

### An enterprise-grade, federated campus key and schedule tracking platform.
***Proudly built and maintained by [KENOL Tech Company](https://github.com/orgs/KENOL-Tech-Company/dashboard).***

---

## 📖 Introduction

In busy academic institutions, managing classroom access and key handoffs is traditionally a chaotic process. Fragmented manual logbooks kept by caretakers lead to lost keys, unauthorized entries, and zero visibility for students. Students often walk across campus only to find their target classrooms occupied by unscheduled lectures or locked entirely.

**Shinaa** solves these operational bottlenecks by replacing outdated physical ledgers with a unified, lightning-fast digital workspace. It provides caretakers with a secure, concurrent key checkout flow, officials with schedule and event publishing dashboards, and students with real-time class scheduling and room availability status.

Designed with data privacy and scalability in mind, Shinaa utilizes a federated system design. This allows individual universities to self-host their core database and API infrastructures to comply with local privacy regulations while still sharing a single, universal client application catalog.

---

## 🛠️ Tech Stack

Shinaa is organized as a high-performance TypeScript monorepo powered by Bun Workspaces:

| Domain | Technologies |
| :--- | :--- |
| **Backend API** | Node.js, Express, PostgreSQL, Prisma ORM |
| **Web Dashboard** | React, Vite, Tailwind CSS (styled to GitHub Primer UI specifications) |
| **Mobile App** | React Native, Expo, Nativewind |
| **Tooling & Orchestration** | Bun Workspaces, Docker, Turborepo |

---

## 🌐 The Federated Architecture

Shinaa is built on a **federated network model** that decouples user discovery from university data storage:

```text
                                 [ Universal Mobile App ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             (Initial App Launch)                        (Selected University)
                       │                                           │
         [ Global Discovery Directory ]                            │
  https://.../public/directory.json                                │
                       │                                           │
                       ▼                                           ▼
          [ Campus List Catalog ]                       [ Self-Hosted Campus API ]
   (GCTU, University of Ghana, etc.)                   e.g., https://api.gctu.edu.gh
                                                                   │
                                                                   ▼
                                                       [ Campus PostgreSQL DB ]
```

1. **Independent Self-Hosting**: Each university IT department or computer science organization deploys their own instance of the Shinaa REST API and PostgreSQL database. All student information, staff credentials, room records, and checkout logs remain strictly under the university's control.
2. **Universal App Binary**: Users download one universal mobile application from the app store.
3. **Dynamic Registry Discovery**: On initial boot, the mobile app downloads a global `directory.json` phonebook hosted on GitHub Pages. The app displays a searchable directory list. When a user selects their university, the app saves that university's unique API endpoint to SecureStore and dynamically redirects all subsequent queries to that self-hosted backend.

---

## ⚡ Local Development & Quickstart

Get a fully functioning local developer environment running in under three minutes:

### 1. Clone the Repository
```bash
git clone https://github.com/Kelvin-Lamptey/Shinaa.git
cd Shinaa
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env` in the project root:
```bash
cp .env.example .env
```
*(The default configuration points to a local PostgreSQL instance spun up in the next step).*

### 3. Spin Up the Database
Start the PostgreSQL container service in the background:
```bash
bun run db:up
```

### 4. Install Dependencies & Seed Database
Install all monorepo dependencies, push the relational schemas to your local PostgreSQL instance, and populate the database with mock records (staff credentials and campus classrooms):
```bash
bun install
bun run db:push
bun run db:seed
```

### 5. Launch the Development Stack
Start the backend API server, React web dashboard, and Expo mobile client concurrently:
```bash
bun run dev
```
* **REST API**: `http://localhost:3000`
* **Web Dashboard**: `http://localhost:5173`
* **Mobile Client**: `http://localhost:8081` (Press `w` to open in browser, `a` for Android emulator, or `i` for iOS simulator)

---

## 🔑 Default Seeding Credentials

The database seeding script creates the following accounts for local testing:

### 1. Official Admin User
* **Email**: `official@shinaa.edu`
* **Password**: `official123`
* **Privileges**: Uploading timetables via CSV and logging single classroom reservations.

### 2. Caretaker User
* **Email**: `caretaker@shinaa.edu`
* **Password**: `caretaker123`
* **Privileges**: Checking out keys to students, returning keys, and viewing concurrent ledger logs.

---

## 🏫 Adding a School to the Directory (Federated Onboarding)

If you are a university IT department, computer science club, or student developer looking to deploy Shinaa for your campus, follow these steps to list your school globally:

### Step 1: Deploy Your Infrastructure
Self-host the Shinaa REST API (`apps/api`) and PostgreSQL database. Note your public backend API endpoint (e.g., `https://shinaa-api.yourcampus.edu`).

### Step 2: Define Your Directory Payload
Construct a JSON listing object for your university using the schema detailed below:

```json
{
  "id": "unique-school-slug",
  "name": "Full University Name",
  "aliases": ["ABBR", "Alias Name"],
  "server_url": "https://shinaa-api.yourcampus.edu"
}
```

#### Directory Parameters:
* `id` *(string, required)*: A unique slug containing lowercase letters and hyphens (e.g., `gctu` or `univ-ghana`).
* `name` *(string, required)*: The official display name of your school (e.g., `Ghana Communication Technology University`).
* `aliases` *(array of strings, required)*: Commonly searched abbreviations or aliases to optimize user query filtering (e.g., `["GCTU", "GTUC"]`).
* `server_url` *(string, required)*: The fully qualified URL pointing to your self-hosted backend API.

### Step 3: Open a Pull Request
1. Fork this repository.
2. Edit [apps/web-dashboard/public/directory.json](file:///c:/Users/kelvi/Documents/Code/A/Shinaa/apps/web-dashboard/public/directory.json) and add your JSON object to the catalog array.
3. Open a Pull Request (PR) against the `main` branch.
4. Once your PR is reviewed and merged, the changes are automatically built and published to our global GitHub Pages directory feed. The universal mobile client will display your school next time users open the Campus Discovery screen.

---

## 📄 License

This project is licensed under the MIT License.

Copyright (c) 2026 KENOL Tech Company.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
