# SkinWise 🧴

A skincare e-commerce web app that personalises shopping to each user's skin.

	⁠CS 308 Software Engineering group project · Sabancı University · Fall 2026–27
	⁠🚧 In development (Sprint 3 of the progress demo plan).

## About

Choosing skincare online is hard: product lists are long, labels are confusing, and buying something that doesn't suit your skin is a common and costly mistake. SkinWise aims to make this easier by matching products to each user's skin.

When users sign up, they take a short skin quiz about their skin type, sensitivity and main concerns (such as acne, dryness or dark spots). SkinWise then uses this profile across the whole store:

•⁠  ⁠*Personalised badges:* product pages show labels like "suits your skin" or "caution for sensitive skin"
•⁠  ⁠*Smart filters:* browse by skin type, concern, ingredient or labels like vegan and fragrance-free
•⁠  ⁠*Reviews by skin type:* read reviews only from people with the same skin type
•⁠  ⁠*Picked for you:* product recommendations on the home page based on your profile

On top of this, SkinWise covers the full online shopping experience: product catalog and search, cart, checkout, invoices, order tracking, ratings and comments, wishlist and refund requests. Product managers and sales managers will have their own panels to manage stock, approve reviews, set prices and discounts, and track revenue.

## Technologies we plan to use

•⁠  ⁠React
•⁠  ⁠Node.js
•⁠  ⁠Supabase

## Running locally

You need Node.js 18 or newer.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env` from Supabase Dashboard > Project Settings > API Keys:

- `SUPABASE_URL`: the project URL
- `SUPABASE_KEY`: the **secret key** (`sb_secret_...`), not the publishable key

With the publishable key the catalog still loads, but orders, cart and reviews fail, because those tables are only reachable from the backend. The server prints a warning at start-up if the key is wrong. Never commit `.env` or share the secret key outside the team.

```bash
npm run dev     # starts the API on http://localhost:5001
npm test        # runs the unit tests
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev     # opens the site on http://localhost:5173
npm test        # runs the unit tests
```

### 3. Database

The tables, security rules and sample data are in `backend/supabase/schema.sql`, and the 50 products are in `backend/supabase/seed_products.sql`. Run them in the Supabase SQL Editor only when setting up a new Supabase project.

## Team

-Ebrar Güçlü
-Sibel Çelen
-Safiye Narman
-Mehlika Doğan
-İdil Sunar
-İdil Işıl Yıldırım
