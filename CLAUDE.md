# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Clasp Commands

clasp is installed locally. Use `./node_modules/.bin/clasp` (or `npx clasp`):

```bash
./node_modules/.bin/clasp pull      # pull latest from Apps Script
./node_modules/.bin/clasp push      # push local changes to Apps Script
./node_modules/.bin/clasp open      # open project in Apps Script editor
```

To push, version, and redeploy in one step:

```bash
./redeploy "description of changes"
./redeploy --rollback <versionNumber>
```

There is no build step or test suite — changes are pushed directly to Google Apps Script and tested live.

## Architecture

This is a Google Apps Script web app — a single-page form for BHS students to rank Learning Communities (LCs) for the lottery.

**`Code.js`** — Server-side (Apps Script runtime):
- `doGet()` — serves the HTML page
- `saveRankings(data)` — appends a row to sheet 0 of the bound spreadsheet; uses `LockService` to prevent concurrent writes
- `getRankings(studentEmail)` — reads the most recent row for a given email from the sheet
- `getLcForStudent(email)` — looks up a student's current LC from the 'Upper grades' sheet (col 1 = email, col 2 = LC name); returns `null` if not found
- `whoami()` — returns the active user's email

**`index.html`** — Client-side (all JS is inline at the bottom):
- Calls server functions via `google.script.run.withSuccessHandler(...).fnName(args)`
- Three form modes, determined at load time:
  - `@berkeley.net` — staff/adult mode: all LCs start unranked (including AC/BIHS); only requires ranking at least one LC; shows extra fields to submit on behalf of a student
  - `@students.berkeley.net`, **not** in 'Upper grades' sheet — rising 10th grade mode: AC and BIHS are mandatory; AHA, AMPS, CAS are optional small schools
  - `@students.berkeley.net`, **in** 'Upper grades' sheet — upper grades mode (`isUpperGrade = true`): student's current LC is pre-placed in ranked area and cannot be removed; AC/BIHS become optional if not the assigned LC; different instructions shown
- `FORM_CLOSES` constant controls when the form locks (currently set to Apr 19, 2026 at 4pm PT)
- A loading spinner is shown until the form is fully initialized (async LC lookup + ranking fetch complete)
- `DEBUG` flag (currently `true`): users in `DEBUG_USERS` see a debug bar that lets them simulate any email address and update the UI in place without a page reload. Uses `resetUI()` / `setupUI()` / `queryElements()` / `setupEventListeners()` to rebuild state. A `uiVersion` counter prevents stale async callbacks from acting after an email change.

**Spreadsheet schema** (sheet 0, one row per submission):
`timestamp | submitter_email | student_email | rank1 | rank2 | rank3 | rank4 | rank5 | student_id | reason`

**'Upper grades' sheet** (sheet named 'Upper grades'):
`student_email | current_lc`
