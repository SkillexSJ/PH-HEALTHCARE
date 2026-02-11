# GOPLAN: Production-Grade Healthcare System in Go

This document outlines the recommended technology stack, architectural patterns, and development roadmap for re-implementing the PH-Healthcare Backend in Go (Golang).

## 1. Executive Summary

Moving from Node.js/TypeScript to Go offers significant advantages in performance, concurrency handling, and type safety. For a healthcare system requiring reliability and scalability, Go is an excellent choice.

This plan proposes a **Modular Monolith** architecture using **Fiber** (web framework) and **GORM** (ORM). This combination offers the smoothest transition from Express.js and Prisma while unlocking Go's performance capabilities.

## 2. Recommended Tech Stack

| Component | Current (Node.js) | Recommended (Go) | Why? |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | **Go (1.23+)** | Strong static typing, compilation, and high concurrency. |
| **Web Framework** | Express.js | **Fiber (v2/v3)** | Fiber is inspired by Express. It matches the routing style and middleware patterns you are used to, but is built on top of `fasthttp` for extreme performance. |
| **Database ORM** | Prisma | **GORM** | GORM is the most feature-rich ORM in Go. It supports hooks, preloading, associations, and auto-migrations, similar to Prisma. *(Alternative: **Ent** for complex graph relations)* |
| **Validation** | Zod | **go-playground/validator** | The de-facto standard for struct validation in Go. Uses struct tags (e.g., `validate:"required,email"`). |
| **Config** | dotenv | **Viper** | An enterprise-grade configuration solution. It handles environment variables, config files (JSON/YAML/TOML), and defaults seamlessly. |
| **Authentication** | Better Auth | **golang-jwt/jwt** | Standard JWT implementation. For OAuth (Google/Facebook), use **Goth**. |
| **Logging** | (Console/Custom) | **Zap** (by Uber) | Blazing fast, structured, leveled logging. Essential for production debugging. |
| **Documentation** | (Manual?) | **Swagger (Swaggo)** | Generates Swagger/OpenAPI documentation directly from code comments. |

## 3. Proposed Architecture: Modular Monolith with Clean Architecture

We will adhere to **Clean Architecture** principles but organize code by **Domain Modules** (similar to your current `src/app/module/` structure). This keeps related logic (User, Doctor, Admin) together.

### Directory Structure

```text
ph-healthcare-go/
├── cmd/
│   └── api/
│       └── main.go          # Entry point (initializes app, db, routes)
├── config/                  # Configuration (env vars, constants)
├── internal/                # Application code (private)
│   ├── core/                # Core interfaces and custom errors
│   ├── middleware/          # Global middleware (Auth, Logger, CORS)
│   ├── pkg/                 # Shared utilities (Response helper, JWT, Hash)
│   └── modules/             # Domain Modules
│       ├── user/
│       │   ├── delivery/    # HTTP Handlers (Controllers)
│       │   ├── usecase/     # Business Logic (Services)
│       │   ├── repository/  # Database Access (Prisma/SQL)
│       │   └── models.go    # Structs & DTOs
│       ├── doctor/
│       ├── admin/
│       └── auth/
├── pkg/                     # Public libraries (if any)
├── go.mod                   # Dependency file
└── Makefile                 # Build and run scripts
```

### Key Architectural Concepts

1.  **Models (Entities):** Go structs representing database tables (gorm models).
2.  **Repository Layer:** Direct interaction with the database. No business logic here.
3.  **UseCase (Service) Layer:** Contains pure business logic. Calls the Repository layer.
4.  **Delivery (Handler) Layer:** Handles HTTP requests, parsing JSON, validation, and calling UseCases.
5.  **Dependency Injection:** We will explicitly pass dependencies (e.g., passing `UserRepository` into `UserService`).

## 4. Implementation Details & Migration Guide

### Phase 1: Setup & Core Infrastructure
*   Initialize Go module: `go mod init github.com/yourusername/ph-healthcare-go`
*   Set up **Viper** for environment variables.
*   Set up **GORM** with PostgreSQL connection.
*   Implement a custom **Response** struct (similar to your `sendResponse` util) for consistent JSON output.
*   Set up **Fiber** app with basic middleware (Logger, Recover, CORS).

### Phase 2: User Module & Authentication
*   **Models:** Define `User` struct with GORM tags.
*   **Repository:** Create `Create`, `FindByEmail` methods.
*   **UseCase:** Implement `Register`, `Login` logic (Password hashing using `bcrypt`).
*   **JWT:** Create utility to sign and verify tokens.
*   **Handler:** Map `POST /auth/login` to the handler.

### Phase 3: Role-Based Access Control (RBAC)
*   Create a robust Middleware `AuthMiddleware(roles ...string)`.
*   Parse the JWT from the header.
*   Check if the user's role matches the allowed roles.
*   Store user context in `c.Locals("user", claims)`.

### Phase 4: Feature Modules (Doctor, Admin, Patient)
*   Migrate modules one by one.
*   **Doctor Module:**
    *   Define `Doctor` struct with relations (Specialties).
    *   Use GORM's `Preload` to fetch related data (similar to Prisma `include`).
    *   Implement Soft Delete (GORM supports `gorm.DeletedAt` field out of the box).

### Phase 5: Advanced Features
*   **Transactions:** GORM has excellent transaction support for atomic operations (e.g., creating User + Admin).
*   **Pagination:** Implement a reusable pagination helper function.
*   **Swagger Docs:** Add comments to handlers to auto-generate API docs.

## 5. Code Comparison Example

### Node.js (Prisma + Service)
```typescript
const getAllDoctors = async () => {
  return await prisma.doctor.findMany({
    where: { isDeleted: false },
    include: { specialties: true }
  });
};
```

### Go (GORM + Repository)
```go
func (r *doctorRepository) GetAll() ([]models.Doctor, error) {
    var doctors []models.Doctor
    // GORM handles the query and mapping automatically
    result := r.db.Preload("Specialties").Where("is_deleted = ?", false).Find(&doctors)
    return doctors, result.Error
}
```

## 6. Why This Plan?

1.  **Performance:** Go's goroutines make handling concurrent requests (like many patients booking appointments at once) extremely efficient.
2.  **Maintainability:** The Modular Monolith structure keeps the codebase organized as it grows.
3.  **Stability:** Strong typing eliminates an entire class of "undefined is not a function" runtime errors.
4.  **Familiarity:** Using Fiber and GORM bridges the gap between Node.js concepts and Go implementation, reducing the learning curve.
