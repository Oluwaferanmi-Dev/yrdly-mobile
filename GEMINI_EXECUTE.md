# GEMINI EXECUTION PROMPT — YRDLY MOBILE REDESIGN

> **YOU ARE NOT ALLOWED TO STOP OR SAY YOU ARE DONE UNTIL THE FINAL VERIFICATION COMMAND OUTPUTS `0` AND ALL 41 FILES LISTED IN THE AUDIT ARE FIXED.**

---

## YOUR ONE JOB

Replace every occurrence of `colors.background`, `colors.card`, and `colors.text` across **all 41 files** listed below with the correct static design tokens. Then fix all screen layouts, typography, inputs, and component structures to match `YRDLY NEW DESIGNS/src/App.tsx`.

You may not claim to be done at any point before the FINAL VERIFICATION command at the bottom of this file outputs `0 colors.* usages remaining`.

---

## NON-NEGOTIABLE RULES

1. **NEVER stop between files and wait for the user.** Work file by file, autonomously, until all 41 files are done.
2. **NEVER write "Implementation complete", "Done", "Finished", or any similar phrase** unless the FINAL VERIFICATION command below outputs `0`.
3. **After every 5 files, run the PROGRESS CHECK command** listed below. If it is not decreasing, you have a bug — fix it before continuing.
4. **DO NOT rewrite business logic.** Only touch: `StyleSheet` values, inline `style={}` props, `fontFamily`, `fontSize`, `color`, `backgroundColor`, `borderColor`, `borderRadius`, `padding`, `margin`. Never touch Supabase queries, auth, navigation, or state management.
5. **Token replacements — use these ONLY, imported from the correct relative path:**
   ```
   DARK = '#050505'           → replaces colors.background, colors.card, backgroundColor: '#fff', backgroundColor: 'white'
   TEXT_PRIMARY = '#FFFFFF'   → replaces colors.text
   GLASS_BORDER = 'rgba(255,255,255,0.08)' → replaces colors.border, colors.borderLight
   SURFACE = 'rgba(255,255,255,0.055)'     → replaces colors.inputBackground, rgba(255,255,255,0.04)
   LABEL = 'rgba(255,255,255,0.38)'        → replaces colors.placeholder, subdued text
   MUTED = 'rgba(255,255,255,0.55)'        → replaces secondary text
   G = '#82DB7E'              → replaces accent, primary button, toggle, active state
   ```
6. **Import path rules:**
   - Files in `src/app/` → `import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../constants/tokens';`
   - Files in `src/app/(tabs)/` or `src/app/settings/` etc. → use `'../constants/tokens'`
   - Files in `src/app/chat/`, `src/app/posts/`, `src/app/marketplace/` etc. → use `'../../constants/tokens'`
7. **For every file: also apply these layout specs from `YRDLY NEW DESIGNS/src/App.tsx`:**
   - Form inputs: `backgroundColor: SURFACE, borderColor: GLASS_BORDER, borderRadius: 12, color: TEXT_PRIMARY, placeholderTextColor: LABEL`
   - Section labels: `fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: LABEL, letterSpacing: 0.5`
   - Primary CTA buttons: `backgroundColor: G, borderRadius: 16, color: '#000000', fontFamily: 'Outfit', fontWeight: '700', fontSize: 16`
   - Card surfaces: `backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 20`
   - Row items: `backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: GLASS_BORDER`
   - Screen containers: `backgroundColor: DARK`
8. **Font rules — apply to every Text element you touch:**
   - Headings, names, prices, button labels → `fontFamily: 'Outfit'`
   - Body copy, labels, captions, timestamps, metadata → `fontFamily: 'Inter'`

---

## THE 41 FILES YOU MUST FIX (in this exact order)

### BATCH A — Settings (7 files)
1. `src/app/settings/notifications.tsx`
2. `src/app/settings/location.tsx`
3. `src/app/settings/privacy.tsx`
4. `src/app/settings/payout-settings.tsx`
5. `src/app/settings/withdraw.tsx`
6. `src/app/settings/withdraw-success.tsx`
7. `src/app/settings/index.tsx` (re-audit — still has `colors.*`)

### BATCH B — Core Tabs (3 files)
8. `src/app/(tabs)/messages.tsx`
9. `src/app/(tabs)/profile.tsx`
10. `src/app/(tabs)/create.tsx`

### BATCH C — Chat & Posts (2 files)
11. `src/app/chat/[id].tsx`
12. `src/app/posts/[id].tsx`

### BATCH D — Marketplace (3 files)
13. `src/app/marketplace/[id].tsx`
14. `src/app/marketplace/edit/[id].tsx`
15. `src/app/businesses/catalog/[itemId].tsx`

### BATCH E — Profile & Network (3 files)
16. `src/app/profile/[id].tsx`
17. `src/app/profile/edit.tsx`
18. `src/app/network/[id].tsx`

### BATCH F — Events (4 files)
19. `src/app/events/[id]/index.tsx`
20. `src/app/events/[id]/manage.tsx`
21. `src/app/events/[id]/scan.tsx`
22. `src/app/events/scan.tsx`

### BATCH G — Creation Screens (4 files)
23. `src/app/new-post.tsx`
24. `src/app/my-events.tsx`
25. `src/app/tickets.tsx`
26. `src/app/businesses/create.tsx`
27. `src/app/businesses/create-catalog-item.tsx`

### BATCH H — Checkout & Transactions (6 files)
28. `src/app/checkout/[id].tsx`
29. `src/app/checkout/success.tsx`
30. `src/app/transactions/[id]/index.tsx`
31. `src/app/transactions/[id]/dispute.tsx`
32. `src/app/transactions/[id]/review.tsx`
33. `src/app/transactions/index.tsx`

### BATCH I — Remaining Screens (8 files)
34. `src/app/notifications.tsx`
35. `src/app/community.tsx`
36. `src/app/alert/[id].tsx`
37. `src/app/verify-phone.tsx`
38. `src/app/verify-phone-otp.tsx`
39. `src/app/businesses/[id].tsx`
40. `src/app/(admin)/create-alert.tsx`
41. `src/app/(admin)/disputes/index.tsx`
42. `src/app/(admin)/disputes/[id].tsx`

---

## PROGRESS CHECK COMMAND (run after every 5 files)

```bash
export PATH=/Users/macbook/.nvm/versions/node/v24.16.0/bin:$PATH
grep -rn "colors\.background\|colors\.card\|colors\.text\b" /Users/macbook/Development/projects/yrdly-mobile/src/app/ --include="*.tsx" | grep -v "YRDLY" | wc -l
```

This must decrease after each batch. If it doesn't, something is wrong — check the last file you edited.

---

## FINAL VERIFICATION (run this LAST — must output `0` before you are allowed to say done)

```bash
export PATH=/Users/macbook/.nvm/versions/node/v24.16.0/bin:$PATH

# Check 1: legacy colors still used
grep -rn "colors\.background\|colors\.card\|colors\.text\b" /Users/macbook/Development/projects/yrdly-mobile/src/app/ --include="*.tsx" | grep -v "YRDLY" | wc -l

# Check 2: TypeScript errors
./node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1 | grep -v "YRDLY NEW" | grep "^src/" | wc -l
```

**Both commands must output `0`. If either outputs anything other than `0`, you are not done. Fix the remaining issues and re-run.**

---

## COMMIT SCHEDULE

After every batch (A through I), run:
```bash
git add -A && git commit -m "style(batch-X): replace legacy colors.* with design tokens in [file list]"
```

---

## WHAT "DONE" LOOKS LIKE

You may only write the following phrase after both FINAL VERIFICATION commands output `0`:

> **"Implementation complete. Both verification commands output 0. All 41 files fixed."**

Any other phrasing is not acceptable. Do not summarize. Do not list what you did. Just run the two verification commands, show their output, and write that exact phrase.
