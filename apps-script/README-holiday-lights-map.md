# Holiday Lights Map: Setup and Publishing Guide

The map at **landolakeslocal.com/holiday-lights/** is drawn from `Published/data/holiday-lights.json`. Only houses you approve in the form's responses sheet appear on it. Names and email addresses are never published.

---

## One-time setup (about 10 minutes)

1. **Link the form to a sheet.** Open the *Let It Glow House Map* form → **Responses** tab → **Link to Sheets** → *Create a new spreadsheet*.
2. **Get emailed when someone submits** (optional): in the same Responses tab, click the ⋮ menu → **Get email notifications for new responses**.
3. **Add the script.** In the responses sheet: **Extensions → Apps Script**. Delete the sample code, paste in everything from `holiday-lights-map.gs`, and click 💾 **Save**.
4. **Reload the sheet.** A **🎄 Lights Map Tools** menu appears at the top.
5. Click **🎄 Lights Map Tools → 1. Set up review columns**. Google will ask you to authorize the script the first time. Click through and allow it, since it's your own script. These columns are added on the right:
   - **Approved**: `yes` or `no`
   - **Public Label** (optional): shown on the map instead of the street address, e.g. *"Elm Ct cul-de-sac"*
   - **Public Note** (optional): e.g. *"Synced to music, 6–10 PM nightly"*
   - **Lat / Lng / Map Status**: filled in by the script; leave them alone.
6. The first time you publish, the script asks for a **GitHub token**. Paste the same token your business-directory script uses. It's saved privately in this script's settings.

---

## Each time new nominations come in

1. Open the responses sheet and review the new rows at the bottom.
2. For each display you want on the map, type **yes** in **Approved**. Optionally add a **Public Label** or **Public Note**.
3. **🎄 Lights Map Tools → 2. Publish approved displays to the map.**
4. A popup tells you how many displays were published. The map updates in about a minute.

When the first display is published, the "coming soon" box is replaced by the live map and a list of houses with directions links.

### If a row says "Check address" or "Needs a street address"
The address couldn't be pinned precisely. That usually means the street address is missing, misspelled, or only the city was given. Fix the street address in the sheet, clear Lat/Lng if anything is there, and publish again.

### To remove a house
Change **Approved** to **no** and publish again.

### To move a pin
Type the correct Lat/Lng in that row (right-click the spot in Google Maps to copy the coordinates) and publish again.

---

## Suggested form tweaks

- Make **Street Address of Decorated Home** required. Without it, a house can't be pinned.
- Add an optional **"Best time to see it / anything special?"** question. Copy the good ones into **Public Note**.
- For homeowner entries, consider a required checkbox: *"OK to show this address on the public map."*
- For neighbor nominations, you may want to confirm with the homeowner before approving, or use a **Public Label** that shows the street instead of the house number.

---

## Where things live

| What | Where |
|---|---|
| Form | https://forms.gle/fzzBVC4wTnAoD5KC8 |
| Responses sheet | The sheet linked in step 1 (in the Google account that owns the form) |
| Script source | `apps-script/holiday-lights-map.gs` in the GitHub repo |
| Published data | `Published/data/holiday-lights.json` |
| Live page | landolakeslocal.com/holiday-lights/ |
