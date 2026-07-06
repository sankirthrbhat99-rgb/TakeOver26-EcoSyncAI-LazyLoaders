# EcoSync AI — Product Requirements

## Problem Statement
Build a full-stack Web Application named "EcoSync AI", an autonomous supply chain and green inventory optimization platform for manufacturing SMEs. When any tracked item drops below its safety threshold, three agents run: Demand Forecaster analyzes the deficit; Eco-Scout ranks top-3 suppliers by balanced cost + carbon score; Procurement Agent drafts an RFQ email and flags it for human review. An admin approves the order, dispatching the RFQ and topping up stock.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT cookie auth. Bcrypt password hashing.
- Multi-agent chain: Python asyncio background tasks. Rule-based ranking, LLM-drafted RFQ emails (Claude Sonnet 4.6 via Emergent Universal Key).
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts + sonner toasts.
- Design: Warm gray canvas (#F9F9FB), white cards, deep forest green (#15803D) accents, amber warning (#B45309), dark terminal (#0F172A). Fonts: Outfit / IBM Plex Sans / JetBrains Mono.

## User Personas
- **Ops Admin** (SME manufacturing lead): logs in, reviews low-stock alerts, approves RFQs, tracks carbon savings.

## Implemented (Feb 2026)
- JWT email/password auth with seeded admin (admin@ecosync.ai / EcoSync2026!).
- Inventory + Suppliers + AgentLogs + PurchaseOrders collections with seed data (4 items, 13 suppliers across 4 component types).
- Multi-agent loop: Demand Forecaster → Eco-Scout (top-3, normalized cost+carbon composite) → Procurement Agent (Claude Sonnet 4.6 RFQ draft, safe fallback).
- Boot-time auto-trigger for items already below threshold (18650 lithium cell + copper wire seeded low).
- REST endpoints for inventory, suppliers, agent-logs, purchase-orders, dashboard stats, approvals.
- Frontend: Login page, fixed-sidebar layout, Dashboard (KPIs + Recharts cumulative CO₂ area chart + live terminal), Inventory (warning-row highlighting + consume/trigger actions), Suppliers (carbon badges + filter), Approvals (RFQ preview + Approve Order), Live Agent Terminal (2s polling, color-coded agents + status pulse).

## Prioritized Backlog
- P1: Email dispatch for approved RFQ (SMTP or Resend integration).
- P1: Manual inventory add/edit UI (currently seed-only).
- P2: Multi-user roles (viewer vs approver).
- P2: WebSocket streaming instead of polling.
- P2: Historical forecast chart (demand vs actual).
- P2: PDF export of approved POs.
