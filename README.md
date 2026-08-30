# Money Manager PWA 💰

A fully functional, offline-first Progressive Web Application (PWA) for comprehensive money management. This app is designed with a sleek, native-like mobile interface and robust financial tracking capabilities.

## ✨ Features

- **Offline-First Architecture**: Your data never leaves your device. Everything is stored locally using IndexedDB (via Dexie.js) ensuring complete privacy and offline functionality.
- **Transactions Management**: Log incomes, expenses, and transfers seamlessly. Supports swipe-to-delete functionality.
- **Multi-Account Support**: Manage various accounts (Cash, Bank Accounts, Cards, Savings) with real-time balance calculations. 
- **Account Deep-Dives**: Detailed history and summary statistics for individual accounts.
- **Monthly Budgets**: Set overarching monthly budgets or specify limits per category. Visual progress bars track your spending in real-time.
- **Categorization & Filtering**: Organize transactions into default categories with emojis. Powerful filtering options (Type, Account, Category).
- **Interactive Dashboards**: Visual charts (Donut charts) summarizing your monthly income vs. expense flow.
- **Data Export**: Export all your transaction history to a CSV file.

## 🛠 Tech Stack

- **Frontend Framework**: [React](https://reactjs.org/) powered by [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom Dark Theme UI (`#121214` background, `#FF5A5F` coral accent)
- **Database**: [Dexie.js](https://dexie.org/) (Wrapper around IndexedDB)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router DOM](https://reactrouter.com/)
- **Dates**: [date-fns](https://date-fns.org/)
- **Charts**: [Recharts](https://recharts.org/)

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your system.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

### Building for Production

To build the app for production (which enables Service Worker and full PWA capabilities):
```bash
npm run build
npm run preview
```

## 🗄 Database Schema (Local IndexedDB)
- **`transactions`**: `id`, `type`, `amount`, `date`, `category`, `accountId`, `toAccountId`, `note`, `description`
- **`accounts`**: `id`, `name`, `group`, `balance`
- **`categories`**: `id`, `name`, `type`
- **`budgets`**: `id`, `categoryId`, `amount`, `yearMonth`

## 🎨 Design Philosophy
The application prioritizes a **Mobile-First, Dark Mode** aesthetic. On desktop screens, it is elegantly centered with a constrained max-width to simulate a native app experience. No loading screens, zero latency, just pure client-side speed.
