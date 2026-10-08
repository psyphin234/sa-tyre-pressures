# 4x4 Tyre Pressures

**Under construction.** A static, offline-first calculator for South African 4x4 and overland drivers: a starting tyre-pressure *range* for a given tyre, axle load and terrain, with the source for every number.

- The load the tyre must carry sets the floor, from the published ETRTO and TRA load/inflation tables (as reproduced by Toyo) and Michelin's own 7.50R16 table. There's no floor below the lowest published pressure.
- Terrain ranges and speed limits come only from tyre makers, vehicle makers, standards and engineering research (currently BFGoodrich for sand and mud). Where nothing citable exists, the page says so.
- Works offline once loaded (service worker). Nothing entered leaves the browser.

Open `index.html` (try `index.html#example`). Tests: `powershell -ExecutionPolicy Bypass -File tests\run.ps1`.

Photos: Wikimedia Commons, credited on each photo and on the Sources page. Fonts: Inter and Rajdhani (SIL Open Font License).

Part of [PsyPhin](https://psyphin.co.za/).
