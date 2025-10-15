# Advanced E-Commerce API (Node.js + MongoDB)


This repository implements an e-commerce backend demonstrating:
- JWT Authentication & RBAC (User / Admin)
- Order lifecycle with statuses: PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED
- Inventory reservation (availableStock / reservedStock)
- Atomic transactions during checkout & payment using MongoDB sessions
- Background worker that processes jobs and cancels expired pending orders (older than 15 minutes)
- Validation with Joi and centralized error handling


## Quick start
1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm run dev` to start server
4. In another terminal run `npm run worker` to start background worker


## Important endpoints (summary)
- `POST /auth/register` - create user
- `POST /auth/login` - receive JWT
- `GET /products` - list, with `?page=&limit=&sort=&order=&name=`
- `POST /products` (admin) - create
- `GET /cart` - view
- `POST /cart/items` - add/update
- `POST /orders/checkout` - create order and reserve stock
- `POST /orders/:id/pay` - mock payment (body: transactionId, amount, status)
- `GET /orders` - user orders
- `GET /admin/orders` - admin view
- `PATCH /admin/orders/:id/status` - admin update status


## Postman collection
Create requests according to endpoints above. Typical flow:
1. Register user -> login -> get token
2. Create products as admin (use admin token)
3. As user add to cart
4. POST /orders/checkout -> receive order with status PENDING_PAYMENT
5. POST /orders/:id/pay with `{ transactionId, amount, status: 'SUCCESS' }` -> order becomes PAID


## Postman Collection
https://github.com/rahulpatel0531/advanced-e-commerce-app/blob/main/advanced_e_commerce_api_node.json