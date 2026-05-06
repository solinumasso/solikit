---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code. Use this skill whenever the user wants to plan an implementation, break down a complex task, or needs a structured approach before coding.
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain.

**Announce at start:** "Je vais utiliser la skill writing-plans pour créer le plan d'implémentation."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Scope Check

If the spec covers multiple independent subsystems, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for.

- Design units with clear boundaries and well-defined interfaces
- Prefer smaller, focused files over large ones that do too much
- Files that change together should live together
- In existing codebases, follow established patterns

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

    # [Feature Name] Implementation Plan

    **Goal:** [One sentence describing what this builds]

    **Architecture:** [2-3 sentences about approach]

    **Tech Stack:** [Key technologies/libraries]

    ---

## Task Structure

    ### Task N: [Component Name]

    **Files:**
    - Create: `exact/path/to/file.py`
    - Modify: `exact/path/to/existing.py:123-145`
    - Test: `tests/exact/path/to/test.py`

    - [ ] **Step 1: Write the failing test**
    - [ ] **Step 2: Run test to verify it fails**
    - [ ] **Step 3: Write minimal implementation**
    - [ ] **Step 4: Run test to verify it passes**
    - [ ] **Step 5: Commit**

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the content)
- Steps that describe what to do without showing how

## Remember
- Exact file paths always
- Complete code in every step
- Exact commands with expected output
- DRY, YAGNI, frequent commits

## Self-Review

After writing the complete plan, check against the spec:

1. **Spec coverage:** Skim each requirement. Can you point to a task that implements it?
2. **Placeholder scan:** Search for red flags from the "No Placeholders" section
3. **Type consistency:** Do types and method names match across tasks?

Fix issues inline. No need to re-review.
