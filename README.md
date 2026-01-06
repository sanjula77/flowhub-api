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

## 🎯 Overview

FlowHub is a production-ready, enterprise-grade project management platform built with modern microservices architecture. It provides secure team collaboration, project tracking, and task management with enterprise-level security, API management, and comprehensive CI/CD pipelines.

### Key Highlights

| Feature | Description |
|---------|-------------|
| **🔐 Enterprise Security** | JWT/OAuth2 authentication, multi-level RBAC, WSO2 API Gateway integration |
| **🏗 Microservices Architecture** | Modular NestJS backend with repository pattern, service layer separation |
| **⚡ High Performance** | PostgreSQL with TypeORM, optimized queries, connection pooling |
| **🧪 Quality Assurance** | 35%+ code coverage, unit/integration/E2E tests, automated CI/CD |
| **🐳 Containerized** | Docker Compose orchestration, one-command deployment |
| **📊 API Management** | WSO2 API Manager with rate limiting (1000 req/min), analytics, OAuth2 |

---

## ✨ Features

### Core Functionality

- **User Management**: Registration, authentication, profile management, secure password hashing (bcrypt)
- **Team Collaboration**: Team creation, role-based permissions (Owner/Admin/Member), invitation system
- **Project Management**: Project creation, team assignment, status tracking, metadata management
- **Task Management**: Task creation, assignment, priority levels, status workflow (TODO → IN_PROGRESS → DONE)
- **Admin Dashboard**: System-wide user management, analytics, audit logging

### Enterprise Features

- **Multi-Level RBAC**: System roles (Admin/User) + Team roles (Owner/Admin/Member)
- **JWT Authentication**: Access & refresh tokens, token rotation, secure cookie handling
- **API Gateway Integration**: WSO2 API Manager with OAuth2, rate limiting, analytics
- **Audit Logging**: Comprehensive activity tracking for compliance
- **Database Transactions**: ACID compliance, data integrity, rollback support
- **Error Handling**: Global exception filters, structured error responses
- **Request Validation**: DTO validation with class-validator, type-safe APIs

---

## 🛠 Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) 11.0 (TypeScript 5.7)
- **Database**: PostgreSQL 15+ with TypeORM
- **Authentication**: JWT (Passport.js), bcrypt password hashing
- **Validation**: class-validator, class-transformer
- **Logging**: Winston with structured logging
- **Testing**: Jest, Supertest (Unit, Integration, E2E)
- **API Gateway**: WSO2 API Manager 4.3.0

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) 16.1 (App Router)
- **UI**: React 19, TypeScript 5, Tailwind CSS 3.4
- **Icons**: Lucide React
- **State**: React Hooks, Context API

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions (automated testing, linting, security audits)
- **Code Quality**: ESLint, Prettier
- **Version Control**: Git with conventional commits

---

## 🏗 Architecture

### System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │──────│  WSO2 Gateway │──────│   Backend   │
│  (Next.js)  │      │  (OAuth2/Rate │      │  (NestJS)   │
│             │      │   Limiting)   │      │             │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                                            ┌─────┴─────┐
                                            │ PostgreSQL │
                                            │  Database  │
                                            └────────────┘
```

### Backend Architecture

- **Modular Design**: Feature-based modules (auth, users, teams, projects, tasks, invitations, audit)
- **Repository Pattern**: Data access abstraction layer for maintainability
- **Service Layer**: Business logic separation from controllers
- **Guards & Interceptors**: Authentication, authorization, logging, metrics
- **Global Filters**: Exception handling, error transformation

### Security Architecture

- **Authentication**: JWT tokens with refresh token rotation
- **Authorization**: Role-Based Access Control (RBAC)
  - System Roles: `ADMIN`, `USER`
  - Team Roles: `OWNER`, `ADMIN`, `MEMBER`
- **API Gateway**: WSO2 API Manager for enterprise security
- **Password Security**: bcrypt with salt rounds
- **Audit Logging**: Comprehensive activity tracking

📖 [Detailed Architecture Documentation](./docs/architecture/)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x+ and **npm** 9.x+
- **Docker** & **Docker Compose** (recommended)
- **PostgreSQL** 15+ (for local development without Docker)

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/sanjula77/flowhub-api.git
cd flowhub-api

# Start all services (backend, frontend, PostgreSQL, WSO2)
docker-compose up -d

# View logs
docker-compose logs -f
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WSO2 Publisher: https://localhost:9443/publisher
- WSO2 Developer Portal: https://localhost:9443/devportal

### Option 2: Local Development

<details>
<summary>Click to expand local setup instructions</summary>

#### Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USER=flowhub
DB_PASSWORD=flowhub
DB_NAME=flowhub_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
EOF

npm run start:dev
```

#### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

npm run dev
```

</details>

📖 [Full Development Guide](./docs/deployment/README.md)

---

## 🔒 WSO2 API Manager Integration

FlowHub integrates **WSO2 API Manager 4.3.0** for enterprise-grade API lifecycle management, security, and analytics.

### Key Capabilities

| Feature | Implementation |
|---------|----------------|
| **OAuth 2.0 Security** | Token validation, JWT assertion forwarding, API key management |
| **Rate Limiting** | Application-level (1000 req/min), Resource-level (500 req/min) |
| **API Analytics** | Real-time usage metrics, performance monitoring, error tracking |
| **API Lifecycle** | Versioning, documentation, publishing, developer portal |
| **Threat Protection** | Security policies, request/response transformation |

### Architecture Flow

```
Client Request → WSO2 Gateway (OAuth2 Validation) → JWT Assertion → NestJS Backend → PostgreSQL
                                      ↓
                            Analytics & Rate Limiting
```

### Quick Setup

WSO2 is included in Docker Compose. For manual setup:

1. Access Publisher Portal: `https://localhost:9443/publisher` (admin/admin)
2. Create API: FlowHub API v1.0.0
3. Configure OAuth 2.0 authentication
4. Set rate limiting policies
5. Publish to Developer Portal

📖 [WSO2 Quick Start Guide](./docs/wso2/WSO2_QUICK_START.md) • [Security Flow](./docs/wso2/WSO2_SECURITY_FLOW.md)

---

## 🔄 CI/CD Pipeline

Automated quality gates with GitHub Actions for continuous integration and deployment.

### Pipeline Stages

**Backend Quality Gates:**
1. ✅ ESLint code quality checks
2. ✅ Security audit (npm audit)
3. ✅ Unit tests (Jest) with coverage
4. ✅ Integration tests (PostgreSQL)
5. ✅ Coverage threshold validation (35%+)
6. ✅ Production build verification

**Frontend Quality Gates:**
1. ✅ ESLint code quality checks
2. ✅ Security audit (npm audit)
3. ✅ Production build (Next.js)

### Coverage Metrics

- **Statements**: 35%+
- **Branches**: 40%+
- **Functions**: 25%+
- **Lines**: 35%+

### Pipeline Triggers

- Push to `develop` or `main` branches
- Pull Requests to `develop` or `main`

🔗 [View Pipeline Status](https://github.com/sanjula77/flowhub-api/actions) • [Validation Guide](.github/VALIDATION_GUIDE.md)

---

## 🧪 Testing

Comprehensive testing strategy with multiple test levels:

```bash
# Backend Testing
cd backend
npm run test              # Unit tests
npm run test:cov          # Coverage report
npm run test:integration # Integration tests
npm run test:e2e          # End-to-end tests

# Frontend Testing
cd frontend
npm run lint              # Code quality
npm run build             # Build verification
```

📖 [Testing Strategy](./docs/testing/TESTING_STRATEGY.md) • [Manual Test Checklist](./docs/testing/MANUAL_TEST_CHECKLIST.md)

---

## 🚀 Deployment

### Production Deployment

**Docker Compose Deployment:**
```bash
docker-compose up -d
docker-compose logs -f
```

**Environment Configuration:**
- Set strong `JWT_SECRET` for production
- Configure production database credentials
- Set `NODE_ENV=production`
- Configure WSO2 API Gateway (optional)

**Deployment Strategies:**
- Blue-Green Deployment (zero-downtime)
- Rolling Updates
- Canary Releases

📖 [Deployment Guide](./docs/deployment/README.md)

---

## 📚 Documentation

Comprehensive documentation available in [`docs/`](./docs/):

### Quick Links

- [Architecture Overview](./docs/architecture/README.md)
- [API Route Table](./docs/architecture/ROUTE_TABLE.md)
- [RBAC Flow](./docs/architecture/RBAC_FLOW.md)
- [WSO2 Configuration](./docs/wso2/)
- [Backend Modules](./docs/backend/)
- [Frontend Components](./docs/frontend/)
- [Testing Strategy](./docs/testing/)

### API Documentation

For detailed API usage examples, request/response formats, and authentication flows:

📖 [API Route Table](./docs/architecture/ROUTE_TABLE.md) • [Backend API Docs](./docs/backend/)

---

## 📁 Project Structure

```
FlowHub/
├── backend/              # NestJS backend application
│   ├── src/
│   │   ├── auth/        # Authentication & authorization
│   │   ├── users/       # User management
│   │   ├── teams/       # Team management
│   │   ├── projects/    # Project management
│   │   ├── tasks/       # Task management
│   │   ├── invitations/ # Team invitations
│   │   ├── audit/       # Audit logging
│   │   └── common/      # Shared modules
│   └── test/            # E2E and integration tests
├── frontend/            # Next.js frontend application
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   └── lib/             # Utility functions
├── docs/                # Comprehensive documentation
├── wso2/                # WSO2 API Gateway configuration
└── docker-compose.yml   # Multi-service orchestration
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch from `develop`
3. Follow coding standards (TypeScript, ESLint, Prettier)
4. Write/update tests
5. Ensure all CI checks pass
6. Submit a Pull Request

**Commit Format:** Follow [Conventional Commits](https://www.conventionalcommits.org/)
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance

---

## 📄 License

This project is **UNLICENSED**. All rights reserved.

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Next.js](https://nextjs.org/) - React framework for production
- [TypeORM](https://typeorm.io/) - ORM for TypeScript
- [WSO2 API Manager](https://wso2.com/api-manager/) - Enterprise API Gateway

---

## 📞 Support

- **GitHub Issues**: [Create an issue](https://github.com/sanjula77/flowhub-api/issues)
- **Documentation**: Check the [`docs/`](./docs/) directory
- **CI/CD Status**: [GitHub Actions](https://github.com/sanjula77/flowhub-api/actions)

---

<div align="center">

**Built with ❤️ by the FlowHub Team**

[⬆ Back to Top](#flowhub)

</div>
