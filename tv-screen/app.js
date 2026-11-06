/*
 * Ambient TV screen.
 * Written in plain ES5 (no let/const, arrow functions or modules) so it runs
 * in the older browsers built into 2015-2017 Samsung (Tizen) TVs.
 */
(function () {
  'use strict';

  // ---------- setup ----------
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  // Draw at half resolution and let CSS scale it up. The scenes are soft and
  // glowy anyway, and this keeps old TV processors at a smooth frame rate.
  var SCALE = 0.5;
  var W = 0, H = 0;

  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
    function (cb) { return setTimeout(function () { cb(Date.now()); }, 33); };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // A soft round glow, drawn once and reused (much cheaper than a gradient per frame).
  function makeGlow(size, r, g, b) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var x = c.getContext('2d');
    var grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    grad.addColorStop(0.25, 'rgba(' + r + ',' + g + ',' + b + ',0.55)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, size, size);
    return c;
  }

  // Simple local storage wrapper (some TV browsers throw on access).
  var store = {
    get: function (k, d) {
      try { var v = window.localStorage.getItem('ambient.' + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem('ambient.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    }
  };

  // ---------- scenes ----------
  var scenes = [];

  // 1. Aurora: glowing ribbons of light over a starry sky.
  scenes.push((function () {
    var stars = [];
    var ribbons = [
      { color: [60, 255, 170], base: 0.42, amp: 0.07, f: 2.1, s: 0.13, h: 0.28, a: 0.33 },
      { color: [80, 180, 255], base: 0.36, amp: 0.09, f: 1.4, s: -0.09, h: 0.22, a: 0.25 },
      { color: [190, 110, 255], base: 0.30, amp: 0.06, f: 2.9, s: 0.07, h: 0.16, a: 0.2 }
    ];
    return {
      name: 'Aurora',
      init: function () {
        stars = [];
        for (var i = 0; i < 140; i++) {
          stars.push({ x: Math.random(), y: Math.random() * 0.75, r: rand(0.3, 1.2), p: rand(0, 6.28) });
        }
      },
      draw: function (t) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#020615');
        g.addColorStop(0.7, '#06162a');
        g.addColorStop(1, '#0b2232');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#fff';
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + s.p);
          ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
        }
        ctx.globalAlpha = 1;

        ctx.globalCompositeOperation = 'lighter';
        var step = Math.max(6, Math.floor(W / 80));
        for (var r = 0; r < ribbons.length; r++) {
          var rb = ribbons[r];
          var top = [];
          for (var x = -step; x <= W + step; x += step) {
            var u = x / W;
            var y = rb.base + Math.sin(u * rb.f * 3.1 + t * rb.s * 6) * rb.amp +
              Math.sin(u * rb.f * 7.3 - t * rb.s * 4) * rb.amp * 0.35;
            top.push(y * H);
          }
          var c = rb.color;
          var hh = rb.h * H;
          var lg = ctx.createLinearGradient(0, rb.base * H - hh, 0, rb.base * H + hh * 0.3);
          lg.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
          lg.addColorStop(0.75, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + rb.a + ')');
          lg.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
          ctx.fillStyle = lg;
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.4 + r * 2);
          ctx.beginPath();
          for (var k = 0; k < top.length; k++) {
            var px = -step + k * step;
            if (k === 0) ctx.moveTo(px, top[k] - hh); else ctx.lineTo(px, top[k] - hh);
          }
          for (var j = top.length - 1; j >= 0; j--) {
            ctx.lineTo(-step + j * step, top[j] + hh * 0.15);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // Dark mountain line at the bottom.
        ctx.fillStyle = '#01040a';
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var m = 0; m <= 40; m++) {
          var mx = m / 40;
          var my = 0.86 - 0.06 * Math.abs(Math.sin(mx * 7.1)) - 0.04 * Math.abs(Math.sin(mx * 17.3 + 1));
          ctx.lineTo(mx * W, my * H);
        }
        ctx.lineTo(W, H);
        ctx.fill();
      }
    };
  })());

  // 2. Fireflies drifting over a dark meadow.
  scenes.push((function () {
    var flies = [];
    var glow = null;
    var land = null;
    function buildLand() {
      land = document.createElement('canvas');
      land.width = W; land.height = H;
      var x = land.getContext('2d');
      var layers = [['#0a1f22', 0.70], ['#06151a', 0.78], ['#030b0e', 0.88]];
      for (var l = 0; l < layers.length; l++) {
        x.fillStyle = layers[l][0];
        x.beginPath();
        x.moveTo(0, H);
        var seed = l * 3.7 + 1;
        for (var i = 0; i <= 60; i++) {
          var u = i / 60;
          var y = layers[l][1] - 0.04 * Math.sin(u * 5 + seed) - 0.02 * Math.sin(u * 13 + seed * 2);
          x.lineTo(u * W, y * H);
        }
        x.lineTo(W, H);
        x.fill();
      }
      // Pine trees on the nearest hill.
      x.fillStyle = '#020709';
      for (var tr = 0; tr < 14; tr++) {
        var tx = rand(0, W), base = H * rand(0.86, 0.95), th = H * rand(0.12, 0.3), tw = th * 0.28;
        for (var tier = 0; tier < 4; tier++) {
          var ty = base - th * tier / 4;
          var w = tw * (1 - tier / 5);
          x.beginPath();
          x.moveTo(tx - w, ty);
          x.lineTo(tx, ty - th * 0.45);
          x.lineTo(tx + w, ty);
          x.fill();
        }
      }
      // Grass tufts.
      x.strokeStyle = '#020709';
      x.lineWidth = 1;
      for (var gr = 0; gr < W / 2; gr++) {
        var gx = rand(0, W);
        x.beginPath();
        x.moveTo(gx, H);
        x.lineTo(gx + rand(-4, 4), H - rand(4, 18));
        x.stroke();
      }
    }
    return {
      name: 'Fireflies',
      init: function () {
        glow = makeGlow(64, 255, 220, 110);
        flies = [];
        for (var i = 0; i < 45; i++) {
          flies.push({ x: rand(0, 1), y: rand(0.35, 0.95), sp: rand(0.015, 0.04),
            a: rand(0, 6.28), p: rand(0, 6.28), ps: rand(0.6, 1.6), sz: rand(10, 26) });
        }
        buildLand();
      },
      resize: function () { buildLand(); },
      draw: function (t, dt) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#040b1c');
        g.addColorStop(1, '#0d2a33');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(land, 0, 0);

        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < flies.length; i++) {
          var f = flies[i];
          f.a += (Math.sin(t * 0.7 + i) * 0.8) * dt;
          f.x += Math.cos(f.a) * f.sp * dt * 0.5;
          f.y += Math.sin(f.a) * f.sp * dt * 0.5;
          if (f.x < -0.05) f.x = 1.05; if (f.x > 1.05) f.x = -0.05;
          if (f.y < 0.3 || f.y > 0.98) f.a += Math.PI * 0.5 * dt * 4;
          var blink = Math.sin(t * f.ps + f.p);
          var alpha = clamp(blink * 1.4 - 0.2, 0, 1);
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.drawImage(glow, f.x * W - f.sz / 2, f.y * H - f.sz / 2, f.sz, f.sz);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  })());

  // 3. Night sky: slowly turning stars, a moon, and the odd shooting star.
  scenes.push((function () {
    var stars = [];
    var shooting = null;
    var nextShot = 4;
    var moonGlow = null;
    return {
      name: 'Night Sky',
      init: function () {
        moonGlow = makeGlow(256, 200, 215, 255);
        stars = [];
        for (var i = 0; i < 320; i++) {
          // Polar coordinates around a pivot below the screen so the sky slowly turns.
          // Angles cover the upper half, where the visible sky is.
          stars.push({ r: rand(0.15, 1.25), a: rand(Math.PI * 1.05, Math.PI * 1.95), s: rand(0.5, 1.8),
            p: rand(0, 6.28), c: Math.random() < 0.15 ? '#ffd9a8' : (Math.random() < 0.2 ? '#bcd4ff' : '#ffffff') });
        }
        shooting = null;
        nextShot = 4;
      },
      draw: function (t, dt) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#01020a');
        g.addColorStop(0.65, '#0a1030');
        g.addColorStop(1, '#22193a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        var cx = W * 0.5, cy = H * 1.1, R = Math.max(W, H);
        var rot = t * 0.006;
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          var x = cx + Math.cos(s.a + rot) * s.r * R;
          var y = cy + Math.sin(s.a + rot) * s.r * R;
          if (x < 0 || x > W || y < 0 || y > H) continue;
          ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.5 * s.s + s.p);
          ctx.fillStyle = s.c;
          ctx.fillRect(x, y, s.s, s.s);
        }
        ctx.globalAlpha = 1;

        // Moon with glow.
        var mx = W * 0.78, my = H * 0.22, mr = H * 0.06;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5;
        ctx.drawImage(moonGlow, mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#f4f1e6';
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(180,175,160,0.35)';
        ctx.beginPath(); ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, 6.28); ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.15, 0, 6.28); ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.1, my - mr * 0.45, mr * 0.1, 0, 6.28); ctx.fill();

        // Shooting star.
        nextShot -= dt;
        if (!shooting && nextShot <= 0) {
          shooting = { x: rand(0.1, 0.7) * W, y: rand(0.05, 0.35) * H, vx: rand(0.5, 0.8) * W, vy: rand(0.15, 0.3) * H, life: 0 };
          nextShot = rand(6, 16);
        }
        if (shooting) {
          shooting.life += dt;
          var sx = shooting.x + shooting.vx * shooting.life;
          var sy = shooting.y + shooting.vy * shooting.life;
          var tail = 0.12;
          var lg = ctx.createLinearGradient(sx, sy, sx - shooting.vx * tail, sy - shooting.vy * tail);
          var fade = clamp(1 - shooting.life / 0.9, 0, 1);
          lg.addColorStop(0, 'rgba(255,255,255,' + fade + ')');
          lg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = lg;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - shooting.vx * tail, sy - shooting.vy * tail);
          ctx.stroke();
          if (shooting.life > 0.9) shooting = null;
        }

        // Treeline.
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var k = 0; k <= 80; k++) {
          var u = k / 80;
          var h = 0.93 - 0.03 * Math.abs(Math.sin(u * 40)) - 0.05 * Math.abs(Math.sin(u * 9 + 2)) * Math.abs(Math.sin(u * 23));
          ctx.lineTo(u * W, h * H);
        }
        ctx.lineTo(W, H);
        ctx.fill();
      }
    };
  })());

  // 4. Lava lamp: big warm blobs that slowly rise, fall and merge.
  scenes.push((function () {
    var blobs = [];
    var sprites = [];
    var palette = [[255, 90, 60], [255, 150, 40], [255, 60, 120], [255, 200, 80], [200, 60, 200]];
    return {
      name: 'Lava Lamp',
      init: function () {
        sprites = [];
        for (var c = 0; c < palette.length; c++) {
          sprites.push(makeGlow(256, palette[c][0], palette[c][1], palette[c][2]));
        }
        blobs = [];
        for (var i = 0; i < 9; i++) {
          blobs.push({ x: rand(0.1, 0.9), p: rand(0, 6.28), sp: rand(0.05, 0.12),
            wob: rand(0.02, 0.06), sz: rand(0.35, 0.7), c: i % sprites.length });
        }
      },
      draw: function (t) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#12051f');
        g.addColorStop(1, '#2a0820');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < blobs.length; i++) {
          var b = blobs[i];
          var y = 0.5 + 0.45 * Math.sin(t * b.sp + b.p);
          var x = b.x + b.wob * Math.sin(t * b.sp * 2.3 + b.p * 2);
          var size = b.sz * H * (0.9 + 0.15 * Math.sin(t * 0.3 + i));
          ctx.globalAlpha = 0.55;
          ctx.drawImage(sprites[b.c], x * W - size / 2, y * H - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  })());

  // 5. Ocean: layered waves at sunset.
  scenes.push((function () {
    var sunGlow = null;
    var layers = [
      { y: 0.62, amp: 0.012, f: 9, s: 0.25, c: '#3a3f73' },
      { y: 0.68, amp: 0.016, f: 7, s: -0.3, c: '#2c2f5e' },
      { y: 0.75, amp: 0.02, f: 5, s: 0.35, c: '#1f2149' },
      { y: 0.84, amp: 0.026, f: 4, s: -0.4, c: '#151634' },
      { y: 0.93, amp: 0.03, f: 3, s: 0.45, c: '#0c0c22' }
    ];
    return {
      name: 'Ocean Sunset',
      init: function () { sunGlow = makeGlow(256, 255, 160, 90); },
      draw: function (t) {
        var g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
        g.addColorStop(0, '#2b1b4f');
        g.addColorStop(0.55, '#c8507a');
        g.addColorStop(1, '#ffad69');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        var sx = W * 0.5, sy = H * 0.6, sr = H * 0.12;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(sunGlow, sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ffe2a8';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();

        var step = Math.max(6, Math.floor(W / 90));
        for (var l = 0; l < layers.length; l++) {
          var L = layers[l];
          ctx.fillStyle = L.c;
          ctx.beginPath();
          ctx.moveTo(0, H);
          for (var x = 0; x <= W + step; x += step) {
            var u = x / W;
            var y = L.y + L.amp * Math.sin(u * L.f * 6.28 + t * L.s * 2) + L.amp * 0.4 * Math.sin(u * L.f * 15 - t * L.s * 3);
            ctx.lineTo(x, y * H);
          }
          ctx.lineTo(W, H);
          ctx.fill();
          // Sun sparkle on the water.
          if (l < 3) {
            ctx.fillStyle = 'rgba(255,210,150,0.35)';
            for (var k = 0; k < 6; k++) {
              var wx = sx + Math.sin(t * 0.8 + k * 1.7 + l) * sr * (1 + l * 0.6);
              ctx.fillRect(wx - sr * 0.3, L.y * H + 3, sr * 0.6 * (1 - k / 8), 1.5);
            }
          }
        }
      }
    };
  })());


  // ---------- live weather effects (drawn on top of any scene) ----------
  // Reads window.AmbientWeather (set by weather.js). Add ?sky=rain|snow|storm|fog|cloudy
  // to the page address to preview an effect.
  var SKY_TEST = { clear: 0, partly: 2, cloudy: 3, fog: 45, drizzle: 53, rain: 63, snow: 73, storm: 95 };
  var skyParam = /[?&]sky=([a-z]+)/.exec(window.location.search);
  var skyForced = skyParam && SKY_TEST.hasOwnProperty(skyParam[1]) ? SKY_TEST[skyParam[1]] : null;

  var skyfx = (function () {
    var drops = [], flakes = [], puffs = [];
    var flakeImg = null, puffImg = null, fogImg = null;
    var flash = 0, nextFlash = 4;

    function conditions(code) {
      var c = { rain: 0, snow: 0, clouds: 0, fog: 0, storm: false };
      if (code === 2) c.clouds = 0.4;
      else if (code === 3) c.clouds = 1;
      else if (code === 45 || code === 48) c.fog = 1;
      else if (code >= 51 && code <= 57) { c.rain = 0.35; c.clouds = 0.8; }
      else if (code >= 61 && code <= 67) { c.rain = code >= 65 ? 1 : 0.65; c.clouds = 1; }
      else if (code >= 80 && code <= 82) { c.rain = code === 82 ? 1 : 0.6; c.clouds = 0.8; }
      else if ((code >= 71 && code <= 77) || code === 85 || code === 86) { c.snow = code === 75 || code === 86 ? 1 : 0.6; c.clouds = 0.9; }
      else if (code >= 95) { c.rain = 1; c.clouds = 1; c.storm = true; }
      return c;
    }

    function fit(arr, n, make) {
      while (arr.length < n) arr.push(make(true));
      if (arr.length > n) arr.length = n;
    }

    function newDrop(anywhere) {
      return { x: rand(-0.1, 1.1), y: anywhere ? rand(0, 1) : rand(-0.2, 0), len: rand(0.02, 0.05), sp: rand(1.1, 1.7) };
    }
    function newFlake(anywhere) {
      return { x: rand(0, 1), y: anywhere ? rand(0, 1) : rand(-0.1, 0), sz: rand(3, 9), sp: rand(0.04, 0.1), ph: rand(0, 6.28) };
    }
    function newPuff(anywhere) {
      return { x: anywhere ? rand(-0.2, 1.2) : -0.4, y: rand(0, 0.45), w: rand(0.35, 0.7), sp: rand(0.004, 0.012) };
    }

    return {
      draw: function (t, dt) {
        var code = skyForced !== null ? skyForced : (window.AmbientWeather ? window.AmbientWeather.code : 0);
        var c = conditions(code);
        if (!flakeImg) {
          flakeImg = makeGlow(16, 255, 255, 255);
          puffImg = makeGlow(128, 120, 128, 140);
          fogImg = makeGlow(128, 190, 198, 206);
        }

        // Grey the sky down under heavy cloud.
        if (c.clouds > 0) {
          ctx.fillStyle = 'rgba(30,34,42,' + (0.28 * c.clouds) + ')';
          ctx.fillRect(0, 0, W, H);
          fit(puffs, Math.round(8 * c.clouds), newPuff);
          ctx.globalAlpha = 0.35 * c.clouds;
          for (var i = 0; i < puffs.length; i++) {
            var p = puffs[i];
            p.x += p.sp * dt;
            if (p.x > 1.3) puffs[i] = newPuff(false);
            ctx.drawImage(puffImg, p.x * W - p.w * W / 2, p.y * H - p.w * H * 0.25, p.w * W, p.w * H * 0.5);
          }
          ctx.globalAlpha = 1;
        } else {
          puffs.length = 0;
        }

        // Fog: pale bands drifting low across the screen.
        if (c.fog > 0) {
          ctx.fillStyle = 'rgba(150,160,170,0.22)';
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 0.45;
          for (var f = 0; f < 6; f++) {
            var fx = ((t * 0.01 * (1 + f * 0.3) + f * 0.37) % 1.6) - 0.3;
            var fy = 0.45 + f * 0.09;
            ctx.drawImage(fogImg, fx * W - W * 0.4, fy * H - H * 0.12, W * 0.8, H * 0.24);
          }
          ctx.globalAlpha = 1;
        }

        // Rain: one batched path of slanted streaks.
        if (c.rain > 0) {
          fit(drops, Math.round(220 * c.rain), newDrop);
          ctx.strokeStyle = 'rgba(190,205,230,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (var d = 0; d < drops.length; d++) {
            var r = drops[d];
            r.y += r.sp * dt;
            r.x -= r.sp * 0.12 * dt;
            if (r.y > 1.05) drops[d] = r = newDrop(false);
            ctx.moveTo(r.x * W, r.y * H);
            ctx.lineTo((r.x + r.len * 0.12) * W, (r.y - r.len) * H);
          }
          ctx.stroke();
        } else {
          drops.length = 0;
        }

        // Snow: soft flakes swaying as they fall.
        if (c.snow > 0) {
          fit(flakes, Math.round(160 * c.snow), newFlake);
          ctx.globalAlpha = 0.85;
          for (var s = 0; s < flakes.length; s++) {
            var fl = flakes[s];
            fl.y += fl.sp * dt;
            var sx = fl.x + Math.sin(t * 0.8 + fl.ph) * 0.015;
            if (fl.y > 1.02) flakes[s] = fl = newFlake(false);
            ctx.drawImage(flakeImg, sx * W - fl.sz / 2, fl.y * H - fl.sz / 2, fl.sz, fl.sz);
          }
          ctx.globalAlpha = 1;
        } else {
          flakes.length = 0;
        }

        // Thunderstorm: occasional lightning flashes (sometimes a double flicker).
        if (c.storm) {
          nextFlash -= dt;
          if (nextFlash <= 0) {
            flash = 1;
            nextFlash = Math.random() < 0.3 ? 0.18 : rand(6, 16);
          }
        }
        if (flash > 0) {
          ctx.fillStyle = 'rgba(230,235,255,' + (flash * 0.55) + ')';
          ctx.fillRect(0, 0, W, H);
          flash = Math.max(0, flash - dt * 4);
        }
      }
    };
  })();

  // ---------- state ----------
  var state = {
    scene: clamp(store.get('scene', 0), 0, scenes.length - 1),
    dim: store.get('dim', 0),            // 0 (full brightness) .. 0.8
    overlay: store.get('overlay', 0),    // 0 clock + weather, 1 clock only, 2 nothing
    h24: store.get('h24', false),
    speed: store.get('speed', 1),        // 0.5, 1 or 2
    cycle: store.get('cycle', false),    // auto-change scene every 10 minutes
    skyfx: store.get('skyfx', true)      // live weather effects on the scenes
  };
  var CYCLE_SECONDS = 600;
  var cycleTimer = 0;

  var current = null;
  function setScene(i, announce) {
    state.scene = (i + scenes.length) % scenes.length;
    current = scenes[state.scene];
    current.init();
    store.set('scene', state.scene);
    cycleTimer = 0;
    if (announce) toast(current.name);
  }

  function resize() {
    W = Math.max(320, Math.floor(window.innerWidth * SCALE));
    H = Math.max(180, Math.floor(window.innerHeight * SCALE));
    canvas.width = W;
    canvas.height = H;
    if (current && current.resize) current.resize();
  }

  // ---------- overlay: clock, toast, help ----------
  var elTime = document.getElementById('time');
  var elDate = document.getElementById('date');
  var elGreet = document.getElementById('greeting');
  var elClock = document.getElementById('clockbox');
  var elToast = document.getElementById('toast');
  var elHelp = document.getElementById('help');
  var elDim = document.getElementById('dim');
  var elWeather = document.getElementById('weather');

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function updateClock() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var html;
    if (state.h24) {
      html = pad(h) + ':' + pad(m);
    } else {
      var ap = h < 12 ? 'AM' : 'PM';
      var h12 = h % 12 === 0 ? 12 : h % 12;
      html = h12 + ':' + pad(m) + '<small>' + ap + '</small>';
    }
    elTime.innerHTML = html;
    elDate.textContent = DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
    elGreet.textContent = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

    // Nudge the clock a few pixels each minute so it never burns into the screen.
    var ox = Math.round(Math.sin(m * 0.7) * 20), oy = Math.round(Math.cos(m * 1.3) * 12);
    var tr = 'translate(' + ox + 'px,' + oy + 'px)';
    elClock.style.webkitTransform = tr;
    elClock.style.transform = tr;
    if (elWeather) {
      var wtr = 'translate(' + (-ox) + 'px,' + oy + 'px)';
      elWeather.style.webkitTransform = wtr;
      elWeather.style.transform = wtr;
    }
  }

  var toastTimer = null;
  function toast(msg) {
    elToast.textContent = msg;
    elToast.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { elToast.className = ''; }, 2200);
  }

  window.AmbientToast = toast;

  var helpTimer = null;
  function showHelp(ms) {
    elHelp.className = 'show';
    clearTimeout(helpTimer);
    helpTimer = setTimeout(function () { elHelp.className = ''; }, ms || 5000);
  }

  function applyState() {
    elDim.style.opacity = state.dim;
    elClock.className = state.overlay < 2 ? '' : 'hidden';
    if (elWeather) elWeather.className = state.overlay === 0 ? '' : 'hidden';
    updateClock();
  }

  // ---------- remote control ----------
  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406, BACK: 10009,
    INFO: 457, ZERO: 48,
    // Keyboard equivalents for testing on a computer.
    R: 82, G: 71, Y: 89, B: 66, SPACE: 32, H: 72, W: 87
  };

  // Installed Tizen apps must ask for the color buttons; in the TV browser this does nothing.
  try {
    if (window.tizen && window.tizen.tvinputdevice) {
      var names = ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'Info', '0'];
      for (var n = 0; n < names.length; n++) window.tizen.tvinputdevice.registerKey(names[n]);
    }
  } catch (e) { /* not on a TV */ }

  // Keep the TV's own screensaver from covering the display (installed app only).
  function keepAwake() {
    try {
      window.webapis.appcommon.setScreenSaver(window.webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
    } catch (e) { /* not available in the browser */ }
  }
  keepAwake();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) keepAwake(); });

  document.addEventListener('keydown', function (ev) {
    var k = ev.keyCode;
    var handled = true;
    // While the app launcher is open it gets the remote's buttons.
    if (window.AmbientLauncher && window.AmbientLauncher.handleKey(k)) {
      ev.preventDefault();
      return;
    }
    switch (k) {
      case KEY.LEFT: setScene(state.scene - 1, true); break;
      case KEY.RIGHT: setScene(state.scene + 1, true); break;
      case KEY.UP:
        state.dim = Math.round(clamp(state.dim - 0.1, 0, 0.8) * 10) / 10;
        store.set('dim', state.dim);
        toast('Brightness ' + Math.round((1 - state.dim) * 100) + '%');
        break;
      case KEY.DOWN:
        state.dim = Math.round(clamp(state.dim + 0.1, 0, 0.8) * 10) / 10;
        store.set('dim', state.dim);
        toast('Brightness ' + Math.round((1 - state.dim) * 100) + '%');
        break;
      case KEY.ENTER: case KEY.SPACE:
        state.overlay = (state.overlay + 1) % 3;
        store.set('overlay', state.overlay);
        toast(['Clock and weather', 'Clock only', 'Scene only'][state.overlay]);
        break;
      case KEY.RED: case KEY.R:
        state.cycle = !state.cycle;
        store.set('cycle', state.cycle);
        cycleTimer = 0;
        toast(state.cycle ? 'Auto-cycle on (every 10 min)' : 'Auto-cycle off');
        break;
      case KEY.GREEN: case KEY.G:
        state.h24 = !state.h24;
        store.set('h24', state.h24);
        toast(state.h24 ? '24-hour clock' : '12-hour clock');
        break;
      case KEY.YELLOW: case KEY.Y:
        state.speed = state.speed === 1 ? 2 : (state.speed === 2 ? 0.5 : 1);
        store.set('speed', state.speed);
        toast(state.speed === 1 ? 'Normal speed' : state.speed === 2 ? 'Faster' : 'Slower');
        break;
      case KEY.BLUE: case KEY.B:
        if (window.AmbientLauncher) window.AmbientLauncher.open();
        break;
      case KEY.INFO: case KEY.H:
        showHelp(8000);
        return;
      case KEY.ZERO: case KEY.W:
        state.skyfx = !state.skyfx;
        store.set('skyfx', state.skyfx);
        toast(state.skyfx ? 'Live weather effects on' : 'Live weather effects off');
        break;
      case KEY.BACK:
        try { window.tizen.application.getCurrentApplication().exit(); } catch (e2) { handled = false; }
        break;
      default:
        handled = false;
    }
    if (handled) {
      ev.preventDefault();
      applyState();
    }
  });

  // ---------- main loop ----------
  var last = 0;
  var simTime = 0;
  var frames = 0, fpsStart = 0;

  function frame(now) {
    now = now || Date.now();
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now;
    simTime += dt * state.speed;

    if (state.cycle) {
      cycleTimer += dt;
      if (cycleTimer >= CYCLE_SECONDS) setScene(state.scene + 1, true);
    }

    current.draw(simTime, dt * state.speed);
    if (state.skyfx) skyfx.draw(simTime, dt * state.speed);

    // If the TV struggles, drop the drawing resolution once.
    frames++;
    if (!fpsStart) fpsStart = now;
    if (now - fpsStart > 4000) {
      var fps = frames * 1000 / (now - fpsStart);
      if (fps < 20 && SCALE > 0.34) { SCALE = 0.34; resize(); }
      frames = 0; fpsStart = now;
    }

    raf(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  setScene(state.scene, false);
  applyState();
  setInterval(updateClock, 1000);
  showHelp(7000);
  toast(current.name);
  raf(frame);
})();
