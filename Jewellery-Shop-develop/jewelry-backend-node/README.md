# Jewelry backend (Node + Express + Prisma + Postgres)

This is a dev scaffold to replace the Java backend with a Node.js backend that uses Postgres for both structured data and barcode image storage (`bytea`).

## Database

**Using Neon Cloud Database** (Free serverless PostgreSQL)
- No Docker required
- Automatic backups and scaling
- See [NEON_MIGRATION.md](./NEON_MIGRATION.md) for migration details

Quick steps:
1. **Setup Database:**
   - Already configured with Neon database
   - Connection string is in `.env` file
   - ~~Docker Compose is no longer needed~~ (Optional: `docker-compose.yml` kept for local development)

2. Copy `.env.example` to `.env` (already done - using Neon connection)

3. Install deps:
   ```bash
   npm install
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

5. Run migrations (if needed):
   ```bash
   npx prisma migrate deploy
   ```

6. Start server:
   ```bash
   npm start
   ```

Endpoints:
- GET /api/products
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id?deletedBy=name
- GET /api/products/:id/barcode  (streams PNG)

Notes:
- Images are stored in `barcodeImage` (bytea) with MIME and filename metadata.
- For production, consider backups and monitoring for large DB sizes (images in DB increase backup size).
