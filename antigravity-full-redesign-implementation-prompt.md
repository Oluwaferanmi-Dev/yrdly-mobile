# Antigravity Prompt — Apply the Figma Make Redesign to the 65 Untouched Screens

## Context

The audit is done and confirmed with evidence. Of 76 claimed items, only 10 were actually touched (new admin/withdraw/alert screens and 4 new shared components). The other 65 — including Profile, Settings, Messages, Chat, and the Home Feed — still run the pre-redesign UI. `src/constants/tokens.ts` exists but is imported by only 4 files.

This prompt is the real implementation work: port the actual Figma Make designs into these 65 screens, for real, with proof at every step.

## Ground Rules (read before starting)

1. **The `YRDLY NEW DESIGNS/` folder is the ground truth for visual spec** — layout, spacing, colors, copy, component structure. It's a React web export (has `App.tsx`, `vite.config.ts`, etc.), so you are *porting/translating* it into React Native idioms (View/Text/Pressable/StyleSheet or the project's existing styling approach), not copy-pasting web JSX directly.
2. **Preserve all existing business logic exactly.** Every screen you touch already has working data-fetching, Supabase queries, navigation handlers, and validation. Your job is to change presentation (JSX structure, styles, tokens), not behavior. Do not alter a single query, mutation, or handler unless the new design explicitly requires a new interaction the old one didn't have — and if so, flag it before writing it, don't just add it silently.
3. **Do not regress the six confirmed business-logic rules** from the last audit: the unpersisted marketplace-conversation rule, multi-tier ticket free/paid logic, business directory using real Supabase data, `COMMISSION_RATE = 0.03`, Tickets vs. My Events staying distinct, and the 5-tab navigation structure with Settings only reachable from Profile.
4. **Show diffs before every commit. Do not commit anything without my explicit approval of the exact diff.** Work in the batches below; stop and show me the diff at the end of each batch.
5. **If a screen in the 65 has no corresponding design in `YRDLY NEW DESIGNS/`,** do not invent a new layout for it. Check first. If nothing matches, apply only a "tokens and consistency" pass (correct colors/radius/spacing/typography to match the design system) and leave the existing structure intact — flag these screens explicitly as "no source design found, token-only pass" so I know the difference.
6. **No Supabase migrations, edge function deployments, or schema changes** without separately showing me the exact statements and getting approval first — this task is front-end only.
7. **After each batch, report with literal evidence** — not summaries. For every screen in the batch: confirm the diff exists (paste `git diff --stat` for that batch), confirm it imports from `tokens.ts` (grep), and confirm `tsc --noEmit` passes on the changed files with literal output. If you cannot get a clean literal result, say so — do not report "Pass" without pasting the actual command output, exactly like last time's audit required.

---

## Batch 1 — Foundation

1. Locate the actual design-tokens/theme source inside `YRDLY NEW DESIGNS/` (likely a `theme.ts`, `tokens.ts`, `globals.css`, or Tailwind config file). Compare it against the current `src/constants/tokens.ts` and expand `tokens.ts` so it fully covers every color, radius, spacing, and typography value the new designs actually use — not just the subset currently there.
2. Re-verify the bottom Tab Bar (`src/app/(tabs)/_layout.tsx`) against the Navigation design spec in full — active/inactive states, the floating Create button, spring press feedback, safe-area handling — and bring it fully in line, not just the single green-button tweak from before.
3. Show the diff for both files. Wait for my approval before continuing to Batch 2.

## Batch 2 — Home Feed

Redesign `src/app/(tabs)/index.tsx`, `src/components/PostCard.tsx`, `src/components/CommentsBottomSheet.tsx`, `src/components/PostOptionsSheet.tsx`, `src/components/NotificationsSheet.tsx`, and the quick-post entry component, matching the Home Feed design (header, location context, quick-post entry, 4-part post hierarchy, marketplace/event/place post variants, empty/loading/error states). Preserve all existing feed-fetching logic, like/comment/save handlers, and post-type branching exactly as-is.

Show the diff. Wait for approval.

## Batch 3 — Profile & Settings

Redesign `src/app/(tabs)/profile.tsx` (identity header, stats bar, Quick Access grid, Posts/Saved tabs) and the full Settings tree: `src/app/settings/index.tsx` plus `transactions.tsx`, `payouts.tsx`, `payout-settings.tsx`, `privacy.tsx`, `location.tsx`, `notifications.tsx`, the Dark Mode toggle row, and the shared `SettingRow`/`SettingSection` components — matching the grouped IA (Commerce / Privacy & Location / Preferences / Account) from the Settings design spec exactly, including removing any leftover profile-card or promotional content from the top of Settings if present.

For `guidelines.tsx`, `help.tsx`, `report-issue.tsx`, and `edit-profile.tsx` — check `YRDLY NEW DESIGNS/` for matching source files first. If found, port them fully; if not, apply the token-only pass and flag it.

Show the diff. Wait for approval.

## Batch 4 — Messaging

Redesign `src/app/(tabs)/messages.tsx`, `src/app/chat/new.tsx`, and `src/app/chat/[id].tsx` — inbox with category filter pills, conversation rows, search, the marketplace context banner, message bubbles with delivery states, and the composer — per the Messaging design spec. Preserve the unpersisted-conversation rule exactly.

Show the diff. Wait for approval.

## Batch 5 — Explore & Discovery

Redesign `src/app/(tabs)/explore.tsx` (segmented Discover/Marketplace/Events/Places nav), `src/app/marketplace/[id].tsx`, `src/app/events/[id]/index.tsx`, `src/app/businesses/[id].tsx`, and `src/app/community.tsx` (or `community/index.tsx`) per the Explore design spec — including the Discover people cards, marketplace product grid/filters, event cards/ticket states, and place/business cards.

Show the diff. Wait for approval.

## Batch 6 — Quick Access Destinations & Creation Flows

Redesign `src/app/tickets.tsx`, `src/app/my-events.tsx`, the "My Business" owner view inside `src/app/businesses/[id].tsx`, and the full creation suite: `src/app/new-post.tsx` (General Post / Item for Sale / Event tabs), the `CreateSheet` component, and the multi-tier ticket configuration UI inside event creation — per the Quick Access & Creation design spec, including the ticket-tier accordion, free/paid badge logic, and validation states.

Show the diff. Wait for approval.

## Batch 7 — Remaining Screens (Check-First, Token-Only Where No Design Exists)

For each of the following, first check `YRDLY NEW DESIGNS/` for a matching source file. Port fully if one exists; otherwise apply a token-only consistency pass and say so explicitly per screen — do not invent new structure:

- Auth/onboarding: `app/(auth)/*` (splash, onboarding, login/signup, forgot/reset password, verify-email, verify-phone, OTP), `app/(onboarding)/profile.tsx`, `app/(onboarding)/tour.tsx`
- Escrow/transactions: `app/checkout/[id].tsx`, `app/checkout/success.tsx`, `app/transactions/[id]/index.tsx`, `app/transactions/[id]/dispute.tsx`, `app/transactions/[id]/review.tsx`
- Event operations: `app/events/[id]/scan.tsx`, `app/events/[id]/manage.tsx`, `app/tickets.tsx` QR modal
- Business management: `app/businesses/edit.tsx`, `app/businesses/create-catalog-item.tsx`
- Other: `app/alerts.tsx`, `app/alert/[id].tsx`, `app/map.tsx`, `app/profile/[id].tsx`, `app/network/index.tsx`, `app/posts/[id].tsx`, `app/settings/invite.tsx`

Show the diff, batched by area if the list is long, with the same per-screen evidence requirement. Wait for approval after each sub-batch.

---

## After Every Batch — Required Report Format

For each batch, report:

| Screen | Diff shown? | Imports `tokens.ts`? (grep) | `tsc` result (literal) | Logic preserved? | Source design found or token-only? |
|---|---|---|---|---|---|

Do not mark anything "done" without the literal grep/tsc output to back it. If a screen in a batch turns out to have no matching design, say so plainly rather than skipping it silently.

Do not proceed to the next batch until I've reviewed and approved the current one's diff.
