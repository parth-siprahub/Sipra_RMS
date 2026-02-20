# Resource Management System

A Resource Management System (RMS) is a platform designed to efficiently plan, allocate and track the utilization of organizational resources—primarily human resources—across customers, projects and business units. It helps organizations ensure the right people with the right skills are assigned to the right work at the right time.

An RMS provides visibility into resource availability, skill sets, utilization, and billing status, enabling project and delivery managers to optimize utilization, reduce bench time, and improve project profitability. In service-based or body-shopping environments, it also streamlines processes such as staffing requests, approvals, onboarding, and offboarding of resources for customer engagements.

By centralizing resource data and integrating with project management and financial systems, an RMS supports better decision-making, forecasting, and operational efficiency.

This will be a Multi-tenancy RMS that support multiple customers (tenants) with isolated data, i.e keeping each tenant’s data, configuration, and branding physically isolated. Tenancy enables centralized upgrades, cost-efficiency, and faster onboarding while providing each customer their own secure workspace for resource planning, staffing, utilization and billing.

## Key Multi-tenancy design decisions
- Tenancy model: Separate database per tenant — maximum isolation and compliance.
- Authentication & authorization: Centralized identity provider (Auth0/Keycloak/Okta) with tenant-aware tokens.
- Role-based access control (RBAC) + optional fine-grained permissions per tenant.
- Audit logs, per-tenant logging, and secure backups.
- Tenant configuration & customisation - Tenant metadata service for branding, feature flags, billing plan, timezone, locales, quotas.
- Scalability & performance - Horizontal scaling for stateless services; isolate expensive tenants if needed.
- Rate limiting / quotas per tenant.
- Tenant onboarding (signup, admin user, initial data import)
- Admin portal (tenant admin + super-admin for platform)
- Integrations: HR/Payroll, ATS, calendar, project tools, accounting systems

### Feature List
- Dashboards: Display key metrics such as Total Requests, Onboarded Resources, Awaiting Onboarding, and To Be Shared. Include role-based breakdowns with counts (e.g., AWS Engineer: 2, Business Analyst: 21) and grand totals. Support filtering by status (e.g., All, Onboarded, Exit) and role.
- Resource Management: Track individual resource requests with details including Request ID, Request Date, Role, Type (New/Backfill), Status (e.g., Onboarded, Exit, Role Redundant, With customer), Name, Resume Submitted Date, Start Date, End Date, Exit Type (e.g., Resigned, Customer Terminated, No Show), Email, Technology, SOW, SOW Date, Project, and Years of Experience (YOE). Allow adding, editing, and viewing historical changes (e.g., multiple entries per Request ID for backfills or exits).
- SOW (Statement of Work) Tracker: Aggregate and display SOW details by SOW ID, Role, SOW Date, and Count of Request IDs. Support grand totals and filtering by status.
- Clent share: We need to provide customized (or a restricted view) for customer so that it hides internal or administrative data.	Create entries for customer-shared positions with fields: Role, Skills, JD Available (Yes/No), Requested On, Email Date, Email Reference, Status (e.g., Done, In Progress), Status Comments (e.g., In Sourcing), Position Available (e.g., Backfill Required), Sent to customer On (date), customer Status, Actions (e.g., Replacement Needed), Project, Type (e.g., New, Replacement), No of Positions (numeric). 
  

### Functional Requirements
- **customer Creation**
  - A tenant may have multiple customers, each customer will have multiple projects with different work arrangements
  - customer information capture (name, company, contact details, point of contacts)
  - Project details (project name, description, start date, end date, duration). Project details may be optional as some customers may not disclose the project details to vendor.
    
- **Job Profile**
  - Capture detailed job profile for the customer
  - Job description, role/designation, primary skills, secondary skills, experience level: junior/mid/senior, Rate card.

- **Resource Request Creation**
  - Create a formal approved resource request from a customer.
  - Auto-assign a request Id
  - Details to be captured
    - customer information
    - Project details
    - Resource requirements: choose job profile(s) and the head count. Aslo capture any specific requirment for this request
    - Priority level (urgent/high/medium/low)
    - Request status (new/with backoffice/with admin/ with customer/on-boarded/ exit/ role-closed)
    - A unique id will be assinged for every resource requested in the format <request Id>-sequence.
  - Generate SOW based on Job profiles
  - Should be able to download SOw in pdf format.

- **Resource Sourcing / Allocation**
  - Once a request is created and approved, the system moves into the sourcing or allocation phase — identifying and assigning suitable resources to fulfill the request.
  - The request status will now change to “With Backoffice” for the resourcing team to review.
  - AI-driven profile matching should automatically suggest suitable candidates based on:
    - Job profile
    - Skills
    - Experience
  - The workflow should define and enforce the shortlisting process, including:
  - Manual review or override options for the resourcing team.
  - Ability to record remarks or reasons for shortlisting/rejection.
  - Once a candidate is finalized, the backoffice can:
  - Convert the candidate’s profile into the approved RMS format.
  - Attach the finalized profile to the corresponding request sequence.
  - The request status is then updated to “With Admin”, marking readiness for the next phase.

- Capture Employee Details
  - Billed/unbilled
  - Capture joining details, project, customer, and reporting manager.
  - Upload required documents (offer, ID proof, NDA).
  - Track changes like project transfer, role change, customer change.
  - Exit / Offboarding
  - Record last working day, reason for exit (resignation, customer release, termination).
  - Few additional fields to map employee data with any customer information (e.g Jira id)

- **Admin Review & customer Submission** 
  - The admin verifies candidate details and ensures all mandatory checks are completed before customer submission.
  - Admin Validation Criteria
    - Profile format compliance (as per organization standards)
    - Completeness of details — job title, experience, skills, and location
    - customer-specific or project-specific criteria (e.g., rate card, notice period, documentation)
    - Approval from relevant internal stakeholders if required
  - customer Submission Workflow
    - Once validation is complete, the admin clicks “Send to customer”.
    - The system automatically:
        - Generates a formal email to the customer contact listed in the request.
        - Attaches the approved candidate profiles (in RMS format).
        - Includes summary details such as request ID, job role, and candidate information.
        - The request status is updated to “With customer”.
    - All communication details (email content, timestamp, recipients) should be logged in the system for tracking and audit.

- **customer onboarding/rejection**
  - customer feedback (accept/reject) is captured and updated in the system.
  - For approved profiles:
      - The request proceeds to the Onboarding stage.
      - Admin coordinates the onboarding process for each approved resource:
      - Record joining date and reporting manager/project details.
      - Status changes to “Onboarded”.
      - Billing Start Date
  - For rejected profiles:
      - Rejection reason(s) must be recorded.
      - There will be an option to choose a replacement profile.
      - On choosing this option, the current profile will be closed and new record should be added for and set for new profile sourcing.

- **Montly Billing**
- The system shall support automated monthly billing for each customer based on predefined billing rules and resource activity during the billing period.
- The system should generate invoices automatically at the end of every billing cycle (e.g., month-end) for each active customer.
- Invoices shall include all eligible resources that meet the billing criteria and display details such as:
    - Resource name
    - customer/project
    - Billing rate (hourly/daily/monthly)
    - Billable period (start and end date)
    - Total hours/days billed
    - Adjustments (if any)
    - Total amount due
- Billing Rules & Exceptions
  - Billing shall adhere to predefined business rules
  - E.g. If feedback received within 15 days of onboarding is marked "Not Satisfactory", the candidate’s work hours shall be excluded from billing, and no invoice shall be generated for that resource.
  - Future rules should be configurable through an admin interface.
- Billing Eligibility Criteria
  - A resource qualifies for billing if:
  - Status = Onboarded
  - Start Date ≤ current billing month
  - End Date ≥ current billing month (or blank if ongoing)
- Billable Amount Calculation
    - The billable amount should be automatically computed as:
    - Billable Amount = Job Rate × Active Days/Hours in Billing Month
    - Adjustments should be handled for:
      - Mid-month onboarding or exits (pro-rated billing)
      - Approved/unpaid leaves
- Timesheet / Effort Integration
  - The system shall allow upload or integration of total hours worked from external systems such as Jira or any other time tracking system.
  - Uploaded data should be validated and mapped to respective resources and customers.
- The finalized billing data (per customer, per resource) should be exportable to CSV format

- **Payroll Processing**
  - For future enhancement  

- **Resource Exit / Closure**
  - When a resource’s engagement ends (due to release, project completion, or early exit), the system should allow initiating the exit process for that resource.
  - Exit Initiation
  - The Admin or Project Owner triggers the exit process for the specific resource under the request.
  - Exit reasons can include:
    - reason
    - last working date
    - Replacement or Closure Decision
  - During exit processing, the system must prompt the user to select one of the following options:
  - Replacement Required
    - The system automatically creates a linked resource request with a reference to the original Request ID and sequence, SOW etc.
    - The new request inherits key details (customer, project, job role) to minimize re-entry.
    - Status set to Backfill.
  - Request Closed
    - If no replacement is required, the system marks the resource as released.
    - The original request’s resource sequence is updated to “Closed.”
- Dashboards
  - System should be able to provide wide range of dashboards: including
  - Overall Resource Utilization (%)
  - Active Projects / customers
  - Upcoming Demand (open positions vs filled)
  - Billing vs Non-Billing Ratio
  - Attrition Rate
  - Average Time to Onboard
  - Gauge chart for Utilization
  - Trend line for monthly utilization

- Non-Functional Requirements
  - Performance: Handle up to 500+ records (based on Resource Data rows) with quick loading (<2 seconds for dashboards); support real-time updates in SaaS environment.
  - Usability: Intuitive UI with tabs/sidebars mirroring Excel sheets (e.g., Dashboard, Resource Data); responsive design for web browsers.
  - Data Security and Compliance: Store sensitive data (e.g., emails, names) securely; support GDPR-like features for personal data (e.g., YOE, resumes).
  - Scalability: As a SaaS, support multi-tenant architecture for multiple organizations; handle growing data (e.g., new SOWs, roles).
  - Reliability: Data backup and recovery; error handling for invalid inputs (e.g., non-numeric YOE).
  - Accessibility: WCAG compliance for color contrasts and keyboard navigation.
  - Integration: Export to Excel/CSV; import from similar formats.

- Additional Suggested Requirements (Missing from Best Standards):
  - Security: Multi-factor authentication (MFA) and encryption for data at rest/transit.
  - Performance: Caching for frequent queries (e.g., dashboard metrics) to support high user concurrency.
  - Usability: Dark mode and customizable themes for better user experience.
  - Analytics: Export to PDF with embedded charts for professional reports.
  - Compliance: Automated data retention policies (e.g., archive old exits after 2 years).
 
  - 


