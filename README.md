# Type Drift

```
npm install
npm start        # http://localhost:3000
```

## What changed in v8
* **Login is captcha-only.** Pick a driver name (3-16 letters/numbers/_), solve the captcha, and you are in. There is no password and no "Create account" step; a new name gets its profile (coins, cars, history) created automatically on first login. The "Welcome" splash after login is unchanged.
* **Login animation.** Keycaps press, the tagline and the name box type themselves, and real cars (Audi R8, Tata Nexon/Harrier, Toyota Fortuner, Mahindra Thar, ...) drive in, park and type out their names. The same cars drive along the road behind the card.
* **No 3D cars.** Every car is now a realistic 2D vector car (`public/cars.js`): side view in the garage, parade, podium and login; rear view on the race road. `scene3d.js` now only draws the road and scenery.
* **Garage:** 33 cars, now including Tata Tiago/Nexon/Harrier, Maruti Swift, Honda City, Hyundai Creta, Mahindra Thar/Scorpio-N, Audi A6 and Toyota Fortuner (plus the existing Audi R8, BMW, Porsche, Ferrari, ...). Each entry has a `body` style in `server.js`.
* **Home page animations** (`public/homefx.js`): dusk-city drive with nitro bursts and a rev gauge, scrolling ticker, on-screen keyboard that presses keys as the headline types, car parade with typed name plates, garage showroom, animated stat bars, scroll-reveal cards and a pointer glow.

Car emblems are generic shapes, not manufacturer logos.
