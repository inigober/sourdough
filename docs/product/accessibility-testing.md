---
title: Accessibility on-device test script
status: current
date: 2026-11-20
---

# Accessibility on-device test script

A short, step-by-step script to test the app on your iPhone with VoiceOver and the other accessibility settings. It goes with the [accessibility audit](./accessibility.md), which says what was fixed and what was only inferred. The point of this script is to turn every "Inferred" in that doc into a pass or a fail.

You need: the iOS app installed on your iPhone (`npm run build:ios`, then Xcode; for timers use `npm run build:ios:test` so a step timer lasts a minute or two), headphones are optional (VoiceOver speech is easier to judge with the volume up in a quiet room). Allow about 40 minutes.

What the "should say" lines mean: VoiceOver wording varies a little with iOS version and your verbosity settings (Settings > Accessibility > VoiceOver > Verbosity). Judge by meaning: does it tell you what the thing is, and its state? Exact words are not required.

---

## 1. Turn VoiceOver on and off

1. **Set up a shortcut (once):** Settings > Accessibility > Accessibility Shortcut > choose **VoiceOver**. Now **triple-click the side button** turns VoiceOver on or off from anywhere. (Or: Settings > Accessibility > VoiceOver > toggle, or ask Siri "Turn on VoiceOver".)
2. A first-time prompt may ask you to confirm; choose "Use VoiceOver". Turn the screen curtain on if you want to test blind: three-finger triple-tap (it blanks the screen while VoiceOver keeps working). Do this at least once for the bake flow; it is the real test.
3. **Turn it off** the same way when you are done. If you get stuck, triple-click the side button again.

### The gestures you need

| Gesture | What it does |
| --- | --- |
| Touch (one finger) | Reads what is under your finger |
| Swipe right / left | Next / previous item |
| Double-tap (anywhere) | Activates the item VoiceOver is on |
| Three-finger swipe up / down | Scrolls the page |
| Two-finger tap | Pause / resume speech |
| Two-finger swipe up | Read everything from the top; two-finger swipe down: read from here |
| Rotor: twist two fingers on the screen like turning a dial | Chooses what a one-finger swipe up or down moves by: Headings, Links, Buttons, Form controls, Landmarks, Containers. Swipe down/up then jumps to the next/previous of that kind |
| Swipe up / down on a slider or stepper-like item | Adjusts it (this app's steppers are separate − and + buttons, so double-tap them) |
| Two-finger scrub (a quick "Z" with two fingers) | Goes back / closes a dialog (the Escape gesture) |
| Three-finger tap | Says where you are on the page |

Tip: set the rotor to **Headings** and swipe down. Every screen should give you a sensible outline (screen title first, then each card).

---

## 2. How to record results

For every numbered check below, write **Pass**, **Fail** or **Odd** in the table in section 8, with one line of what you heard. Anything that is not a clean pass goes to the builder (the AI agent working on the repo) as: *screen, step number, what VoiceOver said, what it should have said*. Screenshots of the screen are optional; a screen recording with VoiceOver on (Control Center > Screen Recording) is the best evidence for timing problems.

---

## 3. VoiceOver walkthrough

Start with the app closed. Turn VoiceOver on. Open the app.

### A. Home

1. Open the app. **Should say:** the app name, then (after a moment) it settles on the first item.
2. Swipe right until you reach the big title. **Should say:** "Plan your sourdough bake, heading".
3. Rotor to Headings, swipe down. **Should say:** the titles of each card ("Saved recipes" if you have any, "Start from a template").
4. Rotor back to default, find **New recipe**. **Should say:** "New recipe, button".
5. Swipe through the template list. **Should say:** the template's name and description in one go, "button". It must not say "image" or a file name.
6. Find the bottom bar. **Should say:** "Main navigation", then "Home, current page, button", "Saved, button", "History, button" (it may say "Home, selected").

### B. New recipe: the wizard

7. Double-tap **New recipe**. **Should say:** the new screen's title: "How much dough are you making?" heading (focus lands on it by itself). Fail if VoiceOver stays on the old button or says nothing.
8. Swipe right. **Should say:** the progress: "Step 1 of 4: Dough size, progress indicator" (and the visible "1 of 4 · Dough size").
9. Reach **Final dough weight**. **Should say:** "Final dough weight, text field" with the value, then "Decrease Final dough weight, button", "Increase Final dough weight, button".
10. Double-tap **Increase** a few times. **Should say:** the new value each time, or at least the field's value when you move back onto it. Note if the number is not announced after the tap (that is expected; it is "Odd" only if the field value is also wrong when you swipe onto it).
11. Reach the info button next to the label. **Should say:** "Info about Final dough weight, button, collapsed". Double-tap. **Should say:** "expanded"; swipe right and the explanation text should be next. Double-tap again to close.
12. Type a bad value: clear the field and swipe away. **Should say:** an error message by itself as soon as you leave the field (an alert). Then swipe back to the field: "Final dough weight, invalid data, text field" plus the message.
13. Fix it. Swipe to the footer. **Should say:** "Recipe builder navigation", "Back", "Continue" (both "button"; the disabled one says "dimmed" if the field is invalid).
14. Continue to the **Flour** step. **Should say:** a new heading "Which flour are you using?" Check the screen title, the flour selector ("Flour type, Whole wheat..."), "Add another flour".
15. Add another flour. **Should say:** each row's controls name their flour: "Decrease Rye percentage", "Remove Rye" (not just "Remove flour").
16. Continue through **Hydration & salt** and **Fermentation**. At each step check the heading is announced on arrival and the selects read their value ("Levain activity, active, pop-up button").
17. On the last step, the button should be "View summary".

### C. Summary and Save

18. On the summary: heading "Ingredient summary". Swipe to the four summary cards. **Should say:** "Edit Dough size: 900g · 1 loaf, button" (the word Edit, the title, then the current value).
19. Find the **Ingredients** card. Rotor to Headings: "Ingredients", "Levain", "Added to the dough". Swipe into the rows. **Should say:** each line as "Whole wheat, 400 grams" (name and amount together; the icon is skipped).
20. Find **Recipe assessment**: one verdict ("Looks good" or similar) and a "Show details" button, "collapsed". Double-tap. **Should say:** "Hide details, expanded", and the details are next.
21. Find **Save recipe**. Double-tap. **Should say:** "Save recipe, dialog" (or "alert dialog") and then the title is where VoiceOver lands. Swipe: you should NOT be able to reach any item behind the dialog (try swiping many times).
22. Edit the name, double-tap **Save recipe**. **Should say:** the dialog closes and VoiceOver goes back to a sensible place (the button you pressed or the screen title).
23. Close a dialog with the **two-finger scrub** next time you see one: it should close (Cancel).

### D. Schedule and starting a bake

24. Double-tap **Build schedule**. **Should say:** the title "Schedule builder".
25. Check the plan picker. **Should say:** "Bake plan, group", "Same day, radio button, 1 of 4" and the description; selecting another says "selected". After selecting, a status line "Current plan: ..." should be read.
26. Expand a **Customise** section ("Starter prep, collapsed"). Check toggles read their state ("Autolyse, on, switch" or "checkbox, ticked").
27. Find the **Bake schedule** list: "list, N items". Rows read as time then step name.
28. Double-tap **Start baking**. **Should say:** "When are you mixing?, dialog". Check **Mix date** and **Start time** read as date and time pickers; double-tap one: the iOS picker is read natively. Double-tap **Start baking** in the dialog.

### E. Bake mode (the important one)

Use the screen curtain for this part if you can.

29. On arrival **Should say:** the recipe name as the heading.
30. Swipe through the top: "Step 1 of N". "About this bake" (collapsed). The "Current step" section: time, step name (heading), "Open AI baking coach, button", the detail text, "Amounts, collapsed, button".
31. Double-tap **Amounts**. **Should say:** "expanded"; the amounts read as "Flour, 400 grams" etc.
32. Double-tap **Start timer** (if there is a confirmation "Start this step early?" confirm it). **Should say (within a second or two, without moving):** "Timer started for <step>: 1 minute." (a live announcement). If nothing is said, it is a **Fail** for the timer announcement.
33. Swipe to the **Timer** area. **Should say:** the remaining time in words: "1 minute remaining" or "45 seconds remaining". It must not say "00:45" as a clock time.
34. **Wait for the timer without touching the phone, with VoiceOver on.** It must **not** speak every second. It should speak once at the end: "Time's up. The timer for <step> has finished." (and the iOS alarm rings). This is the single most important check. If you hear a countdown every second, mark **Fail** and report immediately.
35. Swipe to **Next step** (bottom of the page; it comes last, after "Exit bake mode"; use the rotor set to Containers or Landmarks, "Bake mode navigation", to jump there). Double-tap. **Should say:** "Finished '<step>'. Undo is available." Note how long you have to find the Undo button (it is a few swipes away at the end of the page). It should not vanish while you are on it. Double-tap **Undo**: it should go back one step. Record how hard it was to reach: this tells whether the toast needs to be moved.
36. In the "Full schedule" list, check each finished step says "Done:" before its name, the current one says "current step", and the others read their "Starts in 1h 5m" line. Double-tap a later step: "Jump to this step" appears ("expanded"). Double-tap it. If it skips more than one step you should get a dialog: "Skip 3 steps?" (alert dialog). Cancel it.
37. Double-tap **Open AI baking coach**. **Should say:** "Baking coach, dialog" and VoiceOver lands on the title. Swipe through: subtitle, questions-left line, the tip text, suggested question buttons, "Add photo", the text field ("Ask about this step, text field"), "Send". Check:
    - You cannot swipe to anything behind the sheet.
    - The camera/photo control is spoken once ("Add photo, button"), not twice.
    - If signed in, ask a question: while waiting you hear "Coach is thinking", then "Coach says: ..." and the reply (it is read once, not twice).
    - Two-finger scrub closes the sheet, and VoiceOver returns to the coach button.
38. Tap the pen **Adjust <step>**. **Should say:** "Adjust this step, dialog". Check the value field reads its label and the steppers have names.
39. Move on to the last step. The button should read "Finish baking". Double-tap it. **Should say:** "Bake complete, dialog".
40. In the dialog: **Loaf assessment (optional)**: "Loaf assessment, group", "Great loaf, toggle button, off", etc. Select one: "selected" / "on". **Bake notes**: a text field. **Photo of your loaf**: "Add a photo of your loaf, button". "Don't save" opens "Don't save this bake?, alert dialog". Cancel it. Double-tap **Save bake**.
41. **Should say:** the History screen's title "Bake history" (the app goes there after saving).

### F. History

42. "Bake history, heading". Search box ("Search, search field"), Filter ("Filter, All bakes, pop-up button").
43. Type in Search. **Should say:** a result count after a moment ("1 bake shown" or "No bakes match").
44. Open a bake: its row should read as one item: name, "Baked 20 Nov", assessment, recipe summary. Double-tap. Check the title (recipe name), the photo (if any: "Your <recipe> loaf, image" or "View loaf photo larger, button"), "Edit bake notes, button", and the sections via the Headings rotor.
45. Open Saved from the bottom bar: "Saved recipes, heading", each recipe has "Start baking <name>" and "Duplicate <name>" (the name must be in the button; with several recipes they must not all say just "Start baking").

### G. Sign-in dialog (if you use cloud sync)

46. From Home, **Sign in**. **Should say:** the dialog title ("Sync your recipes"). Go to **Sign in**: the email and password fields read their labels; the show/hide button says "Show password". Submit a wrong password: the error is read straight away. Two-finger scrub closes the dialog.

---

## 4. Dynamic Type (larger text)

**Expected today: the app does not follow this setting yet.** The audit says it needs the type scale first. This test records the starting point so the later work can be measured.

1. Settings > Accessibility > Display & Text Size > **Larger Text**. Turn on **Larger Accessibility Sizes** and drag the slider to the second step from the right.
2. Or use **Control Center**: add the "Text Size" control (Settings > Control Center > + Text Size). Then open Control Center inside the app, tap the Text Size control, choose "Sourdough" at the top and drag up (this changes it for this app only).
3. Close and reopen the app (WebKit applies the size at load).
4. Check: does Home text get bigger? Do the title, field labels and buttons grow? Note "Pass" only if they clearly do; for now the likely answer is **No change**.
5. Whatever it does, check that nothing gets cut off at the largest size: wizard footer buttons, the timer, the Saved cards, History rows, dialogs (can you reach the buttons?), the coach sheet.
6. Put the size back (Large, the default) when done.

## 5. Reduce Motion

1. Settings > Accessibility > Motion > **Reduce Motion** on.
2. Open the app and: switch tabs, open and close a dialog, expand "Show details", open the coach and send a message (the transcript scrolls to the new message).
3. **Should be:** no sliding or fading beyond a quick change; the transcript jumps to the end instead of scrolling smoothly. Mark **Fail** if there is any lingering animation.

## 6. Increase Contrast and Bold Text

1. Settings > Accessibility > Display & Text Size > **Increase Contrast** on. Open the app (light, then dark via Settings > Display & Brightness).
2. **Should be:** card and field borders clearly visible; grey-brown secondary text visibly darker/stronger (light) and borders clearer (dark). Fail if borders are still faint.
3. **Bold Text** on. Check whether text weight changes. **Expected:** little or none (the app sets weights itself). Note what you see; it is informational.
4. Also try **Reduce Transparency** (same screen): the bottom bar and sticky headers should become solid.
5. Optional: **Smart Invert** (Display & Text Size > Smart Invert) and **Differentiate Without Colour**: look at the bake mode schedule. Finished steps should show a check mark, the current step a bar on the left, without relying on colour. Photos should not look inverted.

## 7. Voice Control

1. Settings > Accessibility > **Voice Control** on (download the language when asked). Say "Show names" (or "Show numbers").
2. On each screen, try to operate it only by voice:
   - "Tap New recipe", "Tap Continue", "Tap Back".
   - Say "Tap Start baking" on a Saved card. With several recipes, the name should include the recipe name (it may ask you to choose a number: that is fine, it is not a fail, but the labels on screen show the choices).
   - Bake mode: "Tap Start timer", "Tap Next step", "Tap Previous", "Tap Amounts".
   - Icon-only buttons (pen, coach, info "i", close): say "Show numbers" and "Tap 7".
   - Summary cards: "Tap Edit Dough size" should work; "Tap 900g" may also work (the visible text).
   - The coach text field: "Tap Ask about this step", then dictate a question.
3. Mark **Fail** where a visible label cannot be said, and give the label you tried.
4. Turn Voice Control off, or say "Go to sleep" while testing other things.

---

## 8. Result table

Copy this into a note or a message and fill it in. Report problems to the builder with the row, what you heard, and what you expected.

| # | Area | Check | Pass / Fail / Odd | What I heard or saw |
| --- | --- | --- | --- | --- |
| 1 to 6 | VoiceOver | Home: title, buttons, templates, bottom bar | | |
| 7 | VoiceOver | Wizard: new screen is announced by its heading | | |
| 8 | VoiceOver | Progress read as "Step N of 4" | | |
| 9 to 11 | VoiceOver | Number field, steppers, info `i` | | |
| 12 | VoiceOver | Validation error is announced when leaving the field | | |
| 13 to 17 | VoiceOver | Footer buttons, selects, flour blend names | | |
| 18 to 20 | VoiceOver | Summary: edit cards, ingredient rows, assessment | | |
| 21 to 23 | VoiceOver | Save dialog: focus in, page behind unreachable, focus back | | |
| 24 to 28 | VoiceOver | Schedule builder: radios, sections, start dialog | | |
| 29 to 31 | VoiceOver | Bake mode screen, Amounts | | |
| 32 | VoiceOver | "Timer started" announced | | |
| 33 | VoiceOver | Timer read in words | | |
| 34 | VoiceOver | **Timer does not speak every second; "Time's up" at the end** | | |
| 35 | VoiceOver | Next step, Undo is announced and reachable | | |
| 36 | VoiceOver | Full schedule: Done / current / Jump to this step / skip dialog | | |
| 37 | VoiceOver | Coach sheet: focus, trap, reply announced once, close returns focus | | |
| 38 to 41 | VoiceOver | Adjust step, finish baking, Bake complete, Save bake | | |
| 42 to 46 | VoiceOver | History, Saved, detail, sign-in | | |
| Text size | Dynamic Type | Text grows (expected: not yet); nothing clipped at the largest size | | |
| Motion | Reduce Motion | No animations; transcript jumps | | |
| Contrast | Increase Contrast | Borders and text stronger | | |
| Contrast | Bold Text / Reduce Transparency | Informational | | |
| Voice | Voice Control | Every visible label can be spoken | | |
| Zoom | Pinch zoom | Pinch to zoom a page in the app works | | |
| Landscape | Orientation | Dialogs and bake mode usable sideways | | |
| iPad | Keyboard | Connect a keyboard: Tab goes in a sensible order; dialogs trap Tab and Escape closes | | |

**Where to report:** paste the filled table to the builder (the agent working on the repo) in the chat, one line per problem. Include the iOS version and iPhone model. Problems about the native alarm or Live Activity (what the Lock Screen says or shows) go in a separate list marked "native", because they are fixed in Swift, not in the web app.
