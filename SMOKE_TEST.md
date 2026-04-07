# Decor Aeroponic - DB Smoke Test

This repo is designed to move from `localStorage` to a real external Postgres DB.

## Prereqs
1. Deploy/run the backend (Render or locally).
2. Ensure Postgres is reachable via `DATABASE_URL`.
3. Open the backend logs to view demo OTPs when provider credentials are missing.

## Manual Flow
1. **Signup**
   - Open `account.html`
   - Use a real `Gmail` address (current frontend validates `@gmail.com`) and a phone number
   - Fill: `name`, `age`, `location`, `phone`, `email`
   - Submit signup

2. **Send OTP + Verify**
   - On the same `account.html`, go to **Sign in**
   - Enter the same `email / phone` into “Email / Phone number”
   - Click **Send OTP**
   - If Twilio/SendGrid are not configured, the OTP will be displayed in the UI as `Demo OTP:` (and also in backend logs)
   - Enter OTP and submit

3. **Add to cart**
   - Open `all-products.html`
   - Click the cart button (`🛒`) on any product card (e.g. tower items)
   - Confirm cart badge count increases

4. **Checkout**
   - Open `checkout.html` (via cart or cart button)
   - Submit checkout form
   - Confirm “Thank you for your order” shows a reference code

5. **Submit inquiry**
   - Open `contact.html`
   - Fill the inquiry form and submit

6. **Admin: reply/resolve**
   - Open `admin.html`
   - Login with the seeded credentials:
     - `Pahuni` / `wewillsucceed`
     - `Pavit` / `wewillsucceed`
   - In **Customer Inquiries**, click:
     - **Reply** to set status to `Replied`
     - **Resolve** to set status to `Resolved`

7. **Marketing queue**
   - In **Email Marketing** and **Phone Marketing**, create a campaign
   - Confirm the history tables populate via `/api/admin/*-campaigns`

## Notes
- Base product data is auto-seeded into Postgres when the `products` table is empty.
- Cart/orders/inquiries are stored in Postgres; UI uses API calls.
- If OTP providers are configured, real delivery happens; otherwise demo OTP is shown to make the smoke test work.

