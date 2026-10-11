---
name: College club administration
colors:
  background: "#f4f7fa"
  surface: "#ffffff"
  primary: "#0f766e"
  on-primary: "#ffffff"
  text: "#172b41"
  muted: "#637487"
  border: "#dde5ec"
typography:
  font-family: "Arial, Helvetica, sans-serif"
  heading-weight: 700
  body-size: "14px"
spacing:
  base: "4px"
rounded:
  panel: "16px"
  control: "8px"
components:
  panel: "White surface, fine border, restrained shadow"
  button: "Teal primary or outlined neutral; visible keyboard focus"
  table: "Tabular numbers, clear column headers, horizontal scrolling on mobile"
---

# Purpose
Help college administrators track registrations, compare department quotas, and export records.

# Layout
A wider admin-only container, a clear page header, four concise metrics, one selectable club capacity table, an export panel, and the latest 50 registrations. The student registration layout remains independent.

# Interaction
Keep real authentication, manual refresh, and existing CSV exports. Preserve visible data during refresh. Show explicit loading, error, and empty states. Search applies to the latest 50 records. AWS clubs remain excluded from selectable administrative club views.

# Accessibility
Use associated form labels, table header scopes, text alongside status colors, reduced-motion support, and controls that wrap at small screen widths.
