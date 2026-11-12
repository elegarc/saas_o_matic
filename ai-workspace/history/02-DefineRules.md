# Promt

Configure general rules that can be applied to all areas of the project
The way of working and the architecture rules should always be followed.
- Use spec driven development : before generating, or modifying code consult 01-specs/01-product-spec.md
- Planning before execution : prepare an implementation plan for new features and wait for user approval before starting the implementation
- Follow a clear modular approach, where each component has a single responsability
- Language: the code, varialbes and commits should be in spanish. Interface language that the user interacts with should be in spanish

# Response 
I have configured the project-wide rules in architecture.md with trigger: always_on so they apply unconditionally across all areas of the project:

Spec-Driven Development: Requires consulting 01-product-spec.md (alongside 02-api-contract.yaml and 03-data-model.md) before generating or modifying any code.
Planning Before Execution: Requires preparing an implementation plan and waiting for your approval before implementing any new feature or architectural change.
Modularity & Single Responsibility: Enforces clear layer separation across Python/FastAPI (routers 
→
→ services/domain 
→
→ repositories/db) and Angular (components 
→
→ services 
→
→ models/utils), keeping business logic isolated and unit-testable.
Spanish Language Standard: Enforces Spanish for all domain code, variables, functions, classes, comments, Git commits, and all user-facing UI text/messages.

# Promt

Create `.agent/rules/02-backend-python.md` (and mirror it in `ai-workspace/02-architecture/backend-rules.md`) so we follow solid Python and FastAPI practices from the start:

- **Clean architecture:** Split `backend/app/` into `routers/` (HTTP only), `services/` (business logic), `validators/` (pure validation functions), `repositories/` (SQLite access), and `schemas/` (Pydantic v2). Keep routers thin—no business logic or raw queries in them.
- **Python best practices:** Enforce full type hints, PEP 8, small modular files, early returns over deep nesting, and `Decimal` for all money and tax calculations (never `float`).
- **FastAPI & SQLite:** Inject DB sessions via `Depends`, initialize tables automatically on startup, and use custom exceptions to return proper HTTP status codes (400/422, 404, 409).
- **Testing:** Require `pytest` unit tests for all validators and pricing logic, and use an isolated test DB for endpoint tests.

Draft the rule file and show me so I can review it before we start coding.

# Response
have configured the backend rules in backend-python.md (trigger: always_on), complementing architecture.md:

Layered Structure (backend/app/): Separates routers/ (thin HTTP layer), schemas/ (Pydantic v2 DTOs matching 02-api-contract.yaml), services/ (use-case orchestration), domain/ (pure framework-free pricing, tax, and DNI/NIE/CIF validation), repositories/ & db/ (SQLite access), and core/ (config & domain exceptions).
Python Best Practices: Enforces full PEP 484/604 type hints, integer-cents + Decimal (ROUND_HALF_UP) financial math (no float arithmetic), immutable @dataclass(frozen=True) domain objects, pure functions, PEP 8 formatting, and English code/docstrings with Spanish user-facing error messages.
FastAPI & SQLite Hygiene: Enforces Pydantic v2 boundary validation & normalization, Depends() injection for DB connections/services, synchronous def path operations for blocking sqlite3 I/O, standardized ErrorResponse exception handlers, ?-parameterized queries only, PRAGMA foreign_keys = ON;, and 409 Conflict mapping for duplicate (country_code, tax_id).
Testing Standards: Requires pytest unit tests for all domain boundaries (0, 10, 11, 15, 50, 51 users, progressive overages, HARD_CAP, DNI/NIE/CIF) and TestClient integration tests against an isolated temporary SQLite DB.


# Promt
Create `.agent/rules/frontend-angular.md` (and mirror it in `ai-workspace/02-architecture/frontend-rules.md`) to follow clean Angular practices:

- use standalone componenets. 
- Clean structure: organize the codebase into core, features and shared. Respect the separation of responsabilities and have a clear and consistent way of managing dependencies.
- Handle loading, error and empty states
- Code quality : components shuld be small, maintainable and reusable

Draft the rules and ask if any instruction is unclear
