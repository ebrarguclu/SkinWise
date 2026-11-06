# SkinWise · Database ER diagram

The database runs on Supabase (PostgreSQL). Every table below is created by one script:
[`backend/supabase/schema.sql`](../backend/supabase/schema.sql) (Jira DP-14).

GitHub draws the diagrams below automatically.

## 1. Shopping flow: catalog, cart, order, payment, invoice

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "has profile"
  CATEGORIES ||--o{ PRODUCTS : contains
  PROFILES ||--o{ CART_ITEMS : "has in cart"
  PRODUCTS ||--o{ CART_ITEMS : "added as"
  PROFILES ||--o{ ORDERS : places
  ORDERS ||--|{ ORDER_ITEMS : contains
  PRODUCTS ||--o{ ORDER_ITEMS : "sold as"
  ORDERS ||--o| PAYMENTS : "paid by"
  ORDERS ||--o| INVOICES : "billed in"

  AUTH_USERS {
    uuid id PK
    text email UK
    text encrypted_password "bcrypt, managed by Supabase Auth"
  }
  PROFILES {
    uuid id PK,FK "same id as auth.users"
    text full_name
    text tax_id
    text address
    text role "customer | sales_manager | product_manager | support_agent"
    timestamptz created_at
  }
  CATEGORIES {
    bigint id PK
    text name UK
    text slug UK "used in URLs: serum, toner"
    text icon
    timestamptz created_at
  }
  PRODUCTS {
    bigint id PK
    bigint category_id FK
    text name
    text brand
    text model
    text serial_number UK
    text description
    numeric price
    numeric cost "null = 50% of price"
    numeric discount_rate "0-100"
    int stock "check >= 0"
    text warranty_status
    text distributor
    text skin_type
    text_array badges
    text emoji
    text image_url
    bool is_active "soft delete"
    timestamptz created_at
  }
  CART_ITEMS {
    uuid user_id PK,FK
    bigint product_id PK,FK
    int quantity "check > 0"
    timestamptz updated_at
  }
  ORDERS {
    bigint id PK
    uuid user_id FK
    text status "processing | in_transit | delivered | cancelled"
    numeric total_amount
    text delivery_address "copy at order time"
    timestamptz created_at
    timestamptz updated_at
  }
  ORDER_ITEMS {
    bigint id PK
    bigint order_id FK
    bigint product_id FK
    int quantity
    numeric unit_price "price at purchase time"
  }
  PAYMENTS {
    bigint id PK
    bigint order_id FK,UK
    numeric amount
    text card_last4
    text card_hash
    text status "approved | declined"
    timestamptz created_at
  }
  INVOICES {
    bigint id PK
    bigint order_id FK,UK
    text invoice_number UK
    numeric total
    text pdf_url
    timestamptz emailed_at
    timestamptz created_at
  }
```

## 2. After the sale: reviews, wishlist, refunds, live support

```mermaid
erDiagram
  PROFILES ||--o{ REVIEWS : writes
  PRODUCTS ||--o{ REVIEWS : receives
  PROFILES ||--o{ WISHLIST_ITEMS : saves
  PRODUCTS ||--o{ WISHLIST_ITEMS : "saved as"
  ORDER_ITEMS ||--o{ REFUND_REQUESTS : "returned via"
  PROFILES ||--o{ REFUND_REQUESTS : requests
  PROFILES |o--o{ CHAT_CONVERSATIONS : "opens (customer)"
  PROFILES |o--o{ CHAT_CONVERSATIONS : "claims (agent)"
  CHAT_CONVERSATIONS ||--|{ CHAT_MESSAGES : contains

  PROFILES { uuid id PK }
  PRODUCTS { bigint id PK }
  ORDER_ITEMS {
    bigint id PK
    numeric unit_price
  }
  REVIEWS {
    bigint id PK
    uuid user_id FK
    bigint product_id FK
    int rating "1-5, visible at once"
    text comment
    text comment_status "pending | approved | rejected"
    timestamptz created_at
  }
  WISHLIST_ITEMS {
    uuid user_id PK,FK
    bigint product_id PK,FK
    timestamptz created_at
  }
  REFUND_REQUESTS {
    bigint id PK
    bigint order_item_id FK
    uuid user_id FK
    int quantity
    numeric refund_amount "unit_price x quantity"
    text reason
    text status "requested | approved | rejected"
    timestamptz created_at
    timestamptz decided_at
  }
  CHAT_CONVERSATIONS {
    bigint id PK
    uuid customer_id FK "null = guest"
    uuid agent_id FK "null = waiting in queue"
    text guest_token
    text status "waiting | active | closed"
    timestamptz created_at
    timestamptz closed_at
  }
  CHAT_MESSAGES {
    bigint id PK
    bigint conversation_id FK
    uuid sender_id FK "null = guest"
    text sender_role "customer | agent"
    text body
    text attachment_url
    timestamptz created_at
  }
```

## Views (computed, no copied data)

| View | What it returns | Used for |
|---|---|---|
| `product_catalog` | Active products with category slug, average rating, review count, units sold and final (discounted) price | Shop pages, sorting by popularity |
| `delivery_list` | One row per order item: delivery ID, customer ID, product ID, quantity, total price, address, completed flag | Product manager's delivery list (requirement 12) |

## Key design decisions

| Decision | Why | Requirement |
|---|---|---|
| Categories are a separate table, products point to them with `category_id` | Product managers add and remove categories; a typo cannot create a second category | 12 |
| `order_items.unit_price` stores the price at purchase time | Old orders and invoices never change when prices change; refunds pay back the discounted price | 16 |
| `products.stock` has `check (stock >= 0)` | Two customers buying the last item at once cannot push the stock below zero | 3, 18 |
| Products are deactivated (`is_active = false`), never deleted | Old orders and invoices still point to them | 12 |
| Sign-up and login use Supabase Auth: passwords live in `auth.users` as bcrypt hashes. `profiles` shares the same uuid and is filled by the `on_auth_user_created` trigger | We never store or handle plain passwords | 14, 17 |
| No card numbers are stored, only the last 4 digits and a hash | Card data must not be readable | 15, 17 |
| Guest cart lives in the browser (localStorage); a logged-in user's cart lives in `cart_items` | Guests can shop without an account; the cart is merged into `cart_items` at login | 4 |
| `reviews.rating` is visible at once, `comment_status` starts as `pending` | Ratings need no approval, comments need the product manager's approval | 5 |
| Refunds point to one `order_item`, not the whole order | Customers return products selectively | 16 |
| Average rating and popularity are computed in a view, not stored | A stored copy would drift out of date | 5, 7 |
| Status columns use `text` + `check` instead of Postgres enums | Easier to change later | — |
| Row Level Security is on for every table; only categories and active products are publicly readable, and a logged-in user can read only their own profile | Everything else is reachable only through the backend | 17 |
