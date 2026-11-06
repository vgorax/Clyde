# Ambient TV

A full-screen ambient display for an older Samsung (Tizen) TV: animated scenes plus a
big clock, controlled with the TV remote. Plain HTML, CSS and ES5 JavaScript with no
libraries, so it runs in 2015–2017 TV browsers. Only the weather needs internet.

**Scenes:** Aurora · Fireflies · Night Sky (with shooting stars) · Lava Lamp · Ocean Sunset

**Weather:** current conditions, today's high/low and a 3-day forecast, from
[Open-Meteo](https://open-meteo.com) (free, no account or API key).

**Live weather effects:** every scene follows the real weather — rain streaks when it's
raining, falling snow, drifting fog, grey clouds when it's overcast, and lightning flashes
during thunderstorms. Add `?sky=rain` (or `snow`, `storm`, `fog`, `cloudy`, `clear`) to the
page address to preview one.

**Streaming apps:** press Blue for a row of Netflix, Hulu, Prime Video, Disney+ and
YouTube tiles. Apps that aren't installed on the TV are greyed out. This only works when
Ambient TV is installed as an app; the TV browser isn't allowed to open other apps.
To add or remove apps, edit the `APPS` list at the top of `launcher.js`.

## Remote controls

| Button | Does |
|---|---|
| ◀ ▶ | Previous / next scene |
| ▲ ▼ | Brighter / dimmer |
| OK | Clock + weather → clock only → scene only |
| 🔴 Red | Auto-cycle scenes every 10 minutes |
| 🟢 Green | 12 / 24-hour clock |
| 🟡 Yellow | Animation speed (normal → faster → slower) |
| 🔵 Blue | Streaming apps (◀ ▶ choose, OK open, Blue/Back close) |
| 0 | Live weather effects on / off |
| INFO | Show the button guide |

On a computer, use the arrow keys, Enter, R / G / Y / B, 0 and H. Your settings are remembered.
The clock shifts a few pixels each minute so it doesn't burn into the screen.

## Weather location

By default it estimates your location from your internet connection. That's usually
right to within your town, but some internet providers place you in a nearby city. To set it
exactly, open `weather.js` and change the settings at the top:

```js
city: 'Portland, Oregon',   // or 'London, GB', 'Austin, Texas', ...
units: 'auto',              // 'fahrenheit', 'celsius', or auto (°F in the US)
```

In the TV browser you can also add it to the address instead: `http://192.168.0.XX:8000/?city=Portland,Oregon`.
Weather refreshes every 30 minutes. If the internet drops, the last forecast stays up for
6 hours, then the panel hides.

## Option 1: open it in the TV's web browser (quickest)

1. On a computer on the same Wi-Fi as the TV, open a terminal in this folder and run:
   ```
   python3 -m http.server 8000
   ```
2. Find the computer's local IP (it starts with `192.168.0.` like the TV's).
   - Mac: System Settings → Wi-Fi → Details. Windows: `ipconfig`.
3. On the TV, open the **Internet** app and go to `http://192.168.0.XX:8000`
   (use your computer's number). Bookmark it.

Color buttons may not work in the browser; the arrows and OK do. The browser may
also let the TV's screensaver kick in.

## Option 2: install it as an app (Developer Mode)

This gives it its own icon, uses all remote buttons, and needs no computer afterwards.

1. **TV:** open **Apps**, press **1 2 3 4 5** on the remote, turn **Developer mode On**,
   enter your computer's IP, then fully restart the TV (hold power until it reboots).
2. **Computer:** install [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download)
   with the *TV Extensions* from its Package Manager.
3. In Tizen Studio: **Device Manager → Remote Device Manager → +**, add the TV at
   `192.168.0.191`, port `26101`, and connect.
4. Create a Samsung certificate (**Tools → Certificate Manager**, choose *Samsung*, TV).
5. **File → Import → Tizen Project**, select this folder (it contains `config.xml`),
   then right-click the project → **Run As → Tizen Web Application**.

The back button exits the app.

## Making it your own

Each scene in `app.js` is a small object with `name`, `init()` and `draw(t, dt)`.
Copy one, change the colors or shapes, and add it to the list; ◀ ▶ will pick it up.
If you change the files after installing, run **Run As → Tizen Web Application** again to update the TV.
