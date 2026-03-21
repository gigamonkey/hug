# Multi-Project Deployment Plan

## Goal

Run the same codebase against different spreadsheets — e.g. a dev/staging instance and a production instance — without hardcoding any spreadsheet IDs in the code.

## Background: Container-Bound vs. Standalone Scripts

The current script is **container-bound**: it was created via Extensions > Apps Script from within a spreadsheet, so `SpreadsheetApp.getActiveSpreadsheet()` works automatically. This binding is stored in the spreadsheet, not the script, and there's no official way to convert a container-bound project to standalone.

To share code across multiple independent spreadsheets, the script needs to be **standalone**, using `SpreadsheetApp.openById(id)` instead of `getActiveSpreadsheet()`.

## Approach: Script Properties for Per-Project Config

Script Properties (`PropertiesService.getScriptProperties()`) are stored per script project, not per deployment. This means each standalone script project gets its own independent property store — perfect for storing the spreadsheet ID.

### Code changes

Replace:
```javascript
SpreadsheetApp.getActiveSpreadsheet()
```
With:
```javascript
const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
SpreadsheetApp.openById(id);
```

Expose a `configure` function to set properties via `clasp run`:
```javascript
const configure = (config) => {
  const props = PropertiesService.getScriptProperties();
  Object.entries(config).forEach(([key, value]) => props.setProperty(key, value));
};
```

## Workflow for Setting Up a New Project Instance

1. **Create a new standalone script project:**
   ```bash
   clasp create --type standalone --title "Lottery Form - Dev"
   ```
   This updates `.clasp.json` with the new `scriptId`.

2. **Push the code:**
   ```bash
   clasp push
   ```

3. **Configure the project** by running the `configure` function with a JSON config file:
   ```bash
   clasp run configure --params "$(< config.dev.json)"
   ```
   Where `config.dev.json` looks like:
   ```json
   [{"SPREADSHEET_ID": "1BxiM..."}]
   ```
   Note: `--params` always takes a JSON array; each element is one argument to the function.

4. **Create a deployment:**
   ```bash
   clasp create-deployment -d "dev"
   ```

To switch a project to a different spreadsheet later, just re-run the `clasp run configure` step — no code changes or new version needed.

## Managing Multiple Projects Locally

Since `.clasp.json` only holds one `scriptId` at a time, keep separate config files for each project and swap them as needed:

```
.clasp.json.prod
.clasp.json.dev
config.prod.json
config.dev.json
```

Or use separate git branches, one per project instance.
