---
name: daily-progress
description: After completing a day's work, write a detailed progress log in docs/progress/ and check off completed items in docs/planning/plan.md
---

# Daily Progress Skill

Run this procedure after completing all tasks for a given day (e.g., Day 5).

## Step 1 — Identify the Day Number

Determine which day was just completed by reading `docs/planning/plan.md` and finding the current day's section.

## Step 2 — Check Off Plan Items

Open `docs/planning/plan.md` and change each completed item from `- [ ]` to `- [x]` for the current day's section. Do NOT touch items from other days.

## Step 3 — Write the Progress Log

Create or overwrite `docs/progress/dayN.md` (where N is the day number) with the following structure. The log must be **specific enough that a new session can reconstruct the full project state without re-reading contract source files**.

### Required Sections

```markdown
# 📅 Progress Log: Day N

## 🛠️ Accomplished Tasks

### [Contract or Component Name]
- What was added or changed, with **exact function signatures**.
- For new structs: include the full field list with types and inline comments.
- For new functions: include caller, guards/modifiers, step-by-step flow, and emitted events.
- For new state variables: include type, visibility, and purpose.
- For design decisions: explain the WHY, not just the WHAT.

### [Repeat for each contract/component touched]

### Compilation / Verification
- Result of `npx hardhat compile` (errors, warnings, deployed sizes).

## 📊 Cumulative Contract State

| Contract | Status | Lines | Key Interfaces |
|---|---|---|---|
| `ContractName.sol` | ✅ Complete / 🔨 In progress | N | `func1()`, `func2()`, ... |

### What's NOT implemented yet
- List remaining functions/features with their planned day.
```

### Rules for Writing Progress Logs

1. **Include function signatures** — not just names. Write `withdrawAtMaturity(uint256 depositId)`, not just "withdrawal function".
2. **Include struct fields** — if a struct was added or modified, show all fields with types.
3. **Include the formula** — if there's a calculation (interest, penalty), write it out: `expectedInterest = (amount * aprBps * tenorSeconds) / (365 * 86400 * 10000)`.
4. **Include guard conditions** — what requires/modifiers protect each function.
5. **Include event names and parameters** — full indexed/non-indexed parameter list.
6. **Include design decisions** — WHY was a choice made (e.g., "penalty goes to feeReceiver, not vault, to separate fee revenue from interest reserves").
7. **Include the cumulative state table** — so a new session can see at a glance what exists and what's missing.
8. **Include "What's NOT implemented yet"** — with planned day references.

## Step 4 — Verify

- Re-read the updated `plan.md` to confirm only the correct items are checked.
- Re-read the new `dayN.md` to confirm it follows the structure above and contains enough detail for session recovery.
