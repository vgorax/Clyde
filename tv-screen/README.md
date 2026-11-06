# Ambient TV

A full-screen ambient display for an older Samsung (Tizen) TV: animated scenes plus a
big clock, controlled with the TV remote. Plain HTML, CSS and ES5 JavaScript with no
libraries and no internet needed, so it runs in 2015–2017 TV browsers.

**Scenes:** Aurora · Fireflies · Night Sky (with shooting stars) · Lava Lamp · Ocean Sunset

## Remote controls

| Button | Does |
|---|---|
| ◀ ▶ | Previous / next scene |
| ▲ ▼ | Brighter / dimmer |
| OK | Show / hide the clock |
| 🔴 Red | Auto-cycle scenes every 10 minutes |
| 🟢 Green | 12 / 24-hour clock |
| 🟡 Yellow | Animation speed (normal → faster → slower) |
| 🔵 Blue | Show the button guide |

On a computer, use the arrow keys, Enter, and R / G / Y / B. Your settings are remembered.
The clock shifts a few pixels each minute so it doesn't burn into the screen.

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
