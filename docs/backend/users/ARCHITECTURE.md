# User Module Architecture

Clean Architecture implementation with SOLID principles.

## Architecture Layers

### 1. Domain Layer (Entity)
- **File:** `user.entity.ts`
- **Purpose:** Core business entity, database-agnostic
- **Contains:** User properties, relationships, TypeORM decorators
- **No dependencies:** Pure domain model

### 2. Repository Layer (Data Access)
- **Interface:** `repositories/user.repository.interface.ts`
- **Implementation:** `repositories/user.repository.ts`
- **Purpose:** Abstracts data access, follows Repository Pattern
- **Benefits:** Easy to swap implementations, testable, follows DIP

### 3. DTO Layer (Data Transfer Objects)
- **CreateUserDto:** Input validation for user creation
- **UpdateUserDto:** Input validation for user updates
- **UserResponseDto:** Output format (excludes password)
- **Purpose:** Input validation, output transformation, API contract definition

### 4. Service Layer (Business Logic)
- **File:** `users.service.ts`
- **Purpose:** Contains business rules and orchestration
- **Responsibilities:**
  - Email uniqueness validation
  - Data transformation (Entity → DTO)
  - Business rule enforcement
- **No HTTP concerns:** Pure business logic

### 5. Controller Layer (Presentation)
- **File:** `users.controller.ts`
- **Purpose:** HTTP request/response handling
- **Responsibilities:** Route definitions, DTO validation, response formatting
- **No business logic:** Delegates to services

---

## SOLID Principles Applied

- **Single Responsibility:** Each component has one job
- **Open/Closed:** Repository interface allows extension without modification
- **Liskov Substitution:** Any implementation of `IUserRepository` works
- **Interface Segregation:** Focused interface, only user operations
- **Dependency Inversion:** Service depends on interface, not concrete class

---

## Security Features

### Password Protection
- **Never exposed:** Password excluded from all DTOs
- **Hashed:** Bcrypt hashing in AuthService
- **No serialization:** TypeORM excludes password from JSON

### Input Validation
- **class-validator:** Validates all inputs
- **Email format:** Regex validation
- **Password strength:** Min length enforcement
- **Role enum:** Only valid roles accepted

### Output Sanitization
- **UserResponseDto:** Explicitly excludes password
- **Transformation:** Entity → DTO conversion ensures security

---

## Design Choices

### 1. Why Repository Pattern?
**Problem:** Direct TypeORM dependency in services  
**Solution:** Abstract via interface  
**Benefits:** Testable, swappable, clean separation

### 2. Why DTOs?
**Problem:** Exposing entities directly  
**Solution:** Separate DTOs for input/output  
**Benefits:** Security, validation, API versioning

### 3. Why Interface Injection?
**Problem:** Tight coupling to implementation  
**Solution:** Inject interface, bind to implementation  
**Benefits:** Testable, flexible, follows DIP

### 4. Why Separate AuthService?
**Problem:** Mixing auth logic with user CRUD  
**Solution:** Separate service for authentication  
**Benefits:** Single Responsibility, reusable auth logic

---

## File Structure

```
users/
├── user.entity.ts                    # Domain entity
├── dto/
│   ├── create-user.dto.ts           # Input DTO
│   ├── update-user.dto.ts           # Input DTO
│   └── user-response.dto.ts         # Output DTO
├── repositories/
│   ├── user.repository.interface.ts # Repository contract
│   └── user.repository.ts           # TypeORM implementation
├── users.service.ts                 # Business logic
├── users.controller.ts              # HTTP handling
└── users.module.ts                  # Dependency injection setup
```

---

## Usage Example

### Creating a User

```typescript
// Controller receives CreateUserDto
@Post()
async create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}

// Service validates business rules
async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
  if (await this.userRepository.emailExists(createUserDto.email)) {
    throw new ConflictException('Email already exists');
  }
  const user = await this.userRepository.create(createUserDto);
  return this.toResponseDto(user);
}
```

### Testing

```typescript
// Mock repository interface
const mockRepository: IUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  // ... other methods
};

// Test service in isolation
const service = new UsersService(mockRepository);
```

---

## Benefits Summary

1. **Testable:** Mock interfaces, test in isolation
2. **Maintainable:** Clear separation, easy to modify
3. **Secure:** Password never exposed, input validated
4. **Flexible:** Swap implementations easily
5. **Scalable:** Add features without breaking existing code
6. **SOLID:** Follows all five principles
7. **Clean:** No business logic in controllers
