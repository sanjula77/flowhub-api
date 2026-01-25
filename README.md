# FlowHub

<div align="center">

**Enterprise-Grade Project Management Platform | Full-Stack TypeScript Application**

[![CI/CD Pipeline](https://github.com/sanjula77/flowhub-api/actions/workflows/ci.yml/badge.svg)](https://github.com/sanjula77/flowhub-api/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![WSO2](https://img.shields.io/badge/WSO2_API_Manager-4.3.0-orange.svg)](https://wso2.com/api-manager/)

[GitHub Repository](https://github.com/sanjula77/flowhub-api) • [Documentation](./docs/) • [Architecture](./docs/architecture/)

</div>

---

## Overview

FlowHub is a production-ready project management platform with enterprise security, team collaboration, and task tracking. Built with NestJS, Next.js, and PostgreSQL.

### Key Features

| Feature | Description |
|---------|-------------|
| **Security** | JWT/OAuth2, RBAC, WSO2 API Gateway |
| **Architecture** | Modular NestJS with repository pattern |
| **Performance** | PostgreSQL with TypeORM, optimized queries |
| **Quality** | 35%+ code coverage, automated CI/CD |
| **Deployment** | Docker Compose, one-command setup |
| **API Management** | WSO2 with rate limiting, analytics |

---

## Tech Stack

**Backend:** NestJS 11.0, TypeScript 5.7, PostgreSQL 15+, TypeORM, JWT, bcrypt  
**Frontend:** Next.js 16.1, React 19, TypeScript 5, Tailwind CSS  
**DevOps:** Docker, GitHub Actions, ESLint, Prettier  
**API Gateway:** WSO2 API Manager 4.3.0

---

## Quick Start

### Prerequisites

- Node.js 20.x+ and npm 9.x+
- Docker & Docker Compose (recommended)

### Docker Compose (Recommended)

```bash
git clone https://github.com/sanjula77/flowhub-api.git
cd flowhub-api
docker-compose up -d
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- WSO2 Publisher: https://localhost:9443/publisher

**Development Mode (hot reload):**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Local Development

<details>
<summary>Click to expand local setup</summary>

**Backend:**
```bash
cd backend
npm install
# Create .env with DB credentials
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```
</details>

---

## Architecture

```
Frontend (Next.js) → WSO2 Gateway (OAuth2) → Backend (NestJS) → PostgreSQL
```

**Backend:** Feature-based modules (auth, users, teams, projects, tasks), repository pattern, service layer separation  
**Security:** JWT tokens, RBAC (ADMIN/USER roles), WSO2 API Gateway  
**Database:** PostgreSQL with TypeORM, soft deletes, audit logging

[Detailed Architecture](./docs/architecture/)

---

## WSO2 Integration

WSO2 API Manager provides OAuth 2.0 security, rate limiting (1000 req/min), and analytics.

**Quick Setup:**
1. Access Publisher: `https://localhost:9443/publisher` (admin/admin)
2. Create API: FlowHub API v1.0.0
3. Configure OAuth 2.0 and rate limiting
4. Publish to Developer Portal

[WSO2 Quick Start](./docs/wso2/WSO2_QUICK_START.md) • [Security Flow](./docs/wso2/WSO2_SECURITY_FLOW.md)

---

## Testing

```bash
# Backend
cd backend
npm run test              # Unit tests
npm run test:cov          # Coverage
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests

# Frontend
cd frontend
npm run lint              # Code quality
npm run build             # Build verification
```

[Testing Strategy](./docs/testing/TESTING_STRATEGY.md)

---

## CI/CD

GitHub Actions pipeline with:
- ESLint and security audits
- Unit/integration/E2E tests
- Coverage validation (35%+)
- Production build verification

[Pipeline Status](https://github.com/sanjula77/flowhub-api/actions)

---

## Project Structure

```
FlowHub/
├── backend/          # NestJS backend
│   ├── src/
│   │   ├── auth/     # Authentication
│   │   ├── users/    # User management
│   │   ├── teams/    # Team management
│   │   ├── projects/ # Project management
│   │   ├── tasks/    # Task management
│   │   └── common/   # Shared modules
│   └── test/         # Tests
├── frontend/         # Next.js frontend
│   ├── app/          # Pages
│   ├── components/   # React components
│   └── lib/          # Utilities
├── docs/             # Documentation
└── docker-compose.yml
```

---

## Documentation

- [Architecture](./docs/architecture/) - System design and RBAC
- [API Routes](./docs/architecture/ROUTE_TABLE.md) - Endpoint reference
- [Backend Modules](./docs/backend/) - Module documentation
- [Frontend Components](./docs/frontend/) - UI documentation
- [WSO2 Configuration](./docs/wso2/) - API Gateway setup
- [Testing](./docs/testing/) - Testing strategy

---

## Contributing

1. Fork the repository
2. Create feature branch from `develop`
3. Follow coding standards (TypeScript, ESLint, Prettier)
4. Write/update tests
5. Ensure CI checks pass
6. Submit Pull Request

**Commit Format:** [Conventional Commits](https://www.conventionalcommits.org/)
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance

---

## License

This project is **UNLICENSED**. All rights reserved.

---

## Support

- **GitHub Issues:** [Create an issue](https://github.com/sanjula77/flowhub-api/issues)
- **Documentation:** [`docs/`](./docs/)
- **CI/CD Status:** [GitHub Actions](https://github.com/sanjula77/flowhub-api/actions)
