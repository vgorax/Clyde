/*
 * Streaming app launcher for Ambient TV.
 * Press the Blue button to open a row of app tiles; OK opens the chosen app.
 * Launching other apps only works when Ambient TV is installed as a TV app
 * (in the TV's web browser the tiles just show a message).
 * Plain ES5 for older Samsung TVs.
 */
(function () {
  'use strict';

  // Each app: the name to show, tile colors, how to recognise it among the TV's
  // installed apps, and its usual Samsung app IDs as a fallback.
  var APPS = [
    { name: 'Netflix', fg: '#e50914', bg: '#000000', match: /netflix/i,
      ids: ['RN1MCdNq8t.Netflix', 'org.tizen.netflix-app'] },
    { name: 'Hulu', fg: '#1ce783', bg: '#0b0c0f', match: /hulu/i,
      ids: ['LBUAQX1exg.Hulu'] },
    { name: 'Prime Video', fg: '#ffffff', bg: '#00a8e1', match: /prime video|amazon/i,
      ids: ['evKhCgZelL.AmazonIgnitionLauncher2', 'cj37Ni3qXM.AmazonInstantVideo'] },
    { name: 'Disney+', fg: '#ffffff', bg: '#0b1c5a', match: /disney/i,
      ids: ['MCmYXNxgcu.DisneyPlus'] },
    { name: 'YouTube', fg: '#ffffff', bg: '#ff0000', match: /youtube/i,
      ids: ['9Ur5IzDKqV.TizenYouTube'] }
  ];
  var CLOSE_AFTER_MS = 30000;

  var hasTizen = !!(window.tizen && window.tizen.application);
  var selected = 0;
  var open = false;
  var idleTimer = null;
  var scanned = false;

  // ---------- build the panel ----------
  var panel = document.createElement('div');
  panel.id = 'launcher';
  var html = '<div class="ltitle">Watch</div><div class="lrow">';
  for (var i = 0; i < APPS.length; i++) {
    html += '<div class="ltile" style="background:' + APPS[i].bg + ';color:' + APPS[i].fg + '">' +
      '<span>' + APPS[i].name + '</span></div>';
  }
  html += '</div><div class="lhint">&#9664; &#9654; choose &nbsp;&middot;&nbsp; <b>OK</b> open' +
    ' &nbsp;&middot;&nbsp; <span class="k blue"></span> or Back to close</div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);
  var tiles = panel.getElementsByTagName('div')[1].children;

  function say(msg) {
    if (window.AmbientToast) window.AmbientToast(msg);
  }

  function highlight() {
    for (var i = 0; i < tiles.length; i++) {
      var cls = 'ltile' + (i === selected ? ' sel' : '') + (APPS[i].missing ? ' missing' : '');
      tiles[i].className = cls;
    }
  }

  // Look through the TV's installed apps so we use the exact IDs on this TV.
  function scanInstalled() {
    if (scanned || !hasTizen) return;
    scanned = true;
    try {
      window.tizen.application.getAppsInfo(function (list) {
        for (var a = 0; a < APPS.length; a++) {
          var found = [];
          for (var j = 0; j < list.length; j++) {
            if (APPS[a].match.test(list[j].name || '')) found.push(list[j].id);
          }
          if (found.length) {
            // Installed: try the IDs the TV reported first.
            APPS[a].ids = found.concat(APPS[a].ids);
            APPS[a].missing = false;
          } else {
            APPS[a].missing = true;
          }
        }
        highlight();
      }, function () { /* can't list apps; fall back to the known IDs */ });
    } catch (e) { /* older firmware */ }
  }

  function launch(app) {
    if (!hasTizen) {
      say('Install Ambient TV as an app to open ' + app.name + ' from here');
      return;
    }
    var ids = app.ids;
    var n = 0;
    function tryNext() {
      if (n >= ids.length) {
        say(app.missing ? app.name + ' isn’t installed on this TV' : 'Couldn’t open ' + app.name);
        return;
      }
      var id = ids[n++];
      try {
        window.tizen.application.launch(id, function () { close(); }, tryNext);
      } catch (e) {
        tryNext();
      }
    }
    say('Opening ' + app.name + '…');
    tryNext();
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(close, CLOSE_AFTER_MS);
  }

  function show() {
    open = true;
    panel.className = 'open';
    document.body.className = 'launching';
    scanInstalled();
    highlight();
    resetIdle();
  }

  function close() {
    open = false;
    panel.className = '';
    document.body.className = '';
    clearTimeout(idleTimer);
  }

  // Returns true if the key was used by the launcher.
  function handleKey(k) {
    if (!open) return false;
    resetIdle();
    if (k === 37) { selected = (selected + APPS.length - 1) % APPS.length; highlight(); }
    else if (k === 39) { selected = (selected + 1) % APPS.length; highlight(); }
    else if (k === 13 || k === 32) { launch(APPS[selected]); }
    else if (k === 406 || k === 66 || k === 10009 || k === 27 || k === 8) { close(); }
    // Up/Down and other keys do nothing while the launcher is open.
    return true;
  }

  window.AmbientLauncher = {
    open: show,
    close: close,
    isOpen: function () { return open; },
    handleKey: handleKey
  };
})();
