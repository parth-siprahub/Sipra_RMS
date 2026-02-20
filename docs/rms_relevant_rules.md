# 🚀 RMS Project: Relevant Antigravity Rules & Workflows
*Curated selection for React (Vite) + Python (FastAPI) + Supabase stack*

## 🤖 Agentic AI Rules (Use these for all tasks)
*   **Strong Reasoner & Planner**: For architectural decisions and complex tasks.
*   **Debugging Agent**: For systematic root cause analysis.
*   **Code Review Agent**: Before finalizing any PR/commit.
*   **Test Writing Agent**: For ensuring coverage (Vitest/Playwright).
*   **Security Audit Agent**: For RLS policies and API endpoints.

## 🛠️ Workflows (High Impact)

### ⚡ Local Development & Quality
*   **VS Code Settings Sync**: Standardize workspace settings.
*   **Fix Lint Errors**: Auto-fix ESLint/Prettier issues.
*   **Setup Husky Git Hooks**: Enforce quality check on commit.
*   **Generate .env from Example**: Safe environment setup.
*   **Generate TypeScript Types from API**: Sync Frontend types with Backend/Supabase.

### 🌐 Frontend (React + TypeScript)
*   **React Performance Profiling**: Debug slow components.
*   **Debug Infinite Re-renders**: Fix `useEffect` loops.
*   **Error Boundary Implementation**: Graceful failure handling.
*   **Implement Optimistic UI Updates**: Better UX for mutations.
*   **Setup Storybook**: Documentation for UI components (Shadcn/UI).
*   **Implement Dark Mode**: Theme handling.

### 🐍 Backend (Python + FastAPI)
*   **Python Backend Development with FastAPI**: Core validation and async patterns.
*   **Python Async Programming Expert**: Proper `async/await` usage.
*   **Python Pydantic & Data Validation**: (Implicit in FastAPI rule).
*   **Python Testing Best Practices**: Pytest patterns.

### 🗄️ Database (Supabase / PostgreSQL)
*   **Supabase Row Level Security (RLS)**: **CRITICAL** for security.
*   **Supabase Realtime**: For live updates (if needed).
*   **PostgreSQL Expert**: Schema design and optimization.
*   **SQL Query Optimization**: Performance tuning.
*   **Database Design & Normalization**: Data modeling best practices.

### 🧠 AI & LLM Integration
*   **LLM Integration & Prompt Engineering**: For building AI features.
*   **LangChain & AI Orchestration**: Managing complex chains.
*   **Vector Databases (Pinecone/Weaviate)**: If using embeddings (or pgvector in Supabase).

### 🧪 Testing & QA
*   **E2E Testing Setup (Playwright)**: Full system verification.
*   **Unit Testing Best Practices**: Frontend (Vitest) and Backend (Pytest).
*   **Integration Testing Strategies**: API <-> Frontend validation.

### 🚀 Production & DevOps
*   **Security Hardening Checklist**: Essential before launch.
*   **Rate Limiting**: Protect API endpoints.
*   **Cloud Security Architecture**: General security principles.
*   **Production Deployment Workflow**: Checklist for safe deploys.

## 📚 Recommended Reading Order
1.  **Agentic AI Rules** (Master the workflow first)
2.  **Supabase RLS & Security** (Secure the data)
3.  **FastAPI & Python Async** (Build robust API)
4.  **React Performance & Patterns** (Optimize the UI)
5.  **E2E Testing** (Verify the system)
