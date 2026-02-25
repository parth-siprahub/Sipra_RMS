# RMS SipraHub: Product & Flow Guide 🚀

Welcome to **RMS SipraHub**, an industry-grade Resource Management System designed for precision tracking of contracts (SOWs), demands (Resource Requests), and talent (Candidates).

---

## 1. Core Concepts & Data Mapping

To understand the system, you must understand how data relates:

### 📄 SOW (Statement of Work)
The "Contract" layer. It defines:
- **Client Name**: Who we are working with.
- **Max Resources**: The ceiling count for this contract.
- **Validity**: Start and End dates.
- **Mapping**: Serves as the parent for all Resource Requests raised under this budget.

### 📋 Job Profile
The "Definition" layer. It defines:
- **Role Name**: e.g., Senior Full Stack Engineer.
- **Technology**: e.g., React, FastAPI.
- **Experience**: e.g., 5-8 years.
- **Mapping**: Reusable across any SOW or Request.

### 🎫 Resource Request (Demand)
The "Need" layer. It maps a **Job Profile** to an **SOW**.
- **The Bridge**: It says "We need 1 person matching [Job Profile A] for [SOW B]".
- **Mapping**: 1 Request -> 1 SOW + 1 Job Profile.

### 👤 Candidate
The "Talent" layer.
- **Mapping**: 1 Candidate is linked to 1 **Resource Request**. 
- **Life Cycle**: Candidates move through the pipeline (New → Submitted → Interview → Selected → Onboarded).
- **Utilization Impact**: ONLY when a candidate is marked as **ONBOARDED**, they count towards the SOW's "Utilization" bar.

---

## 2. Operational Flow (The "Golden Path")

Follow these steps to test the system effectively:

### Step 1: Initialize Masters
1. Go to **Job Profiles** and create a few roles (e.g., "Frontend Dev", "Backend Dev").
2. Go to **SOWs** and create a contract with a `Max Resources` limit (e.g., 5).

### Step 2: Raise a Demand
1. Go to **Resource Requests**.
2. Click **New Request**.
3. Select your **SOW** and your **Job Profile**.
4. Set the priority (e.g., URGENT).

### Step 3: Source & Process Candidates
1. Go to **Candidates**.
2. Click **Add Candidate**.
3. Link them to the **Resource Request** you just created.
4. Open the Candidate's details and move them through stages (e.g., "Interviewing").

### Step 4: Finalize Onboarding
1. Once a candidate passes all rounds, change their status to **ONBOARDED**.
2. Go back to the **SOWs** page.
3. Observe the **Utilization Bar** — it will now reflect the newly onboarded resource against the SOW's maximum limit.

---

## 3. Dashboard Insights
The Dashboard provides a bird's-eye view:
- **Pipeline Chart**: Visualizes how many candidates are at each stage globally.
- **SOW Status**: High-level count of active vs. inactive contracts.
- **Recent Activity**: Quick access to the latest movements.

---

## 4. Addressing the "SOW Mapping Gap" 🔍

You mentioned a feeling of a "gap" in SOW mapping. Based on the current architecture:

**Current State**:
- Any **Job Profile** can be used for any **SOW**.
- There is no hard validation that says "SOW 123 only allows Java Developers".

**The Potential Gap**: 
If your business logic requires that an SOW *pre-defines* allowed roles and rates, the current system is "too flexible." 
- **Fix Recommendation**: We could add a "Mapping" table that links specific Job Profiles to specific SOWs, effectively creating a "Rate Card" for each contract.

---

## 5. UI & Typography Updates
We have recently applied several "Premium" UI refinements:
- **Fonts**: Switched from technical mono-fonts to **Outfit** (Headings) and **Inter** (Body) for a sleek, modern SaaS feel.
- **Dashboard Visibility**: Increased font size and contrast for the Pipeline chart labels (they are now clearly visible at a 45-degree angle).
- **Density**: Adjusted global font size to **15px** to provide better information density for data-heavy views.
