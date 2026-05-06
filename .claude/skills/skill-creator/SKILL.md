---
name: skill-creator
description: Create new skills, modify and improve existing skills. Use when users want to create a skill from scratch, edit or optimize an existing skill, or turn a workflow into a reusable skill.
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

## Process

1. Decide what the skill should do and roughly how
2. Write a draft of the skill
3. Create a few test prompts and try them
4. Evaluate the results qualitatively
5. Rewrite the skill based on feedback
6. Repeat until satisfied

## Capture Intent

Start by understanding the user's intent:

1. What should this skill enable Claude to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases?

## Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies.

## Write the SKILL.md

Based on the user interview, fill in:

- **name**: Skill identifier (lowercase, hyphens)
- **description**: When to trigger, what it does. Make it "pushy" — include specific contexts so Claude doesn't undertrigger.
- **body**: Instructions, examples, patterns

### Skill Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code
    ├── references/ - Docs loaded as needed
    └── assets/     - Templates, icons, fonts
```

### Writing Style

- Use imperative form in instructions
- Explain the **why** behind everything — don't just write MUSTs
- Include examples with Input/Output format
- Keep SKILL.md under 500 lines
- Start with a draft, then improve with fresh eyes

### Description Tips

The description is the primary triggering mechanism. Make it specific:

Bad: `"Format data"`
Good: `"Analyze and format CSV data files. Use whenever the user mentions data analysis, CSV files, tabular data, spreadsheets, or wants to understand data structure."`

## Iteration Loop

1. Apply improvements to the skill
2. Rerun test cases
3. Ask for user feedback
4. Repeat until happy

### How to improve

- **Generalize from feedback** — don't overfit to test examples
- **Keep the prompt lean** — remove what's not pulling its weight
- **Explain the why** — understanding beats rigid instructions
- **Look for repeated work** — bundle scripts that subagents keep reinventing
