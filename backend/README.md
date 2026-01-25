# FlowHub Backend

NestJS backend application for FlowHub project management platform.

## Setup

```bash
npm install
npm run start:dev
```

## Environment Variables

Create `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=flowhub
DB_PASSWORD=flowhub
DB_NAME=flowhub_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
```

## Scripts

```bash
npm run start          # Production
npm run start:dev      # Development (watch mode)
npm run build          # Build
npm run test           # Unit tests
npm run test:cov       # Coverage
npm run test:integration # Integration tests
npm run test:e2e       # E2E tests
```

## Architecture

- **Modular Design:** Feature-based modules (auth, users, teams, projects, tasks)
- **Repository Pattern:** Data access abstraction
- **Service Layer:** Business logic separation
- **Guards:** Authentication and authorization

See [Backend Documentation](../docs/backend/) for detailed module documentation.
