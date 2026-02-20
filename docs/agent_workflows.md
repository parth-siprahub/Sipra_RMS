# Agent Workflows & Skills

This project is equipped with a suite of "Agent Skills" to standardize planning, development, and debugging.

## 🛠️ Skills Inventory

| Skill | Purpose | Key Trigger |
|---|---|---|
| **`superpowers`** | Meta-framework for development | *Always active* |
| **`brainstorming`** | Collaborative design & requirements gathering | "Let's build X" |
| **`writing-plans`** | TDD-based implementation planning | "Create a plan for X" |
| **`ac-spec-generator`** | structured requirements & AC generation | "Generate feature list" |
| **`frontend-design`** | UI/UX best practices & modern aesthetics | "Design a landing page" |
| **`ui-ux-pro-max`** | Advanced design systems & component rules | "Create a design system" |
| **`react-doctor`** | React code health & best practices check | "Check this component" |
| **`supabase-postgres...`** | High-performance database rules | " Optimize this query" |
| **`systematic-debugging`** | Root cause analysis protocol | "Fix this bug" |
| **`test-driven-dev...`** | TDD workflow rules | "Implement this feature" |

---

## 🚀 The Golden Workflow

### 1. Phase: Discovery & Design
**Goal:** clarity before code.
*   **Step 1:** `brainstorming` - Interactive dialogue to refine requirements.
    *   *Output:* `docs/plans/YYYY-MM-DD-topic-design.md`
*   **Step 2:** `ac-spec-generator` - Convert design to atomic, testable features.
    *   *Output:* `docs/specs/feature_list.json`
*   **Step 3:** `writing-plans` - Break down implementation into 2-5 min tasks.
    *   *Output:* `docs/plans/YYYY-MM-DD-topic-impl.md`

### 2. Phase: Implementation (TDD)
**Goal:** Working, tested code.
*   **Rule:** 🔴 Red -> 🟢 Green -> 🔵 Refactor
*   **Step 1:** Write a failing test for the specific task (`test-driven-development`).
*   **Step 2:** Write minimal code to pass.
*   **Step 3:** Commit.
*   **Guidelines:**
    *   **Frontend:** Apply `frontend-design` & `ui-ux-pro-max` rules.
    *   **Backend:** Apply `supabase-postgres-best-practices`.

### 3. Phase: Verification & Polish
**Goal:** Production quality.
*   **Step 1:** Verified by tests (from Phase 2).
*   **Step 2:** `react-doctor` audit for frontend code.
*   **Step 3:** `verification-before-completion` check.

### 4. Phase: Debugging (When needed)
**Goal:** Fix root causes, not symptoms.
*   **Protocol:** `systematic-debugging`
    1.  **Read errors** carefully.
    2.  **Reproduce** reliably.
    3.  **Find root cause** (Trace data flow).
    4.  **Hypothesis -> Test -> Fix**.
    5.  **NO random fixes.**

---

## 📂 Documentation Structure

*   `docs/plans/` - Design docs & Implementation plans.
*   `.agent/skills/` - Source of truth for all skill instructions.
