# QA REPORT — HISTORIA: 1936 PC MAX

## Automated checks passed

- JavaScript syntax: `data.js`, `engine.js`, `ai.js`, `ui.js`, `main.js`
- Static server routes: all runtime files return HTTP 200
- Complex mobilisation parsing:
  - “Bring every reasonably available man…”
  - skilled-worker exemption
  - stability safeguard
  - 18-month duration
- Conditional deployment parsing:
  - “Move troops toward Poland but do not attack; retreat if Poland responds militarily.”
- Division-based movement:
  - “Move two divisions into the Rhineland.”
- Compound orders:
  - military budget cut + air-force expansion
  - tax increase + rearmament
  - contradictory diplomatic messages to different countries
- Small-action semantics:
  - police budget cuts
  - military pay cuts
  - tariff removal / resource trade
  - public diplomatic insults
- Diplomatic assurance memory and promise violation consequences
- Persistent covert operations
- Regional war creation and progression
- AI planner activity
- save / load
- rewind
- state serialization
- five-year continuous simulation stability

## Long-run test

A five-year open-sandbox simulation completed to December 1940 without a JavaScript exception or unserializable state.

## Browser test environment note

A headless Chromium binary exists in the build sandbox, but Chromium itself aborts because its GPU process cannot initialize in this container. This is an environment limitation, not a page error. Static serving and engine/runtime checks were therefore used instead.
