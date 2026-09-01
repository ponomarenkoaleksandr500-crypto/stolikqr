# stolikqr

Digital platform for restaurants with interactive menus, online ordering, reservations, and analytics.

## Стек

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4.
- **Backend** (`backend/`): NestJS + Prisma + PostgreSQL, JWT-аутентификация (`passport-jwt`), Socket.io (realtime).

## Запуск

Нужны оба сервиса и база данных.

```bash
# backend — потребуется DATABASE_URL (PostgreSQL), JWT_SECRET, см. backend/.env
cd backend
npm install
npx prisma migrate deploy   # или migrate dev при первом локальном запуске
npm run start:dev           # http://localhost:4000 (порт настраивается через PORT)

# frontend — в отдельном терминале, из корня проекта
npm install
npm run dev                 # http://localhost:3000
```

Frontend обращается к backend через `NEXT_PUBLIC_API_URL` (по умолчанию `http://localhost:4000`, см. `.env.local`).
Откройте [http://localhost:3000](http://localhost:3000) — страница редиректит на демо-меню ресторана (`/r/demo-restaurant`).

## Текущий статус

Frontend больше не работает на локальных mock-данных — `src/data` удалён, все данные идут через API backend'а (`src/lib/api.ts`, realtime — `src/lib/guestSocket.ts`).

Реализовано:
- **Guest**: QR-меню (`/r/[slug]`), карточки блюд с опциями, корзина, сессия стола, оформление заказа, вызов официанта.
- **Backend**: PostgreSQL через Prisma (17 моделей — рестораны, локации, столы, меню, заказы, вызовы официанта, персонал, аналитика и др.), JWT-аутентификация персонала (роли `WAITER`/`ADMIN`), realtime через Socket.io (обновления статуса заказа/вызова официанта/оплаты, закрытие стола — отдельные gateway для гостя и персонала).
- **Waiter App**: логин, список столов, вызовы официанта, стоп-лист.
- **Admin App**: логин, дашборд, управление меню (список/создание/редактирование блюд), аналитика, настройка темы.
- **Тесты**: backend — 7 spec-файлов на ключевую бизнес-логику (`staff`, `orders`, `payments`, `analytics`, `waiter-calls`, `admin.guard`).
- **Деплой**: Railway-конфигурация в обоих слоях (`railway.json`).

Ещё не реализовано (заявлено как направление в разделе 3 `CLAUDE.md`, модулей в коде нет):
- Бронирование/резервации, kitchen-workflow как отдельная роль, отзывы.
- Реальный платёжный провайдер — модуль `payments` есть, но использует `mock-payment-provider.ts`, интеграции с реальным гейтвеем (Stripe и т.п.) нет.
- Внешние интеграции (POS и т.п.).
