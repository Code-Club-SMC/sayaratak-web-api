# Design

Tokens, type scale, spacing, component rules and the do and do not list are written in step 14.10. This file holds the part 14.4 produced.

## Contrast

`bun run contrast` (`scripts/contrast.ts`) reads the OKLCH tokens in `src/styles.css`, converts them to 8-bit sRGB and prints the WCAG 2.2 ratio of every pair below. It fails under 4.5 for text and under 3 for UI parts. Re-run it after any token change.

```
ok    16.3  (min 4.5)  foreground on background
ok    18.0  (min 4.5)  foreground on card
ok     6.4  (min 4.5)  muted-foreground on background
ok     7.1  (min 4.5)  muted-foreground on card
ok     6.2  (min 4.5)  muted-foreground on muted
ok     7.5  (min 4.5)  primary-foreground on primary
ok     7.8  (min 4.5)  primary on card
ok     7.0  (min 4.5)  primary on background
ok    10.0  (min 4.5)  accent-foreground on accent
ok     8.8  (min 4.5)  signal-foreground on signal
ok     5.6  (min 4.5)  primary-foreground on destructive
ok     5.9  (min 4.5)  destructive on card
ok     4.8  (min 4.5)  badge success on its tint
ok     5.6  (min 4.5)  badge warning on its tint
ok     4.8  (min 4.5)  badge destructive on its tint
ok     6.4  (min 4.5)  badge primary on its tint
ok     3.4  (min 3)  input border on card
ok     3.0  (min 3)  input border on background
ok     7.8  (min 3)  ring on card
ok     7.0  (min 3)  ring on background
```

The badge pairs use a 12 percent tint of the status color over the card. The `--input` border on the card reads 3.4 here (A5 lists 3.3, measured before the 2026-10-07 softening).

## Focus

Every control shows a 2 px focus outline with a 2 px offset in `--ring` (same green as primary, 7.8 on the card, 7.0 on the page). Text inputs and selects show a ring (box shadow) instead. Checked by tabbing through home, search, listing, sign up and the post wizard: every control kind showed one of the two.
