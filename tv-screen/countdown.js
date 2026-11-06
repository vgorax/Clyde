/*
 * Holiday countdowns for Ambient TV.
 * Plain ES5 for older Samsung TVs.
 */
(function () {
  'use strict';

  // ---------- your countdowns ----------
  // Each one is either a fixed date (month + day) or the Nth weekday of a month.
  //   month: 1-12, day: 1-31
  //   nth: 1-5 (or -1 for "last"), weekday: 0 = Sunday ... 6 = Saturday
  // icon: 'pumpkin', 'tree', 'heart', 'star' or 'cake'
  // greeting (optional): what to show on the day; default is 'Happy <name>!'
  var COUNTDOWNS = [
    // US Thanksgiving: 4th Thursday of November. (Canada: month: 10, nth: 2, weekday: 1)
    { name: 'Thanksgiving', month: 11, nth: 4, weekday: 4, icon: 'pumpkin' },
    { name: 'Christmas', month: 12, day: 25, icon: 'tree', greeting: 'Merry Christmas!' }
    // Add your own, e.g.:
    // { name: 'Mom’s birthday', month: 3, day: 14, icon: 'cake' },
  ];
  // Only show a countdown when it's this many days away or closer.
  var SHOW_WITHIN_DAYS = 100;
  // ------------------------------------

  var el = document.getElementById('countdown');
  if (!el) return;

  var ICONS = {
    pumpkin: '<ellipse cx="22" cy="38" rx="13" ry="16" fill="#e8772e"/>' +
      '<ellipse cx="42" cy="38" rx="13" ry="16" fill="#e8772e"/>' +
      '<ellipse cx="32" cy="38" rx="12" ry="17" fill="#f39237"/>' +
      '<path d="M31 22c0-6 2-10 7-12" stroke="#5d8a3a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M34 16c6-4 12-2 14 2-6 2-10 1-14-2z" fill="#6fa544"/>',
    tree: '<polygon points="32,8 46,28 18,28" fill="#2e8b57"/>' +
      '<polygon points="32,18 50,42 14,42" fill="#2e8b57"/>' +
      '<polygon points="32,30 54,56 10,56" fill="#267a4b"/>' +
      '<rect x="28" y="56" width="8" height="6" fill="#7a4a2a"/>' +
      '<circle cx="26" cy="38" r="2.5" fill="#ff5252"/><circle cx="38" cy="47" r="2.5" fill="#ffd54f"/>' +
      '<circle cx="24" cy="51" r="2.5" fill="#64b5f6"/><circle cx="37" cy="31" r="2.5" fill="#ffd54f"/>' +
      '<polygon points="32,2 34,7 39,7 35,10 36.5,15 32,12 27.5,15 29,10 25,7 30,7" fill="#ffd54f"/>',
    heart: '<path d="M32 54C14 40 8 32 8 23a11 11 0 0 1 24-5 11 11 0 0 1 24 5c0 9-6 17-24 31z" fill="#ff5f7e"/>',
    star: '<polygon points="32,6 39,24 58,24 43,36 49,56 32,44 15,56 21,36 6,24 25,24" fill="#ffd54f"/>',
    cake: '<rect x="12" y="32" width="40" height="22" rx="3" fill="#f8bbd0"/>' +
      '<rect x="12" y="32" width="40" height="7" fill="#ffffff"/>' +
      '<rect x="30" y="18" width="4" height="14" fill="#90caf9"/>' +
      '<path d="M32 9c3 4 3 7 0 9-3-2-3-5 0-9z" fill="#ffb300"/>'
  };

  function dateFor(item, year) {
    if (item.day) return new Date(year, item.month - 1, item.day);
    var d;
    if (item.nth > 0) {
      d = new Date(year, item.month - 1, 1);
      var first = (item.weekday - d.getDay() + 7) % 7;
      return new Date(year, item.month - 1, 1 + first + (item.nth - 1) * 7);
    }
    // nth: -1 means the last such weekday of the month.
    d = new Date(year, item.month, 0);
    return new Date(year, item.month - 1, d.getDate() - ((d.getDay() - item.weekday + 7) % 7));
  }

  function daysUntil(item, today) {
    var when = dateFor(item, today.getFullYear());
    if (when < today) when = dateFor(item, today.getFullYear() + 1);
    // Round, so daylight-saving changes don't make a day go missing.
    return Math.round((when - today) / 86400000);
  }

  function update() {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var list = [];
    for (var i = 0; i < COUNTDOWNS.length; i++) {
      var days = daysUntil(COUNTDOWNS[i], today);
      if (days <= SHOW_WITHIN_DAYS) list.push({ item: COUNTDOWNS[i], days: days });
    }
    list.sort(function (a, b) { return a.days - b.days; });

    var html = '';
    for (var j = 0; j < list.length; j++) {
      var c = list[j];
      var name = c.item.name.replace(/[<>&]/g, '');
      var big, small;
      if (c.days === 0) { big = 'Today!'; small = c.item.greeting ? c.item.greeting.replace(/[<>&]/g, '') : 'Happy ' + name + '!'; }
      else if (c.days === 1) { big = 'Tomorrow'; small = name; }
      else { big = c.days + ' <span>days</span>'; small = 'until ' + name; }
      html += '<div class="cd' + (c.days === 0 ? ' today' : '') + '">' +
        '<div class="cdi"><svg viewBox="0 0 64 64" width="100%" height="100%">' +
        (ICONS[c.item.icon] || ICONS.star) + '</svg></div>' +
        '<div class="cdt"><div class="cdn">' + big + '</div><div class="cdl">' + small + '</div></div></div>';
    }
    el.innerHTML = html;
  }

  update();
  setInterval(update, 60 * 1000);
})();
