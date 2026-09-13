# 001. Measure active time from focused-tab visibility

Date: 2026-09-13
Status: accepted

## Context

Visit Budget 1.1 needs a daily time-budget option that remains local, legible,
and compatible with the extension's existing tab, window-focus, navigation,
and alarm events. It must not turn into behavioural surveillance or require
people to understand an opaque estimate of attention.

## Options considered

1. Count time whenever a matching tab is the selected tab in focused Chrome.
   This is observable through existing events, stops when Chrome loses focus,
   and maps directly to what the user sees.
2. Estimate attention from keyboard, mouse, or browser-idle activity. This may
   avoid counting a visible idle page, but it is intrusive, error-prone for
   reading, and expands the product's privacy surface.
3. Count wall-clock time from navigation until leaving the page. This is simple
   but wrongly charges background tabs and other applications.

## Decision

Use focused-tab visibility: active time counts only while a matching tab is
selected in the focused Chrome window. Use the existing service-worker event
flow and one-shot maintenance alarms to settle segments and enforce expiry.

## Consequences

The behaviour is easy to explain and needs no new permission or external
service. A visible page will still spend time while a person is reading or away
from their desk; this is intentional and disclosed. The worker must store an
active segment so elapsed time can be settled accurately after service-worker
suspension or the next browser event.
