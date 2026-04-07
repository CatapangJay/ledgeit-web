---
name: task-planning
description: "Skill to generate project tasks and subtasks spanning software planning, development, testing, and finishing. Use when creating sprint work breakdowns, task templates, or checklists for project phases."
---

# Task Planning Skill

Purpose
- Provide a reusable, opinionated workflow for creating tasks and subtasks that cover software planning, development, testing, release, and finishing activities.

When to use
- Need a full work breakdown for a feature, epic, or project
- Create consistent task templates for sprints or milestones
- Generate checklists and acceptance criteria for QA and release

Decision points
- Scope granularity: epic-level vs feature-level vs story-level
- Team composition: frontend/backend/infra/qa/design responsibilities
- Delivery cadence: one sprint vs multiple sprints

Outputs
- Task list with titles, descriptions, estimates, dependencies, and owners
- Subtask breakdown per task (design, implementation, review, QA, docs)
- Acceptance criteria and done checklist
- Suggested labels/tags and priority

Workflow (Recommended)

1. Define Scope
- Ask: "What is the goal, expected user value, and success metric?".
- Produce: short scope statement and target milestone.

2. Identify Major Phases
- Planning, Design, Implementation, Testing, Release, Post-release/Finish

3. Break Down by Component
- For each phase list components (API, UI, DB, infra, migrations, docs)

4. Create Tasks and Subtasks
- Task template example:
  - Title: Implement <component> for <feature>
  - Description: short summary + links to spec/design
  - Subtasks: Design review, Implement, Unit tests, Integration tests, E2E tests, Code review, Docs, Release/Deploy
  - Acceptance criteria: concrete checklist items
  - Estimate: story points or hours
  - Dependencies: list other tasks
  - Owner: role or person

5. Add QA & Release Checks
- Define test matrix (unit, integration, e2e, performance, accessibility)
- Deployment checklist (migrations, feature flags, rollbacks)

6. Finalize and Handoff
- Mark ready for sprint planning or PR work
- Attach design links, API specs, and sample data

Quality Criteria / Completion Checks
- All tasks have at least one owner and an estimate
- Acceptance criteria are measurable and testable
- All required environment/migration steps are documented
- Tests exist or are planned for critical paths

Templates (prompts to use with this skill)
- Generate a sprint-ready task breakdown for a feature:
  "Create tasks and subtasks for feature: <short description>. Team: <roles>. Deliver by: <date>. Priority: <high|medium|low>."

- Convert a spec to a work breakdown:
  "Read this spec: <link>. Produce tasks with estimates and acceptance criteria for implementation and QA."

- Produce QA checklist for a task:
  "Create QA checklist for task: <task title>. Include unit, integration, e2e, perf, and accessibility checks."

Examples (short)
- Input: "Build passwordless login using magic links" → Output: tasks for design, backend auth, email infra, front-end flows, tests, rollout.

Extensibility
- Can be adapted to specific team templates (GitHub Issues, Jira stories, Azure Boards)
- Add `applyTo` or triggers in description to surface for repo-specific files

Clarifying questions the agent should ask when invoked
- Is this for an epic, feature, or bugfix?
- Which team members or roles will own tasks?
- Preferred estimation unit: story points or hours?
- Target delivery date or milestone?

Notes for maintainers
- Keep `description` keywords aligned with repo conventions so the skill surfaces correctly.
- Validate frontmatter YAML if editing.

---
