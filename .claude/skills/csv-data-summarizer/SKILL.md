---
name: csv-data-summarizer
description: Analyzes CSV files, generates summary stats, and produces quick visualizations. Use this skill whenever the user uploads or references a CSV file, asks to summarize, analyze, or visualize tabular data, requests insights from CSV data, or wants to understand data structure and quality.
---

# CSV Data Summarizer

This Skill analyzes CSV files and provides comprehensive summaries with statistical insights and visualizations.

## When to Use This Skill

Claude should use this Skill whenever the user:
- Uploads or references a CSV file
- Asks to summarize, analyze, or visualize tabular data
- Requests insights from CSV data
- Wants to understand data structure and quality

## How It Works

**DO NOT ASK THE USER WHAT THEY WANT TO DO WITH THE DATA.**
**IMMEDIATELY AND AUTOMATICALLY:**
1. Run the comprehensive analysis
2. Generate ALL relevant visualizations
3. Present complete results

### Automatic Analysis Steps:

1. **Load and inspect** the CSV file
2. **Identify data structure** - column types, date columns, numeric columns, categories
3. **Determine relevant analyses** based on what's actually in the data
4. **Only create visualizations that make sense** for the specific dataset:
   - Time-series plots ONLY if date/timestamp columns exist
   - Correlation heatmaps ONLY if multiple numeric columns exist
   - Category distributions ONLY if categorical columns exist
5. **Generate comprehensive output** automatically including:
   - Data overview (rows, columns, types)
   - Key statistics and metrics relevant to the data type
   - Missing data analysis
   - Multiple relevant visualizations (only those that apply)
   - Actionable insights based on patterns found

### Behavior Guidelines

- Immediately run the analysis script
- Generate ALL relevant charts automatically
- Provide complete insights without being asked
- Be thorough and complete in first response
- Act decisively without asking permission
