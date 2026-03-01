# CERP – Campus Engagement & Research Portal
video link https://drive.google.com/file/d/1pGJ7ASKh9eJAPlZrtrrb9rbyuCVlanBf/view?usp=sharing
<div align="center">

![CERP](https://img.shields.io/badge/CERP-Campus%20Portal-00f5ff?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite)

A unified full-stack portal that centralizes campus events, club announcements, and faculty research publications into a stunning cyber-themed platform.

[**Live Demo**](#) · [**Deployment Guide**](./DEPLOYMENT.md) · [**Report Bug**](#)

</div>

---

## ✨ Features

- 🎯 **Unified Dashboard** - All campus activities in one place
- 📅 **Smart Calendar** - Event scheduling with conflict detection  
- 🔬 **Research Discovery** - Faculty publications from OpenAlex API
- 📧 **Gmail Integration** - Auto-categorize club emails with NLP
- 🎨 **Cyber Theme** - Stunning glassmorphism dark UI
- 🔐 **Role-Based Access** - User, Admin, SuperAdmin roles
- ⚡ **Real-time Scraping** - Auto-update every 6 hours

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + Lucide icons |
| Backend | Node.js + Express |
| Database | **SQLite** (zero config!) |
| Auth | JWT + bcryptjs |
| AI/NLP | Natural.js for email categorization |

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **npm** or **yarn**

### Option 1: Local Development

```bash
# Clone the repo
git clone https://github.com/yourusername/cerp.git
cd cerp

# Start backend (Terminal 1)
cd backend
npm install
npm run seed    # Initialize database
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

🌐 Open **http://localhost:3000** in your browser!

### Option 2: Docker (Recommended)

```bash
# Clone and configure
git clone https://github.com/yourusername/cerp.git
cd cerp
cp .env.example .env
# Edit .env with your values

# Run with Docker
docker-compose up --build
```

🌐 Open **http://localhost:3000**

### Option 3: One-Click Deploy

| Platform | Deploy |
|----------|--------|
| Railway | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app) |
| Render | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com) |

👉 See [**DEPLOYMENT.md**](./DEPLOYMENT.md) for detailed instructions.

---

## 🔐 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@iitj.ac.in` | `SuperAdmin@CERP2026` |

---

## 📁 Project Structure

```
cerp/
├── backend/               # Express API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── db/           # Database & migrations
│   │   ├── scraper/      # Research & club scrapers
│   │   └── server.js     # Entry point
│   └── Dockerfile
├── frontend/              # React SPA
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Shared components
│   │   └── context/      # Auth context
│   └── Dockerfile
├── docker-compose.yml     # Container orchestration
├── DEPLOYMENT.md          # Deployment guide
└── README.md
```

---

## 🔐 Role-Based Access

| Role | Capabilities |
|---|---|
| **user** | View personalized events, research, and announcements based on selected preferences (clubs & domains). |
| **club_admin** | Has global view access to all content, but can only explicitly create, edit, and delete events/announcements for their assigned club. |
| **admin** | Has total, unrestricted global view and edit access for all content on the platform. |
| **superadmin** | All admin capabilities + access to User Management (promote/demote roles and assign clubs to club managers). |

### Sample Accounts Created by Seeds:

#### Superadmin
```
Email:    superadmin@iitj.ac.in
Password: SuperAdmin@123
```

#### Admin
```
Email:    admin@iitj.ac.in
Password: Admin@123
```

#### Test User (Prefers Coding + AI/ML)
```
Email:    testuser@iitj.ac.in
Password: User@123
```

#### Club Admins (One per club)
All club admins share the same password: **`ClubAdmin@123`**
- `codingclub_admin@iitj.ac.in` (Coding Club)
- `roboticsclub_admin@iitj.ac.in` (Robotics Club)
- `aimlclub_admin@iitj.ac.in` (AI/ML Club)
- `cybersecurityclub_admin@iitj.ac.in` (Cybersecurity Club)
- `entrepreneurshipcell_admin@iitj.ac.in` (Entrepreneurship Cell)
- `literaryclub_admin@iitj.ac.in` (Literary Club)
- `photographyclub_admin@iitj.ac.in` (Photography Club)
- `musicclub_admin@iitj.ac.in` (Music Club)
- `sportsclub_admin@iitj.ac.in` (Sports Club)
- `designclub_admin@iitj.ac.in` (Design Club)

---

## ✨ Key Features

1. **Onboarding & Preferences** — New users pick research domains & clubs on first login to tailor their feeds.
2. **Research Publications** — Browse faculty publications, filtered by preferred domains.
3. **Club Announcements Feed** — Stay updated on club news, filtered by your followed clubs.
4. **Interactive Calendar** — Month/week/day/agenda views dynamically populated with event timings.
5. **Role-Isolated Admin Panel** — A robust management panel that securely restricts creation capabilities based on user role.
6. **User Management** — Superadmins can dynamically assign clubs to standard users using an intuitive dropdown UI.


