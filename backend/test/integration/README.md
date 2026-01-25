# Integration Tests

Integration tests require a real PostgreSQL database connection.

## Setup

### Using Docker (Recommended)

If using Docker Compose, the database is already configured. Ensure containers are running:

```bash
docker ps  # Verify flowhub-db-1 is running
```

**Database credentials from `docker-compose.yml`:**
- **Host:** `localhost` (from host machine) or `db` (from Docker network)
- **Port:** `5432`
- **User:** `flowhub`
- **Password:** `flowhub`
- **Database:** `flowhub_db`

### Running Tests from Host Machine

When running tests from your host machine (not inside Docker), set environment variables:

```powershell
# Windows PowerShell
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_USER="flowhub"
$env:DB_PASSWORD="flowhub"
$env:DB_NAME="flowhub_db"
npm run test:integration
```

Or create a `.env.test` file in the `backend` directory:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=flowhub
DB_PASSWORD=flowhub
DB_NAME=flowhub_db
```

### Running Tests Inside Docker Container

If running tests inside the backend container:

```bash
docker exec -it flowhub-backend-1 npm run test:integration
```

In this case, use `DB_HOST=db` (Docker service name) instead of `localhost`.

---

## Running Integration Tests

```bash
npm run test:integration
```

---

## Important Notes

- Integration tests will **clean the database** between test runs
- Use a **separate test database** to avoid affecting development data
- Tests require the database to be accessible with the provided credentials
- If database connection fails, all tests will fail with authentication errors

---

## Test Coverage

- **Authentication Flow:** Signup, login, token validation
- **Team Management:** Team creation, member management, role changes
- **Project Workflow:** Project creation, access control, soft deletion
- **Task Workflow:** Task creation, assignment, status transitions, deletion
