# Date Night Deck MVP QA Checklist

Use preview/internal builds for device QA. Test at least one iOS and one Android device when possible.

## First Launch

### Setup

- Install a fresh build.
- Clear app data if reinstalling.

### Steps

1. Open the app.
2. Observe the welcome/home experience.
3. Navigate between available guest screens.

### Expected Result

- App opens without crashing.
- Welcome or home screen loads quickly.
- Guest-accessible generation is available.
- No authenticated-only action is silently allowed.

### Failure States To Check

- Blank screen or stuck splash.
- Missing bundled templates.
- Broken navigation.
- Supabase env missing error shown before sign-in is attempted.

## Guest Generation

### Setup

- Use a signed-out device.
- Network can be on or off.

### Steps

1. Open Home.
2. Tap Draw a Date Card.
3. Wait for the shuffle/loading state.
4. View the generated result.

### Expected Result

- A local date plan is generated from bundled templates.
- Result includes title, premise, tags, budget, duration, itinerary, prep, twist, prompt, and backup.
- Save/share couple actions prompt sign-in where required.

### Failure States To Check

- Generator returns an empty state despite templates existing.
- Loading state never resolves.
- Auth prompt is missing for guest-only restricted actions.

## Sign In

### Setup

- Use a reachable Supabase project with email auth enabled.
- Start signed out.

### Steps

1. Open Sign In.
2. Enter a valid email.
3. Submit the email sign-in flow.
4. Complete the magic link or sign-up path configured for the project.

### Expected Result

- Friendly loading and success states appear.
- Auth session is stored.
- A profile row is ensured after first authentication.
- User can access authenticated-only actions.

### Failure States To Check

- Invalid email copy.
- Missing Supabase env copy.
- Network failure copy.
- Profile creation failure copy.

## Create Couple

### Setup

- Sign in with a user that has no active couple.

### Steps

1. Open Couple Setup.
2. Choose create couple.
3. Enter a couple name and display name.
4. Submit.

### Expected Result

- Couple is created.
- Current user becomes an active member.
- Couple profile shows the couple name, current member, and partner pending state.

### Failure States To Check

- Already-in-couple error.
- Network failure.
- Missing/blank names handled gracefully.
- RLS or RPC error shown in friendly copy.

## Invite Partner

### Setup

- Sign in as an active couple member.
- Couple has only one active member.

### Steps

1. Open Couple profile.
2. Tap Invite Partner.
3. Create invite if one does not exist.
4. Use native share or copy the invite link.

### Expected Result

- Invite token/link is created.
- Native share opens with useful copy.
- Pending invite state is visible.

### Failure States To Check

- Couple full.
- Expired/revoked invite display.
- Native share unavailable.
- Offline/network failure message.

## Join Couple

### Setup

- Use a second authenticated user with no active couple.
- Have a valid invite token/link.

### Steps

1. Open Couple Setup.
2. Choose join with invite.
3. Paste token or full link.
4. Submit.

### Expected Result

- User joins the couple.
- Couple profile shows both members.
- Invite is marked accepted.

### Failure States To Check

- Invalid token.
- Expired token.
- Couple full.
- Already in couple.
- Network failure.

## Generate Date

### Setup

- Test as guest and as authenticated couple member.

### Steps

1. Open Home.
2. Tap Draw a Date Card.
3. Open the result screen.

### Expected Result

- Guest plan stays local.
- Authenticated couple plan persists to Supabase.
- Persisted result can be opened again by ID.

### Failure States To Check

- Supabase insert failure.
- Permission denied.
- Date detail not found.
- Date leaking across couples.

## Edit Filters

### Setup

- Open Home.

### Steps

1. Open the filter sheet/modal.
2. Change budget, duration, location mode, energy, vibe, food mode, weather mode, and talking level.
3. Apply filters.
4. Draw a date.

### Expected Result

- Active filter chips update.
- Generated date respects hard filters.
- Friendly empty or fallback state appears if constraints are too tight.

### Failure States To Check

- Filter values not saved locally.
- Sheet cannot close.
- Text overlap on small screens.
- Incompatible filters returning unsafe results.

## Save Favorite

### Setup

- Sign in and generate or open a persisted date.

### Steps

1. Tap Save on Date Result or Date Detail.
2. Open Favorites.

### Expected Result

- Save toggles to saved state.
- Favorite appears in Favorites.
- Duplicate favorites are prevented.

### Failure States To Check

- Guest sees sign-in prompt.
- Offline save failure.
- Permission denied.
- Duplicate favorite row.

## Unsave Favorite

### Setup

- Sign in with at least one saved favorite.

### Steps

1. Open Favorites.
2. Tap Unsave or the saved toggle.
3. Refresh or revisit Favorites.

### Expected Result

- Favorite is removed.
- Empty state appears if no favorites remain.
- Date detail save state updates.

### Failure States To Check

- Remove failure.
- Favorite reappears after reload.
- Permission denied.

## Add To Calendar

### Setup

- Generate or open a date result.
- Test once with calendar permission granted and once denied.

### Steps

1. Tap Add to Calendar.
2. Choose date, start time, duration, and title.
3. Submit.

### Expected Result

- Permission prompt appears if needed.
- Calendar event is created with itinerary, prep, food plan, twist, and backup in notes.
- Authenticated users save calendar metadata when online.
- Permission denied state offers Copy Plan.

### Failure States To Check

- Calendar unavailable.
- Permission denied.
- Metadata sync failure after local event creation.
- Incorrect event duration or notes formatting.

## Create Mystery Card

### Setup

- Sign in as a couple member.
- Generate or open a date plan.

### Steps

1. Tap Lock for partner.
2. Choose reveal style.
3. Add optional creator message.
4. Tap Create Mystery Card.

### Expected Result

- Mystery date row is created.
- Generated plan is stored or linked transactionally.
- User lands on the locked mystery card screen.
- If no partner exists, invite option is available.

### Failure States To Check

- No couple yet.
- Missing generated date.
- RPC error.
- Offline/network failure.

## Share Mystery Card

### Setup

- Have a created mystery card.

### Steps

1. Tap Share.
2. Use native share.
3. Use Copy Link fallback if available.

### Expected Result

- Share copy reads: "I made us a mystery date. No peeking until you open it: {link}"
- Link uses `datenightdeck://mystery/{token}` in development.
- Link uses `https://datenightdeck.app/mystery/{token}` in production.

### Failure States To Check

- Native share unavailable.
- Missing token.
- Invalid link format.
- Offline share creation blocked when mystery has not been created yet.

## Open Mystery Link

### Setup

- Have a valid mystery link.
- Test signed out, signed in wrong user, and signed in intended partner.

### Steps

1. Open the link from outside the app.
2. Let the app route to `/mystery/[token]`.
3. Observe token resolution.

### Expected Result

- App parses token and opens locked mystery card.
- Signed-out users see auth gate.
- Wrong-couple users see join option if invite is allowed, otherwise wrong-couple copy.
- Intended partner sees locked metadata and creator message.

### Failure States To Check

- Deep link not captured.
- Token parsing fails.
- Resolution loading never ends.
- Wrong status shown for auth/couple state.

## Reveal Mystery Date

### Setup

- Sign in as allowed partner for a locked mystery card.

### Steps

1. Open the locked card.
2. Tap Reveal.
3. Watch the reveal animation.
4. Review the revealed plan.

### Expected Result

- Reveal works with a tap.
- Reduced motion setting skips complex animation.
- `reveal_mystery_date` RPC succeeds.
- Date plan appears with "I'm in", Save, and Add to Calendar actions.

### Failure States To Check

- Reveal requires gesture only.
- Animation blocks content.
- RPC failure.
- Wrong couple.
- Couple full when join is needed.

## Already Revealed Card

### Setup

- Use a mystery token that has already been revealed.

### Steps

1. Open the mystery link.
2. Observe resolved status.

### Expected Result

- App shows already revealed state.
- Revealed plan can be viewed by allowed users.
- Reveal action is not offered again.

### Failure States To Check

- Duplicate reveal RPC call.
- Locked state shown incorrectly.
- Plan unavailable after reveal.

## Invalid Token

### Setup

- Use a malformed or unknown mystery token.

### Steps

1. Open `/mystery/{token}` with the invalid token.
2. Observe token resolution.

### Expected Result

- App shows invalid token state.
- No sensitive data is shown.
- User can return home.

### Failure States To Check

- Crash from bad URL.
- Endless loading.
- Generic raw database error.

## Expired Token

### Setup

- Use a mystery token whose `expires_at` is in the past.

### Steps

1. Open the expired mystery link.
2. Observe resolved status.

### Expected Result

- App shows expired token state.
- Reveal action is disabled.
- User can return home or draw a new date.

### Failure States To Check

- Expired card can be revealed.
- Wrong copy says invalid instead of expired.
- Raw RPC error shown.

## Offline Generation

### Setup

- Start signed out or signed in.
- Turn off network.

### Steps

1. Open Home.
2. Edit filters if desired.
3. Tap Draw a Date Card.

### Expected Result

- Local generation works using bundled templates.
- Offline status is communicated without blocking local draw.
- Guest/local result opens normally.

### Failure States To Check

- App blocks generation because Supabase is unreachable.
- Empty template state.
- Offline banner overlaps controls.

## Offline Save Failure

### Setup

- Sign in while online.
- Generate or open a date.
- Turn off network.

### Steps

1. Tap Save.
2. Observe error handling.
3. Restore network and retry.

### Expected Result

- Save fails with friendly offline copy.
- UI does not falsely show a synced favorite.
- Retry can succeed after network returns.

### Failure States To Check

- Silent failure.
- Duplicate favorite after retry.
- Raw fetch/Supabase error shown.

## Sign Out

### Setup

- Sign in.

### Steps

1. Open Settings.
2. Tap Sign Out.
3. Confirm if prompted.

### Expected Result

- Session clears.
- Authenticated-only data is no longer visible.
- Guest generation remains available.
- Settings reflects signed-out state.

### Failure States To Check

- Sign-out failure.
- Cached couple/favorites still visible.
- Navigation stuck on authenticated-only screen.
