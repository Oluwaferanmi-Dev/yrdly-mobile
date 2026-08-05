# YRDLY Mobile — Full Redesign Implementation Plan

> **READ THIS ENTIRE FILE BEFORE TOUCHING ANY CODE.**
> **YOU ARE NOT DONE UNTIL THE CHECKLIST AT THE BOTTOM SHOWS ALL ITEMS COMPLETE.**

---

## MANDATORY OPERATING RULES (NON-NEGOTIABLE)

1. **NEVER claim you are done unless every batch below is marked done AND a final `tsc` run shows 0 errors in `src/`.**
2. **DO NOT stop after one batch and wait for the user.** Work batch by batch, autonomously, all the way to Batch 7 in a single session.
3. **After EVERY batch: run `tsc --noEmit --skipLibCheck` and filter out `YRDLY NEW DESIGNS/` errors. If app-code errors remain, fix them before moving to the next batch.**
4. **After every 2 batches: run `git add -A && git commit -m "..."` to save progress.**
5. **DO NOT rewrite business logic.** Only change styles, layouts, and font tokens. Supabase calls, auth, navigation, and data-fetching must remain identical.
6. **Ground Truth for visuals is `YRDLY NEW DESIGNS/src/App.tsx`.** For each screen, read the corresponding section of that file and match it as closely as React Native allows.
7. **Do not summarize what you did and stop.** After each batch, immediately start the next one without waiting.
8. **If a file already has the correct dark token, skip it and move on — do not re-edit it.**
9. **The words "Implementation complete" only appear when you have verified the final checklist is all done.**

---

## CONTEXT: What Has Already Been Done

| Batch | Status | Commit | Notes |
|---|---|---|---|
| Batch 0 — Fonts | DONE | 0d89a8f | Outfit + Inter loaded via useFonts in _layout.tsx |
| Batch 1 — Tab Bar + Tokens | DONE | 0d89a8f | Dark glass tab bar, G-green badge, Outfit labels |
| Global Token Lock | DONE | b7a82e7 | ThemeContext forced dark, DARK/SURFACE applied to 60+ files |

**Current git branch**: `main`, ahead of origin by 4 commits. Working tree is clean.

**Design tokens already in `src/constants/tokens.ts`:**
- G = '#82DB7E'
- DARK = '#050505'
- GLASS_BG = 'rgba(12,12,12,0.97)'
- GLASS_BORDER = 'rgba(255,255,255,0.08)'
- SURFACE = 'rgba(255,255,255,0.055)'
- LABEL = 'rgba(255,255,255,0.38)'
- MUTED = 'rgba(255,255,255,0.55)'
- TEXT_PRIMARY = '#FFFFFF'

---

## WHAT IS NOT DONE — YOUR ACTUAL TASK

The token lock made backgrounds dark everywhere but **individual screen layouts, typography sizing, component structures, and visual details have NOT been ported from the Figma spec yet.** You must complete Batches 2 through 7 below.

---

## Batch 2 — Home Feed (PRIORITY: HIGHEST)

**Files to edit:**
- `src/components/PostCard.tsx`
- `src/app/(tabs)/index.tsx` (header + QuickPostBox only — feed logic untouched)

**Design spec source:** `YRDLY NEW DESIGNS/src/App.tsx` lines ~906–1048 (PostCard) and ~1263–1370 (FeedScreen header)

**PostCard changes required:**
- Container: borderRadius 24, marginHorizontal 16, marginVertical 8, padding 16, bg SURFACE, border GLASS_BORDER
- Avatar: 44x44 circle, borderWidth 2, borderColor G
- Author name: fontFamily 'Outfit', fontWeight '700', fontSize 15
- Location/time line: fontFamily 'Inter', fontSize 12, color LABEL
- Category badge: paddingHorizontal 10, paddingVertical 4, borderRadius 12, bg 'rgba(255,255,255,0.06)', border GLASS_BORDER, text Outfit 700 11px MUTED
- Post title: Outfit 800 16px TEXT_PRIMARY
- Post body: Inter 14px rgba(255,255,255,0.85) lineHeight 22
- Images: aspectRatio 4/3, borderRadius 16
- Price: Outfit 900 18px G
- Action row: bottom border GLASS_BORDER, active icons use G color

**Feed header (index.tsx):**
- YRDLY wordmark: Outfit 800 22px G
- Map + bell buttons: 36x36 glass circles (SURFACE bg, GLASS_BORDER border)
- QuickPostBox: dark glass rgba(255,255,255,0.04), avatar ring G, Post pill G bg dark text

---

## Batch 3 — Profile & Settings

**Files to edit:**
- `src/app/(tabs)/profile.tsx` — verify Quick Access cards use #0f0f0f bg and borderRadius 20, avatar ring borderColor G
- `src/app/settings/index.tsx`
- `src/app/settings/notifications.tsx`
- `src/app/settings/location.tsx`
- `src/app/settings/privacy.tsx`
- `src/app/settings/payout-settings.tsx`
- `src/app/settings/withdraw.tsx`
- `src/app/settings/withdraw-success.tsx`

**Design spec source:** `YRDLY NEW DESIGNS/src/App.tsx` lines ~1558–1750 (SettingsScreen)

**Settings pattern:**
- Screen bg: DARK
- Section header: Inter 11px fontWeight '700' LABEL letterSpacing 1 textTransform 'uppercase'
- Row bg: rgba(255,255,255,0.04), borderRadius 16, borderWidth 1, borderColor GLASS_BORDER
- Row label: Inter 15px TEXT_PRIMARY
- Row sub-label: Inter 13px LABEL
- Toggle accent: G
- Danger row text: RED (#EF4444)

---

## Batch 4 — Messaging & Chat

**Files to edit:**
- `src/app/chat/[id].tsx`

**Design spec source:** `YRDLY NEW DESIGNS/src/App.tsx` lines ~1110–1260 (ChatScreen)

**Chat changes required:**
- Screen bg: DARK
- Header: DARK bg, GLASS_BORDER bottom border, name Outfit 700 16px TEXT_PRIMARY, online dot G
- Outgoing bubble: G bg, #000 text, borderRadius 20, borderBottomRightRadius 6
- Incoming bubble: rgba(255,255,255,0.08) bg, TEXT_PRIMARY text, borderRadius 20, borderBottomLeftRadius 6
- Timestamp: Inter 11px LABEL
- Input bar: DARK bg, GLASS_BORDER top border, text input SURFACE bg borderRadius 24, send button circle G bg

---

## Batch 5 — Explore Detail Screens

**Files to edit:**
- `src/app/marketplace/[id].tsx`
- `src/app/events/[id]/index.tsx`
- `src/app/businesses/[id].tsx`
- `src/app/community.tsx`
- `src/app/posts/[id].tsx`

**Pattern for all detail screens:**
- Screen bg: DARK
- Back button: SURFACE circle, GLASS_BORDER border
- Section titles: Outfit 700 16px TEXT_PRIMARY
- Body text: Inter 14px rgba(255,255,255,0.75)
- Price / CTA button: G bg, #000 text, Outfit 700
- Card surfaces: rgba(255,255,255,0.04) bg, GLASS_BORDER border, borderRadius 20
- Tag/category pills: rgba(255,255,255,0.06) bg, GLASS_BORDER border

---

## Batch 6 — Creation Screens

**Files to edit:**
- `src/app/new-post.tsx`
- `src/app/(tabs)/create.tsx`
- `src/app/tickets.tsx`
- `src/app/my-events.tsx`

**Pattern:**
- All form inputs: bg rgba(255,255,255,0.05), borderColor GLASS_BORDER, borderRadius 12, color TEXT_PRIMARY, placeholderTextColor LABEL
- Section labels: Inter 12px fontWeight '600' LABEL letterSpacing 0.5
- Primary CTA button: full-width, G bg, #000 text, Outfit 700 16px, borderRadius 16
- Screen bg: DARK

---

## Batch 7 — Remaining Screens

**Files to edit:**
- `src/app/profile/[id].tsx`
- `src/app/profile/edit.tsx`
- `src/app/notifications.tsx`
- `src/app/network/[id].tsx`
- `src/app/alert/[id].tsx`
- `src/app/checkout/[id].tsx`
- `src/app/checkout/success.tsx`
- `src/app/transactions/[id]/index.tsx`
- `src/app/verify-phone.tsx`
- `src/app/verify-phone-otp.tsx`
- Any remaining screen that still shows a white background

**For each:** ensure bg = DARK, text = TEXT_PRIMARY/LABEL/MUTED, buttons = G accent, inputs = SURFACE bg.

---

## HOW TO VERIFY EACH BATCH

Run after every batch:
```
export PATH=/Users/macbook/.nvm/versions/node/v24.16.0/bin:$PATH
./node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1 | grep -v "YRDLY NEW" | grep "error"
```
Expected output: nothing printed. If errors appear, fix them before moving on.

---

## FINAL COMPLETION CHECKLIST

All of these must be done before writing "Implementation complete":

- [ ] Batch 2: PostCard uses Outfit/Inter fonts, correct border-radius, G avatar ring, correct image aspect ratio
- [ ] Batch 2: Feed header wordmark is Outfit 800 G, header buttons are glass circles
- [ ] Batch 3: All settings screens use DARK bg, GLASS_BORDER rows, G toggles
- [ ] Batch 3: Profile Quick Access cards use #0f0f0f bg, borderRadius 20
- [ ] Batch 4: Chat bubbles: G outgoing, glass incoming, G send button
- [ ] Batch 4: Chat input uses SURFACE bg, GLASS_BORDER top border
- [ ] Batch 5: All detail screens use DARK bg, Outfit section headers, G CTA buttons
- [ ] Batch 6: All form inputs are SURFACE bg with GLASS_BORDER, CTA buttons are G bg
- [ ] Batch 7: No screen has a white background when loaded
- [ ] tsc: 0 errors in src/ (YRDLY NEW DESIGNS errors are ignored and do not count)
- [ ] git: all changes committed with descriptive messages

**Only when ALL boxes above are checked may you write "Implementation complete."**

---

## QUICK REFERENCE — TOKEN IMPORT

```ts
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
// adjust relative path based on file location depth
```

## QUICK REFERENCE — FONT USAGE

```ts
fontFamily: 'Outfit'   // headings, names, prices, buttons, bold UI text
fontFamily: 'Inter'    // body text, labels, captions, metadata, timestamps
```
Both fonts are pre-loaded by _layout.tsx. Use them everywhere. Never use system default fonts.
