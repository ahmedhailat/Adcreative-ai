---
name: Database migration strategy
description: How to add new tables without breaking sessions
---

## Rule
NEVER run `drizzle push` or `drizzle generate + migrate` — it will drop the `session` table managed by connect-pg-simple.

## Strategy
1. Define table in `shared/schema.ts` using drizzle-orm/pg-core (so ORM queries work)
2. Add raw SQL migration at the END of `registerRoutes()` in `server/routes.ts`, before `seedDatabase()`:

```typescript
await db.execute(sql`CREATE TABLE IF NOT EXISTS my_table (
  id SERIAL PRIMARY KEY, ...
)`);
```

3. Import `db` and `sql` from `./db` and `drizzle-orm` respectively in routes.ts.

**Why:** The sessions table is managed by connect-pg-simple, not drizzle. Running drizzle migrations would drop it and log out all users.
