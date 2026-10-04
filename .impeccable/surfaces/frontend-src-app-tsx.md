---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: ["frontend/src/index.css","frontend/src/components/DispatchProgress.tsx"]
---

## Scope and visitor mode

Shared web interface foundation for the authenticated process lookup flow. Operate.

## Audience and task

People who know a process number and want to locate it without legal or technical knowledge. They first establish an account and confirm the remote session before protected content appears.

## Content and constraints

Use only Portuguese (Brazil) product copy and real authentication/session states. This increment includes shared form, message, progress, and title components; it does not publish process data or invent lookup results. Session truth comes from `/api/auth/session`; logout success comes from `/api/auth/logout`. Never store credentials or session secrets in Web Storage.

## Chosen direction and memorable moment

Contemporary dispatch-panel UI with a centered intake work area, a three-step progress rail, a concise status strip, and a visibly withheld protected destination region. Graphite frame, cool white work surface, cobalt route accent, amber only for exceptions, restrained sans-serif and tabular figures. Approved north-star composition: `.impeccable/mocks/dispatch-comp-c.png`.

The key moment is a protected region remaining visibly unavailable until the remote session check succeeds, then disappearing immediately when the session is invalidated or logout begins.

## Inventory and implementation

| Comp element | Implementation |
| --- | --- |
| Product title and central work area | Semantic HTML and Tailwind/CSS |
| Three-step progress rail | Accessible React component and CSS geometry |
| Form fields, action, status strip | Semantic React components and CSS states |
| Login, registration, email confirmation, and resend | Public screens share the dispatch panel, accessible inline feedback, and explicit actions |
| Protected boundary/empty region | Semantic HTML/CSS; no sample process rows |
| Focus, error, disabled, and pending states | Native controls, ARIA relationships, CSS |

## Unresolved decisions

Process search and destination are implemented in tasks 6 and 9. The public authentication screens are implemented in task 8 and inherit the approved dispatch-panel composition. Full visual interaction review remains part of task 10.
