# RMS Agent Configuration
> Consolidated from Antigravity built-ins + [everything-claude-code](https://github.com/affaan-m/everything-claude-code) (50k+ ⭐)

## Directory Structure

```
.agent/
├── AGENTS.md               # Universal cross-tool agent config (read by all AI tools)
├── CLAUDE.md               # Claude-specific project config
├── README.md               # This file
│
├── agents/                 # Specialized subagents for delegation (14 agents)
│   ├── architect.md        # System design decisions
│   ├── planner.md          # Feature implementation planning
│   ├── tdd-guide.md        # Test-driven development enforcement
│   ├── code-reviewer.md    # Quality and security review
│   ├── security-reviewer.md# Vulnerability analysis
│   ├── python-reviewer.md  # Python-specific code review (FastAPI)
│   ├── database-reviewer.md# PostgreSQL/Supabase schema & query review
│   ├── e2e-runner.md       # Playwright E2E testing
│   ├── build-error-resolver.md
│   ├── refactor-cleaner.md
│   ├── doc-updater.md
│   ├── chief-of-staff.md   # Coordination across agents
│   ├── go-reviewer.md
│   └── go-build-resolver.md
│
├── commands/               # Slash commands (35 commands)
│   ├── tdd.md              # /tdd  - TDD workflow
│   ├── plan.md             # /plan - Implementation planning
│   ├── e2e.md              # /e2e  - E2E test generation
│   ├── code-review.md      # /code-review
│   ├── build-fix.md        # /build-fix
│   ├── python-review.md    # /python-review
│   ├── multi-plan.md       # /multi-plan - Multi-agent decomposition
│   ├── multi-execute.md    # /multi-execute
│   ├── verify.md           # /verify - Verification loop
│   ├── checkpoint.md       # /checkpoint - Save state
│   ├── learn.md            # /learn - Extract patterns mid-session
│   └── ...                 # 25 more
│
├── skills/                 # Workflow definitions — invoke with superpowers:
│   ├── [ECC Skills]        # From everything-claude-code
│   │   ├── tdd-workflow/         # TDD with 80%+ coverage
│   │   ├── security-review/      # Full security checklist
│   │   ├── api-design/           # REST API patterns
│   │   ├── backend-patterns/     # API, DB, caching
│   │   ├── frontend-patterns/    # React, Next.js
│   │   ├── python-patterns/      # Python idioms
│   │   ├── python-testing/       # Pytest patterns
│   │   ├── postgres-patterns/    # PostgreSQL optimization
│   │   ├── e2e-testing/          # Playwright POM patterns
│   │   ├── deployment-patterns/  # CI/CD, health checks
│   │   ├── docker-patterns/      # Container patterns
│   │   ├── database-migrations/  # Migration patterns
│   │   ├── search-first/         # Research-before-coding
│   │   ├── verification-loop/    # Continuous verification
│   │   ├── eval-harness/         # Evaluation framework
│   │   ├── strategic-compact/    # Context management
│   │   └── coding-standards/     # Universal code quality
│   │
│   └── [RMS-Specific Skills]   # Project-specific
│       ├── fastapi.md            # FastAPI templates
│       ├── fastapi-templates.md  # Detailed FastAPI patterns
│       ├── project-planning.md   # RMS planning
│       ├── prd.md                # PRD generation
│       ├── jira.md               # Jira integration
│       ├── supabase-postgres-best-practices/
│       ├── systematic-debugging/
│       ├── test-driven-development/
│       ├── writing-plans/
│       ├── ui-ux-pro-max/
│       └── ...
│
├── rules/                  # Always-follow guidelines
│   ├── common/             # Language-agnostic (install always)
│   │   ├── coding-style.md       # Immutability, file size, error handling
│   │   ├── testing.md            # 80% coverage, TDD mandatory
│   │   ├── security.md           # Pre-commit security checklist
│   │   ├── security-deep.md      # OWASP full framework (detailed)
│   │   ├── git-workflow.md       # Commit format, PR process
│   │   ├── agents.md             # When to delegate, parallel execution
│   │   ├── performance.md        # Model selection, context management
│   │   ├── patterns.md           # Design patterns
│   │   ├── hooks.md              # Hook architecture
│   │   ├── development-workflow.md
│   │   ├── debugger.md           # Systematic bug hunting
│   │   ├── planner.md            # Reasoner & planner framework
│   │   ├── code-review.md        # Review principles
│   │   ├── test-writing.md       # Test strategy
│   │   ├── unit-testing.md       # Unit test principles
│   │   ├── integration-testing.md
│   │   ├── e2e.md                # E2E principles
│   │   ├── langchain.md          # LangChain patterns
│   │   ├── llm-integration.md    # LLM integration
│   │   ├── postgres.md           # PostgreSQL rules
│   │   ├── sql-optimization.md   # Query optimization
│   │   ├── db-design.md          # DB normalization
│   │   └── cloud-security.md     # Cloud security
│   │
│   ├── typescript/         # Applied to *.ts, *.tsx, *.js, *.jsx
│   │   ├── coding-style.md       # Immutability, Zod validation, no console.log
│   │   ├── patterns.md           # TS design patterns
│   │   ├── testing.md            # Vitest/Jest patterns
│   │   ├── security.md           # XSS, CSRF, token handling
│   │   └── hooks.md              # TS-specific hooks
│   │
│   └── python/             # Applied to *.py, *.pyi
│       ├── coding-style.md       # PEP 8, type hints, black/ruff
│       ├── patterns.md           # Python idioms
│       ├── testing.md            # Pytest patterns
│       ├── security.md           # Injection, deserialization
│       ├── hooks.md              # Python-specific hooks
│       ├── fastapi.md            # FastAPI best practices
│       ├── async-patterns.md     # asyncio deep dive
│       └── testing-deep.md       # Full pytest guide
│
├── hooks/                  # Trigger-based automations
│   ├── hooks.json          # Hook definitions (PreToolUse, PostToolUse)
│   └── README.md           # Hook documentation
│
├── contexts/               # Dynamic system prompt injection
│   ├── dev.md              # Development mode
│   ├── review.md           # Code review mode
│   └── research.md         # Research/exploration mode
│
└── workflows/              # Antigravity slash-command workflows (14 workflows)
    ├── configure-supabase-row-level-security-rls-policies.md
    ├── debug-api-issues-chrome-network-tab.md
    ├── fix-cors-issues-api-proxy-headers.md
    ├── security-hardening-headers-csp-rate-limiting.md
    └── ...

## Key Agents for RMS

| Task | Use This Agent |
|------|---------------|
| New feature | `planner` → `tdd-guide` → `code-reviewer` |
| Python/FastAPI code | `python-reviewer` |
| DB schema / SQL | `database-reviewer` |
| Security concern | `security-reviewer` |
| Build broken | `build-error-resolver` |
| E2E tests | `e2e-runner` |
| Refactor/cleanup | `refactor-cleaner` |

## Key Commands for RMS

| Command | Purpose |
|---------|---------|
| `/tdd` | Enforce TDD on new feature |
| `/plan` | Write implementation plan |
| `/python-review` | Review Python code |
| `/code-review` | Review any code |
| `/e2e` | Generate E2E tests |
| `/verify` | Run verification loop |
| `/build-fix` | Fix build errors |
