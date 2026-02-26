================================================================================
  ORDER PICKER — Web App for n8n Integration
  Built: 2026-02-25
================================================================================

WHAT IS THIS?
-------------
A Next.js (React) web application that lets you browse orders from the PostgreSQL
database (ext_orders), select one or more via checkboxes, and send the selected
order IDs to an n8n workflow via a webhook POST request.

The app is containerized with Docker and served via HTTPS through the existing
Traefik reverse proxy at:

    https://orders.flow-hunter.com


DATABASE
--------
- PostgreSQL container: postgres (same as used by n8n)
- Database name:        ext_orders
- Tables used:

  orders
    id             - Primary key (integer)
    ordernumber    - Unique order number (varchar)
    customername   - Customer company name (varchar)
    customernumber - Customer ID number (integer)
    orderdate      - Date the order was placed (date)
    createdat      - Row creation timestamp

  order_positions
    id               - Primary key
    ordernumber      - Foreign key → orders.ordernumber
    position         - Position number within the order
    articlenumber    - Article/product number
    pro_articlenumber - Internal PRO article number
    quantity         - Quantity ordered


FEATURES
--------
1. ORDER LIST
   Displays all orders in a table with columns:
   ID | Order # | Customer | Customer # | Order Date | # Positions

2. DATE FILTER
   Two date pickers (From / To) to filter orders by orderdate.
   Click "Apply Filter" to refresh. Click "Clear" to reset.

3. HOVER TOOLTIP
   Hovering over any order row for 200ms shows a dark tooltip with all
   positions belonging to that order (position#, article#, PRO article#, qty).

4. CHECKBOXES
   - Each row has a checkbox (clicking the row also toggles it).
   - Header checkbox selects/deselects all visible orders.
   - Indeterminate state shown when only some rows are selected.

5. COMBINE BUTTON
   The "Combine (N)" button at the bottom right becomes active when at
   least one order is selected. Clicking it:
   - POSTs to the configured n8n webhook URL
   - Sends the following JSON body:

       {
         "order_ids":    [1, 3, 7],
         "ordernumbers": ["5568694", "ZD 0090/10/25", "..."],
         "triggered_at": "2026-02-25T14:00:00.000Z"
       }

   - Shows a green toast on success, red toast on error.
   - The selected IDs are also shown as plain text next to the button
     so you can read them before clicking.


CONFIGURATION (environment variables)
--------------------------------------
Set in /opt/invoice-stack/.env:

  ORDERS_HOST        Domain for the app (default: orders.flow-hunter.com)
  N8N_WEBHOOK_URL    Full n8n webhook URL the Combine button POSTs to
  POSTGRES_USER      PostgreSQL username (shared with n8n)
  POSTGRES_PASSWORD  PostgreSQL password (shared with n8n)

Database connection variables passed to the container:
  PGHOST=postgres  PGPORT=5432  PGDATABASE=ext_orders


FILE STRUCTURE
--------------
order-picker/
  Dockerfile                        Multi-stage Docker build (Node 20 Alpine)
  next.config.js                    Next.js config (standalone output mode)
  package.json                      Dependencies: Next.js 14, React 18, pg
  tailwind.config.js                Tailwind CSS config
  postcss.config.js
  tsconfig.json
  public/                           Static assets (empty by default)
  src/
    app/
      globals.css                   Tailwind base styles
      layout.tsx                    Root HTML layout
      page.tsx                      Main page (renders OrderTable)
      api/
        orders/
          route.ts                  GET /api/orders — fetches all orders +
                                    their positions from PostgreSQL
        combine/
          route.ts                  POST /api/combine — forwards selected
                                    order IDs to the n8n webhook
    components/
      OrderTable.tsx                Main interactive component (table,
                                    filters, checkboxes, tooltip, combine)
    lib/
      db.ts                         PostgreSQL connection pool (using `pg`)


DOCKER / DEPLOYMENT
-------------------
The service is defined in /opt/invoice-stack/docker-compose.yml as "order-picker".

Useful commands (run from /opt/invoice-stack):

  Start:      docker compose up -d order-picker
  Stop:       docker compose stop order-picker
  Restart:    docker compose restart order-picker
  Rebuild:    docker compose build order-picker && docker compose up -d order-picker
  Logs:       docker logs -f order-picker

Traefik handles HTTPS automatically via Let's Encrypt once the DNS record
for orders.flow-hunter.com points to this server's public IP.


REQUIRED SETUP STEPS (if not done yet)
---------------------------------------
1. Add a DNS A record:
      orders.flow-hunter.com  →  <your server's public IP>

2. Set the n8n webhook URL in /opt/invoice-stack/.env:
      N8N_WEBHOOK_URL=https://n8n.flow-hunter.com/webhook/<your-path>

3. Restart the container to pick up the new env var:
      cd /opt/invoice-stack && docker compose up -d order-picker


n8n WORKFLOW INTEGRATION
------------------------
In n8n, create a workflow with a "Webhook" trigger node:
- Method: POST
- Path:   choose any path (e.g. /order-picker)
- Copy the full URL into N8N_WEBHOOK_URL in the .env file

The webhook node will receive:
  order_ids     → array of integer IDs from the orders table
  ordernumbers  → array of the corresponding order number strings
  triggered_at  → ISO 8601 timestamp of when Combine was clicked

You can then use these in subsequent n8n nodes to look up data, generate
documents, send emails, etc.

================================================================================
