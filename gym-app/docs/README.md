# Gym App Documentation

This folder organizes documentation for the Next.js frontend app.

## Structure

- `architecture/`
  - High-level frontend architecture and design decisions
  - e.g., `ARCHITECTURE_ASSESSMENT.md`
- `frontend/`
  - Routes and UI flow documentation
  - e.g., `ROUTES.md`
- `backend-integration/`
  - Frontend ↔ Backend integration notes and schemas
  - e.g., `backend-schema-integration.md`, `backen-imp.md`

PDF exports are placed alongside their corresponding Markdown files in each folder.

## Notes
- Do not include real secrets in docs. Use placeholders like `YOUR_...`.
- For environment variables, prefer `.env.local` and never commit it.
- If adding new docs, follow the folder structure above.
