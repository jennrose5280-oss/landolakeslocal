/**
 * Land O' Lakes Local — Holiday Lights Map publisher
 *
 * Paste this into the "Let It Glow House Map" RESPONSES Google Sheet
 * (Extensions → Apps Script). It adds a "🎄 Lights Map Tools" menu that:
 *   1. Adds the review columns (Approved, Public Label, Public Note, Lat, Lng, Map Status)
 *   2. Finds map coordinates for every approved address (Google's built-in geocoder)
 *   3. Publishes ONLY approved displays to Published/data/holiday-lights.json on GitHub,
 *      which Netlify deploys to landolakeslocal.com/holiday-lights/ in about a minute.
 *
 * Privacy: names and email addresses are NEVER published. Only the street address
 * (or the Public Label, if you fill one in), city, zip, your Public Note and the pin location go live.
 */

var GITHUB_OWNER = 'jennrose5280-oss';
var GITHUB_REPO = 'landolakeslocal';
var GITHUB_PATH = 'Published/data/holiday-lights.json';
var GITHUB_BRANCH = 'main';
var DEFAULT_STATE = 'FL';

var ADMIN_COLUMNS = ['Approved', 'Public Label', 'Public Note', 'Lat', 'Lng', 'Map Status'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎄 Lights Map Tools')
    .addItem('1. Set up review columns', 'setupReviewColumns')
    .addItem('2. Publish approved displays to the map', 'publishLightsMap')
    .addSeparator()
    .addItem('Change saved GitHub token', 'resetGithubToken')
    .addToUi();
}

function getSheet_() {
  // The form writes to the first tab ("Form Responses 1").
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function headerMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) { map[String(h).trim()] = i; });
  return { headers: headers, map: map };
}

function findCol_(hm, needle) {
  needle = needle.toLowerCase();
  for (var i = 0; i < hm.headers.length; i++) {
    if (String(hm.headers[i]).toLowerCase().indexOf(needle) !== -1) return i;
  }
  return -1;
}

function setupReviewColumns() {
  var sheet = getSheet_();
  var hm = headerMap_(sheet);
  var added = [];
  ADMIN_COLUMNS.forEach(function (name) {
    if (hm.map[name] === undefined) {
      var col = sheet.getLastColumn() + 1;
      sheet.getRange(1, col).setValue(name).setFontWeight('bold').setBackground('#f3ecdf');
      added.push(name);
      hm = headerMap_(sheet);
    }
  });
  // Approved = dropdown yes / no
  var approvedCol = hm.map['Approved'] + 1;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['yes', 'no'], true).setAllowInvalid(true).build();
  sheet.getRange(2, approvedCol, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  SpreadsheetApp.getUi().alert(added.length
    ? 'Added columns: ' + added.join(', ') + '.\n\nTo approve a house, set Approved to "yes", then use 🎄 Lights Map Tools → Publish.'
    : 'Review columns are already set up.');
}

function geocode_(street, city, zip) {
  var query = [street, city, DEFAULT_STATE + ' ' + zip].filter(function (x) { return String(x).trim(); }).join(', ');
  var resp = Maps.newGeocoder().setRegion('us').geocode(query);
  if (resp.status !== 'OK' || !resp.results || !resp.results.length) {
    return { ok: false, status: 'Check address — not found (' + resp.status + ')' };
  }
  var r = resp.results[0];
  var precise = ['ROOFTOP', 'RANGE_INTERPOLATED'].indexOf(r.geometry.location_type) !== -1 ||
    (r.types || []).some(function (t) { return ['street_address', 'premise', 'subpremise', 'intersection', 'route'].indexOf(t) !== -1; });
  if (!precise) {
    return { ok: false, status: 'Check address — only matched "' + r.formatted_address + '"' };
  }
  return { ok: true, lat: r.geometry.location.lat, lng: r.geometry.location.lng, status: 'On map: ' + r.formatted_address };
}

function getToken_() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  if (token) return token;
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('GitHub token needed (one time)',
    'Paste the same GitHub personal access token you use for the business directory script. It is saved privately in this script\'s settings.',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK || !res.getResponseText().trim()) return null;
  token = res.getResponseText().trim();
  props.setProperty('GITHUB_TOKEN', token);
  return token;
}

function resetGithubToken() {
  PropertiesService.getScriptProperties().deleteProperty('GITHUB_TOKEN');
  getToken_();
}

function publishLightsMap() {
  var ui = SpreadsheetApp.getUi();
  var sheet = getSheet_();
  var hm = headerMap_(sheet);
  if (hm.map['Approved'] === undefined) { setupReviewColumns(); hm = headerMap_(sheet); }

  var cStreet = findCol_(hm, 'street address');
  var cCity = findCol_(hm, 'city');
  var cZip = findCol_(hm, 'zip');
  var cOwn = findCol_(hm, 'is this your home');
  var cApproved = hm.map['Approved'], cLabel = hm.map['Public Label'], cNote = hm.map['Public Note'];
  var cLat = hm.map['Lat'], cLng = hm.map['Lng'], cStatus = hm.map['Map Status'];
  if (cStreet < 0 || cCity < 0 || cZip < 0) {
    ui.alert('Could not find the Street Address / City / Zip Code columns. Did the form questions get renamed?');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { ui.alert('No submissions yet.'); return; }
  var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  var rows = range.getValues();
  var displays = [], problems = [];

  rows.forEach(function (row, i) {
    var approved = String(row[cApproved]).trim().toLowerCase() === 'yes';
    var street = String(row[cStreet] || '').trim();
    var city = String(row[cCity] || '').trim();
    var zip = String(row[cZip] || '').trim();
    if (!approved) {
      if (String(row[cApproved]).trim().toLowerCase() === 'no') row[cStatus] = 'Not on map (not approved)';
      return;
    }
    if (!street) { row[cStatus] = 'Needs a street address — fill it in, then publish again'; problems.push(i + 2); return; }
    var lat = parseFloat(row[cLat]), lng = parseFloat(row[cLng]);
    if (!isFinite(lat) || !isFinite(lng)) {
      var g = geocode_(street, city, zip);
      if (!g.ok) { row[cStatus] = g.status; problems.push(i + 2); return; }
      lat = g.lat; lng = g.lng; row[cLat] = lat; row[cLng] = lng; row[cStatus] = g.status;
      Utilities.sleep(150);
    } else if (String(row[cStatus]).indexOf('On map') !== 0) {
      row[cStatus] = 'On map (coordinates entered by hand)';
    }
    displays.push({
      label: String(row[cLabel] || '').trim() || street,
      city: city,
      zip: zip,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      note: String(row[cNote] || '').trim(),
      ownHome: cOwn >= 0 && /^yes/i.test(String(row[cOwn]).trim())
    });
  });

  // Write back coordinates and statuses (only the admin columns).
  [cLat, cLng, cStatus].forEach(function (c) {
    sheet.getRange(2, c + 1, rows.length, 1).setValues(rows.map(function (r) { return [r[c]]; }));
  });

  var token = getToken_();
  if (!token) { ui.alert('Publish cancelled — no GitHub token.'); return; }

  var payload = JSON.stringify({ updated: new Date().toISOString(), displays: displays }, null, 2) + '\n';
  var api = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + GITHUB_PATH;
  var headers = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' };

  var sha = null;
  var get = UrlFetchApp.fetch(api + '?ref=' + GITHUB_BRANCH, { headers: headers, muteHttpExceptions: true });
  if (get.getResponseCode() === 200) sha = JSON.parse(get.getContentText()).sha;

  var stamp = Utilities.formatDate(new Date(), 'America/New_York', 'M/d/yyyy h:mm a');
  var body = {
    message: 'Update holiday lights map: ' + displays.length + ' displays — ' + stamp,
    content: Utilities.base64Encode(payload, Utilities.Charset.UTF_8),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;
  var put = UrlFetchApp.fetch(api, { method: 'put', headers: headers, contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
  var code = put.getResponseCode();
  if (code !== 200 && code !== 201) {
    ui.alert('GitHub publish failed (' + code + '). If the token expired, use "Change saved GitHub token" and try again.\n\n' + put.getContentText().slice(0, 300));
    return;
  }
  ui.alert('Published ' + displays.length + ' display' + (displays.length === 1 ? '' : 's') + ' to the map. It will be live at landolakeslocal.com/holiday-lights/ in about a minute.' +
    (problems.length ? '\n\nNeeds a look (see Map Status): row' + (problems.length > 1 ? 's ' : ' ') + problems.join(', ') : ''));
}
