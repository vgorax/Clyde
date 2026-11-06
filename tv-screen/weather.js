/*
 * Weather panel for Ambient TV.
 * Uses Open-Meteo (https://open-meteo.com): free, no account or API key.
 * Plain ES5 so it runs on older Samsung TV browsers.
 */
(function () {
  'use strict';

  // ---------- your settings ----------
  var WEATHER_SETTINGS = {
    // Leave empty to detect your location automatically from your internet connection.
    // Or set a city, e.g. 'Portland, Oregon' or 'London, GB', for an exact location.
    city: '',
    // 'auto' (Fahrenheit in the US, Celsius elsewhere), 'fahrenheit' or 'celsius'.
    units: 'auto',
    // How often to refresh, in minutes.
    refreshMinutes: 30
  };
  // ------------------------------------

  // A ?city=... in the page address overrides the setting (handy in the TV browser).
  var m = /[?&]city=([^&]+)/.exec(window.location.search);
  if (m) WEATHER_SETTINGS.city = decodeURIComponent(m[1].replace(/\+/g, ' '));

  var elBox = document.getElementById('weather');
  if (!elBox) return;

  function store(k, v) {
    try {
      if (arguments.length === 1) { var s = window.localStorage.getItem('ambient.weather.' + k); return s ? JSON.parse(s) : null; }
      window.localStorage.setItem('ambient.weather.' + k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  function getJSON(url, ok, fail) {
    var x = new XMLHttpRequest();
    var done = false;
    function bad(why) { if (!done) { done = true; if (fail) fail(why); } }
    x.open('GET', url, true);
    x.timeout = 15000;
    x.ontimeout = function () { bad('timeout'); };
    x.onerror = function () { bad('network'); };
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || done) return;
      if (x.status >= 200 && x.status < 300) {
        var data;
        try { data = JSON.parse(x.responseText); } catch (e) { bad('json'); return; }
        done = true;
        ok(data);
      } else {
        bad(x.status);
      }
    };
    x.send();
  }

  // ---------- icons (inline SVG, no image files) ----------
  var SUN = '<circle cx="32" cy="32" r="11" fill="#ffd54f"/>' +
    '<g stroke="#ffd54f" stroke-width="4" stroke-linecap="round">' +
    '<line x1="32" y1="6" x2="32" y2="13"/><line x1="32" y1="51" x2="32" y2="58"/>' +
    '<line x1="6" y1="32" x2="13" y2="32"/><line x1="51" y1="32" x2="58" y2="32"/>' +
    '<line x1="13.6" y1="13.6" x2="18.5" y2="18.5"/><line x1="45.5" y1="45.5" x2="50.4" y2="50.4"/>' +
    '<line x1="13.6" y1="50.4" x2="18.5" y2="45.5"/><line x1="45.5" y1="18.5" x2="50.4" y2="13.6"/></g>';
  var MOON = '<path d="M40 10a22 22 0 1 0 14 34A18 18 0 0 1 40 10z" fill="#e8e4d4"/>';
  var CLOUD = '<path d="M20 50h26a11 11 0 0 0 1-22 15 15 0 0 0-29 3 9.5 9.5 0 0 0 2 19z" fill="#eceff4"/>';
  var CLOUD_DARK = '<path d="M20 44h26a11 11 0 0 0 1-22 15 15 0 0 0-29 3 9.5 9.5 0 0 0 2 19z" fill="#b8c2d0"/>';
  var SMALL_SUN = '<g transform="translate(-8,-10) scale(0.75)">' + SUN + '</g>';
  var SMALL_MOON = '<g transform="translate(-6,-8) scale(0.75)">' + MOON + '</g>';
  var RAIN = '<g stroke="#64b5f6" stroke-width="3.5" stroke-linecap="round">' +
    '<line x1="22" y1="50" x2="19" y2="58"/><line x1="32" y1="50" x2="29" y2="58"/><line x1="42" y1="50" x2="39" y2="58"/></g>';
  var SNOW = '<g fill="#ffffff"><circle cx="21" cy="53" r="3"/><circle cx="32" cy="57" r="3"/><circle cx="43" cy="53" r="3"/></g>';
  var BOLT = '<path d="M34 42l-8 12h7l-3 9 11-14h-7l3-7z" fill="#ffd54f"/>';
  var FOG = '<g stroke="#cfd8dc" stroke-width="4" stroke-linecap="round">' +
    '<line x1="10" y1="26" x2="54" y2="26"/><line x1="14" y1="36" x2="50" y2="36"/><line x1="10" y1="46" x2="54" y2="46"/></g>';

  function svg(inner) { return '<svg viewBox="0 0 64 64" width="100%" height="100%">' + inner + '</svg>'; }

  // WMO weather codes -> description + icon.
  function describe(code, isDay) {
    var sunOrMoon = isDay ? SUN : MOON;
    var smallSM = isDay ? SMALL_SUN : SMALL_MOON;
    if (code === 0) return { text: isDay ? 'Sunny' : 'Clear', icon: sunOrMoon };
    if (code === 1) return { text: isDay ? 'Mostly sunny' : 'Mostly clear', icon: sunOrMoon };
    if (code === 2) return { text: 'Partly cloudy', icon: smallSM + CLOUD };
    if (code === 3) return { text: 'Cloudy', icon: CLOUD };
    if (code === 45 || code === 48) return { text: 'Foggy', icon: FOG };
    if (code >= 51 && code <= 57) return { text: 'Drizzle', icon: CLOUD_DARK + RAIN };
    if (code >= 61 && code <= 67) return { text: code >= 65 ? 'Heavy rain' : 'Rain', icon: CLOUD_DARK + RAIN };
    if (code >= 71 && code <= 77) return { text: 'Snow', icon: CLOUD_DARK + SNOW };
    if (code >= 80 && code <= 82) return { text: 'Showers', icon: smallSM + CLOUD_DARK + RAIN };
    if (code === 85 || code === 86) return { text: 'Snow showers', icon: CLOUD_DARK + SNOW };
    if (code >= 95) return { text: 'Thunderstorms', icon: CLOUD_DARK + BOLT };
    return { text: '', icon: CLOUD };
  }

  // ---------- location ----------
  var FAHRENHEIT_COUNTRIES = { US: 1, LR: 1, MM: 1, BS: 1, BZ: 1, KY: 1, PW: 1, PR: 1, GU: 1, VI: 1 };

  function findLocation(ok, fail) {
    var cached = store('location');
    var key = WEATHER_SETTINGS.city || '(auto)';
    if (cached && cached.key === key && Date.now() - cached.at < 24 * 3600 * 1000) { ok(cached); return; }

    function save(loc) { loc.key = key; loc.at = Date.now(); store('location', loc); ok(loc); }

    if (WEATHER_SETTINGS.city) {
      // 'Portland, Oregon' -> search 'Portland', prefer a result matching 'Oregon'.
      var parts = WEATHER_SETTINGS.city.split(',');
      var name = parts[0].replace(/^\s+|\s+$/g, '');
      var hint = parts.length > 1 ? parts.slice(1).join(',').replace(/^\s+|\s+$/g, '').toLowerCase() : '';
      getJSON('https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=' + encodeURIComponent(name),
        function (d) {
          var list = (d && d.results) || [];
          if (!list.length) { fail('city not found'); return; }
          var pick = list[0];
          if (hint) {
            for (var i = 0; i < list.length; i++) {
              var r = list[i];
              var hay = ((r.admin1 || '') + ' ' + (r.country || '') + ' ' + (r.country_code || '')).toLowerCase();
              if (hay.indexOf(hint) !== -1) { pick = r; break; }
            }
          }
          save({ lat: pick.latitude, lon: pick.longitude, name: pick.name, country: pick.country_code });
        }, fail);
      return;
    }

    // Automatic: estimate location from the internet connection (no account needed).
    getJSON('https://get.geojs.io/v1/ip/geo.json', function (d) {
      if (!d || !d.latitude) { fail('no location'); return; }
      save({ lat: parseFloat(d.latitude), lon: parseFloat(d.longitude), name: d.city || '', country: d.country_code });
    }, function () {
      getJSON('https://ipapi.co/json/', function (d) {
        if (!d || !d.latitude) { fail('no location'); return; }
        save({ lat: d.latitude, lon: d.longitude, name: d.city || '', country: d.country_code });
      }, fail);
    });
  }

  // ---------- fetch + render ----------
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function useFahrenheit(loc) {
    if (WEATHER_SETTINGS.units === 'fahrenheit') return true;
    if (WEATHER_SETTINGS.units === 'celsius') return false;
    return !!FAHRENHEIT_COUNTRIES[loc.country];
  }

  function render(w) {
    // Share the current conditions so the scenes can show rain, snow, fog, etc.
    window.AmbientWeather = (w && w.current) ? { code: w.current.weather_code, isDay: w.current.is_day === 1 } : null;
    if (!w || !w.current) { elBox.innerHTML = ''; return; }
    var cur = describe(w.current.weather_code, w.current.is_day === 1);
    var d = w.daily;
    var html = '<div class="wnow">' +
      '<div class="wicon">' + svg(cur.icon) + '</div>' +
      '<div class="wtemp">' + Math.round(w.current.temperature_2m) + '&deg;</div>' +
      '</div>' +
      '<div class="wdesc">' + cur.text +
      (d ? ' &nbsp;&middot;&nbsp; H ' + Math.round(d.temperature_2m_max[0]) + '&deg; &nbsp;L ' + Math.round(d.temperature_2m_min[0]) + '&deg;' : '') +
      '</div>';
    if (w.place) html += '<div class="wplace">' + w.place.replace(/[<>&]/g, '') + '</div>';
    if (d && d.time && d.time.length > 1) {
      html += '<div class="wdays">';
      for (var i = 1; i < Math.min(4, d.time.length); i++) {
        var p = d.time[i].split('-');
        var day = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
        html += '<div class="wday"><div class="wdn">' + DAYS[day] + '</div>' +
          '<div class="wdi">' + svg(describe(d.weather_code[i], true).icon) + '</div>' +
          '<div class="wdt">' + Math.round(d.temperature_2m_max[i]) + '&deg; <span>' +
          Math.round(d.temperature_2m_min[i]) + '&deg;</span></div></div>';
      }
      html += '</div>';
    }
    elBox.innerHTML = html;
  }

  function refresh() {
    findLocation(function (loc) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
        '&current=temperature_2m,weather_code,is_day' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto' +
        (useFahrenheit(loc) ? '&temperature_unit=fahrenheit' : '');
      getJSON(url, function (w) {
        if (!w || !w.current) return;
        w.place = loc.name;
        w.fetchedAt = Date.now();
        store('last', w);
        render(w);
      }, showCached);
    }, showCached);
  }

  // Offline or blocked: keep showing the last weather for up to 6 hours, then hide it.
  function showCached() {
    var w = store('last');
    if (w && Date.now() - w.fetchedAt < 6 * 3600 * 1000) render(w); else render(null);
  }

  showCached();
  refresh();
  setInterval(refresh, Math.max(10, WEATHER_SETTINGS.refreshMinutes) * 60 * 1000);
})();
