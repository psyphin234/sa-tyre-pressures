/*
 * data.js: THE data file. Every source, every rule the calculator uses, the
 * tyre options, the terrain presets and the known gaps live here, each rule
 * with its source(s). calc.js, app.js and the HTML must not hard-code numbers
 * that come from a source: put them in a rule's `params` and read them here.
 *
 * Source policy (from the brief): tyre makers, vehicle makers, standards
 * bodies, the law and engineering research only. No forum, club, retailer or
 * blog figures. Where nothing citable exists, say so (see `gaps`).
 *
 * Rule categories: law | standard | tyre-maker | vehicle-maker | engineering | calculation | field-practice
 * field-practice is the one owner-approved exception to the source policy: clearly
 * labelled experience, never used as a calculated figure or range bound.
 */
(function (root) {
  "use strict";

  const CHECKED = "2026-10-08";

  // ---------------------------------------------------------------- sources
  const sources = {
    regs2012: {
      label: "National Road Traffic Regulations (GN R225 of 17 March 2000, consolidated to 9 March 2012), KZN Department of Transport copy",
      url: "http://www.kzntransport.gov.za/reading_room/acts/national/NRTA%20Regs%20Part%201.pdf",
      kind: "law",
    },
    nrta1996: {
      label: "National Road Traffic Act 93 of 1996 as published (Road Traffic Management Corporation)",
      url: "https://www.rtmc.co.za/images/rtmc/docs/legislation/National%20Road%20Traffic%20Act.pdf",
      kind: "law",
    },
    toyo2020: {
      label: "Toyo Tires, Guidelines for the Application of Load and Inflation Tables, version 2020-7 (reproduces the TRA and ETRTO tables)",
      url: "https://www.toyotires.com/media/pxcjubjs/application_of_load_inflation_tables_20200723.pdf",
      kind: "tyre-maker",
    },
    etrtoRec2024: {
      label: "ETRTO (European Tyre and Rim Technical Organisation), Recommendations, edition 2 September 2024",
      url: "https://www.etrto.org/media/j05fjxrd/etrto-recommendations-edition-2-september-2024.pdf",
      kind: "standard",
    },
    michelinXForceS: {
      label: "Michelin Australia, MICHELIN X FORCE S 7.50R16 116/114N product page and load & pressure table (December 2020)",
      url: "https://business.michelin.com.au/tyres/michelin-x-force-s",
      kind: "tyre-maker",
    },
    bfgUkPressure: {
      label: "BFGoodrich (UK), Tyre pressure",
      url: "https://www.bfgoodrich.co.uk/auto/tips-and-advices/general/tyre-pressure",
      kind: "tyre-maker",
    },
    bfgUk4x4: {
      label: "BFGoodrich (UK), 4x4 tyre tips",
      url: "https://www.bfgoodrich.co.uk/auto/tips-and-advices/off-road/4x4-tyre-tips",
      kind: "tyre-maker",
    },
    bfgAfrica: {
      label: "BFGoodrich Africa, Go off-road with BFGoodrich Tyres (4x4 tips, updated 30 July 2025)",
      url: "https://africa.bfgoodrich.com/auto/help-and-advice/faq-4wd-tips",
      kind: "tyre-maker",
    },
    bridgestone2013: {
      label: "Bridgestone Americas, Bridgestone Debunks Four Winter Driving Myths (press release, 27 November 2013)",
      url: "https://www.prnewswire.com/news-releases/bridgestone-debunks-four-winter-driving-myths-233604351.html",
      kind: "tyre-maker",
    },
    nokianH44: {
      label: "Nokian Tyres, Knowhow from the Arctic: Nokian Hakkapeliitta 44 (news article, 7 February 2017)",
      url: "https://www.nokiantyres.com/about-us/news-article/knowhow-from-the-arctic-robust-nokian-hakkapeliitta-44-winter-tyre-is-the-newest-top-of-the-line-pro/",
      kind: "tyre-maker",
    },
    nexen2018: {
      label: "Nexen Tire America, Do you know the science behind airing down your tires for rock crawling? (press release, 31 July 2018)",
      url: "https://www.nexentireusa.com/posts/do-you-know-the-science-behind-airing-down-your-tires-for-rock-crawling-and-extreme-off-road-travel/",
      kind: "tyre-maker",
    },
    bfgAuFaq: {
      label: "BFGoodrich (Australia), FAQ: tyre pressures",
      url: "https://www.bfgoodrich.com.au/auto/help-and-advice/faq-tyre-pressures",
      kind: "tyre-maker",
    },
    cooperAu: {
      label: "Cooper Tires Australia, Tyre Pressure Guide for 4WD and Off-Road Driving (web page, checked October 2026)",
      url: "https://coopertires.com.au/general-advice/tyre-pressure-guide/",
      kind: "tyre-maker",
    },
    cooperAu2022: {
      label: "Cooper Tires Australia, 4WD Drivers Guide, effective March 2022 (PDF), Tyre Pressure Guide pp. 8-11",
      url: "https://www.coopertires.com.au/wp-content/uploads/2022/10/4WD-Drivers-Guide_LR.pdf",
      kind: "tyre-maker",
    },
    toyoAu20: {
      label: "Toyo Tires Australia, The 20 per cent rule (rule from off-road instructor David Wilson, Adventure 4WD)",
      url: "https://www.toyotires.com.au/news/the-20-per-cent-rule",
      kind: "tyre-maker",
    },
    toyoAuSpeed: {
      label: "Toyo Tires Australia, Tyre pressures: why one size doesn't fit all (quoting Steve Burke, Tyre Technical Manager)",
      url: "https://www.toyotires.com.au/news/tyre-pressures-why-one-size-doesnt-fit-all",
      kind: "tyre-maker",
    },
    fordRanger2025: {
      label: "Ford, 2025 Ranger Owner's Manual (USA/Canada, edition 202408), Wheels and Tires chapter",
      url: "https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2025_Ranger_P703_TRD_OM_ENG_V1.pdf",
      kind: "vehicle-maker",
    },
    nhtsaPneumaticTire: {
      label: "A. N. Gent and J. D. Walter (eds), The Pneumatic Tire, NHTSA (US Dept of Transportation), DOT HS 810 561, 2005/2006",
      url: "https://www.safetyresearch.net/Library/ACS_Pneu_Tire.pdf",
      kind: "engineering",
    },
    armyTm366: {
      label: "US Army TM 9-2320-366-10-1 (FMTV operator's manual), Figure 2-10: Central Tire Inflation System controls (public-domain manual, unofficial web copy)",
      url: "https://trucks5tonops.tpub.com/TM-9-2320-366-10-1/css/TM-9-2320-366-10-1_139.htm",
      kind: "engineering",
    },
    armyTm280: {
      label: "US Army TM 9-2320-280-10, HMMWV (Humvee) operator's manual: para 2-32 Operating in dusty, sandy areas, and Table 2-2 item 42 Tires (public-domain manual, unofficial web copy)",
      url: "https://hummer-hmmwv.tpub.com/TM-9-2320-280-10/css/TM-9-2320-280-10_141.htm",
      kind: "engineering",
    },
    watkins1991: {
      label: "G. Watkins (USDA Forest Service), Truck Operation at Constant Reduced Tire Pressure, Transportation Research Record 1291 (1991)",
      url: "https://onlinepubs.trb.org/Onlinepubs/trr/1991/1291vol1/1291-077.pdf",
      kind: "engineering",
    },
    usStdAtm1976: {
      label: "U.S. Standard Atmosphere, 1976 (NOAA, NASA, USAF), NASA-TM-X-74335",
      url: "https://ntrs.nasa.gov/citations/19770009539",
      kind: "engineering",
    },
  };

  // ---------------------------------------------------------------- rules
  const rules = [
    // ---- law
    {
      id: "law-reg238",
      category: "law",
      title: "Load on tyres (public roads)",
      summary:
        "On a public road, no wheel may carry more than the load given for its tyre in SANS 1550 (\"Motor Vehicle Tyres and Rims: Dimensions and Loads\"), or, for a tyre not listed there, the load approved by the tyre's maker. Tyre temperature is disregarded when deciding the tyre's pressure, so the cold pressure is what counts.",
      quote:
        "No person shall operate on a public road a motor vehicle— (a) which is fitted with pneumatic tyres, where any wheel massload is in excess of the wheel massload referred to in the appropriate part of the standard specification SABS 1550 … Provided that for the purposes of determining the pressure in a tyre the temperature of the tyre shall be disregarded.",
      regulation: "National Road Traffic Regulations, reg 238(1)",
      sources: ["regs2012"],
      checked: CHECKED,
      notes: [
        "\"Public road\" covers any road the public uses or may use (see the definition below), so this applies on public gravel roads too, not only on tar.",
        "Not from the regulation: SANS 1550 itself is a paid standard and has not been read for this site. The calculator uses the ETRTO and TRA tables as published by Toyo, on the unverified assumption that SANS 1550 matches them (see Gaps).",
      ],
    },
    {
      id: "law-public-road",
      category: "law",
      title: "What counts as a public road",
      summary: "A public road is any road or place commonly used by the public, or that the public has a right of access to, so a public gravel road counts.",
      quote:
        "\"public road\" means any road, street or thoroughfare or any other place (whether a thoroughfare or not) which is commonly used by the public or any section thereof or to which the public or any section thereof has a right of access",
      regulation: "National Road Traffic Act 93 of 1996, s1",
      sources: ["nrta1996"],
      checked: CHECKED,
    },
    {
      id: "law-reg294",
      category: "law",
      title: "Speed limit in relation to tyres",
      summary: "No vehicle may be driven on a public road faster than SANS 1550 or the tyre's maker allows for its tyres.",
      quote:
        "no person shall operate on a public road a motor vehicle which is fitted with pneumatic tyres, at a speed in excess of the speed referred to in the standard specification SABS 1550 … or as approved by the manufacturer of the tyre concerned.",
      regulation: "National Road Traffic Regulations, reg 294",
      sources: ["regs2012"],
      checked: CHECKED,
    },
    {
      id: "law-reg212",
      category: "law",
      title: "Damaged tyres (public roads)",
      summary:
        "A tyre may not be used on a public road with exposed cords, a cut through to the cords longer than 25 mm or 10% of the tyre's width (whichever is greater), or a lump or bulge from a separation or partial break in its structure.",
      quote:
        "(f) … a pneumatic tyre of which the rubber covering is so worn or damaged that the fabric or cord used in the construction of such tyre is exposed; … (l) … a cut … of such depth that it reaches the cords … in excess of 25 millimetres or 10 percent of the maximum width of the tyre, whichever is the greater; (m) … a lump or bulge caused by the separation of or a partial break in its structure.",
      regulation: "National Road Traffic Regulations, reg 212(f), (l) and (m)",
      sources: ["regs2012"],
      checked: CHECKED,
    },

    // ---- load tables and how to read them
    {
      id: "table-method",
      category: "standard",
      title: "Reading a load/inflation table",
      summary:
        "Find your tyre's table (ETRTO for metric passenger sizes, TRA for LT-metric and flotation sizes), then the lowest pressure whose load is at least the load on that tyre. Between two published pressures, Toyo's worked example reads the load in a straight line between them.",
      quote:
        "Notice in the table that the 37 psi falls between the published values, so by extrapolation, the load is 2595 lbs. … Find the inflation pressure to which the corresponding load is equal to or greater than the OE tire.",
      sources: ["toyo2020"],
      checked: CHECKED,
      notes: [
        "Each tyre carries half its axle's load (single wheels).",
        "The tables are for single fitment; dual wheels carry less and aren't covered here.",
        "The ETRTO tables in the Toyo guide are marked as reproduced from the ETRTO Standards Manual 2005.",
      ],
    },
    {
      id: "table-lowest-pressure",
      category: "standard",
      title: "The tables stop at a lowest pressure",
      summary:
        "Published tables start at 22 psi (1.5 bar) for ETRTO passenger tyres, 35 psi (2.4 bar) for TRA LT-metric tyres, 25 psi (1.7 bar) for TRA flotation tyres and 36 psi (2.5 bar) for Michelin's 7.50R16 table. Nothing in them says what a tyre can carry below that, so this site shows no load floor below the lowest published pressure.",
      sources: ["toyo2020", "michelinXForceS"],
      checked: CHECKED,
    },
    {
      id: "toyo-vehicle-maker-minimum",
      category: "tyre-maker",
      title: "Not below the vehicle maker's pressure (on the road)",
      summary: "For road use, Toyo warns never to inflate below the vehicle manufacturer's recommended pressure.",
      quote: "Warning! Never use an inflation pressure lower than what is recommended by the vehicle manufacturer.",
      sources: ["toyo2020"],
      checked: CHECKED,
    },
    {
      id: "toyo-load-index",
      category: "tyre-maker",
      title: "Load index alone isn't enough",
      summary:
        "The load index is the most a tyre may carry at its rated speed under specified conditions. Tyres with the same load index can need very different pressures, so compare load at pressure, not just the index.",
      quote:
        "Tires with the same load index, regardless of tire size, may carry the same load, but not always, and they may require substantially different inflation pressures.",
      sources: ["toyo2020"],
      checked: CHECKED,
    },
    {
      id: "michelin-750r16-axle",
      category: "tyre-maker",
      title: "Michelin 7.50R16 table is per axle",
      summary:
        "Michelin's X Force S table gives the load per axle (two tyres) at each pressure, from 1 300 kg at 36 psi to 2 500 kg at 80 psi. The tyre's load index 116 means 1 250 kg per tyre, which matches 2 500 kg per axle. Michelin also publishes the tyre's air volume: 57 litres.",
      quote: "The inflation pressure must always be appropriate for the load per tyre, the speed of travel and the work to be done.",
      sources: ["michelinXForceS"],
      checked: CHECKED,
      params: { fillVolumeL: 57, overallDiameterIn: 32.4, sectionWidthIn: 8.3 },
      notes: [
        "This is Michelin's table for this one tyre. Other makes of 7.50R16 (C-type) tyre follow the ETRTO commercial table, which isn't available here, so check your own tyre maker's table.",
        "The page labels 2 500 kg as \"max load per tyre\"; with load index 116 (1 250 kg per tyre) it can only be per axle, and that's how this site reads it.",
      ],
    },

    // ---- ETRTO recommendations
    {
      id: "etrto-underinflation",
      category: "standard",
      title: "What under-inflation does",
      summary:
        "Under-inflation causes overheating and can shorten a tyre's life, cut road holding, and cause bead dislodgement, internal damage and eventually break-up. The damage may not show until much later.",
      quote:
        "Under-inflation causes over-heating and can greatly shorten the life of a tyre. It reduces road holding, increases fuel consumption and can cause irregular wear, bead dislodgement, internal damage and, ultimately, even tyre break-up. The effects of over or under-inflation are not necessarily immediate.",
      sources: ["etrtoRec2024"],
      checked: CHECKED,
    },
    {
      id: "etrto-off-road",
      category: "standard",
      title: "Lower pressures off-road, back to road pressure after",
      summary:
        "ETRTO accepts that lower pressures are sometimes recommended off-road, and says pressure must go back to the vehicle maker's road value when you return to the road.",
      quote:
        "For vehicles in off road service it is sometimes recommended to use air pressures below those for on road service. The air pressure must be readjusted to the normal on road value as recommended from vehicle manufacturer when returning to normal on road use.",
      sources: ["etrtoRec2024"],
      checked: CHECKED,
    },
    {
      id: "etrto-hot-pressure",
      category: "standard",
      title: "Warm tyres read higher: don't let air out",
      summary:
        "Set pressures cold: tyres not driven for at least an hour, or driven at low speed for no more than 2–3 km. A rise of 20% or more when warm is normal, and warm tyres must never be bled back down to the cold figure.",
      quote:
        "Tyres are considered to be cold when they have not been run for at least one hour or have only been run at low speed for not more than two or three kilometres. An increase of pressure during running, which may reach or even exceed 20%, is normal … the inflation pressure of warm tyres must never be adjusted back to the recommended cold values.",
      sources: ["etrtoRec2024", "fordRanger2025"],
      checked: CHECKED,
      params: { warmRiseFraction: 0.2 },
      notes: ["Ford's Ranger manual says the same: \"Do not reduce the pressure of warm tires.\""],
    },
    {
      id: "etrto-hard-driving",
      category: "standard",
      title: "Towing or sustained high speed (passenger-type tyres)",
      summary:
        "For passenger-car tyres under hard driving (sustained high speed, towing), ETRTO recommends 20–50 kPa (0.2–0.5 bar) above the normal cold pressure, unless the vehicle handbook says otherwise, without going over the tyre's maximum: 320 kPa up to speed symbol T, 350 kPa for H, V, W, Y, Reinforced (XL) and ZR tyres.",
      quote:
        "When the car is subjected to hard driving conditions (e.g. sustained high speed, towing a trailer or caravan etc.), it is recommended that cold inflation pressure be increased by between 20 and 50kPa while respecting the maximum inflation pressure of the tyre (320kPa for sizes having a Speed Symbol up to T, 350kPa for sizes having a Speed Symbol H, V, W or Y, Reinforced Tyres and ZR marked tyres) and unless specific guidance is given in the vehicle handbook",
      sources: ["etrtoRec2024"],
      checked: CHECKED,
      params: { addMinKpa: 20, addMaxKpa: 50, maxKpaUpToT: 320, maxKpaHigher: 350 },
      notes: ["This is in ETRTO's passenger-car chapter. It is not stated for LT tyres, so the calculator only applies it to ETRTO passenger-type tyres."],
    },
    {
      id: "etrto-hump-rims",
      category: "standard",
      title: "Rims made to hold the bead",
      summary:
        "ETRTO recommends rims with bead-retention profiles (\"hump\" rims) for tubeless radial tyres with a load index up to 121 on 5° drop-centre rims, and says tubeless tyres must be on airtight rims.",
      quote:
        "All tubeless tyres must be fitted on airtight rims. It is recommended that rims with profiles designed for bead retention be used for tubeless radial tyres with a load index ≤ 121 fitted on 5° drop-centre rims (hump rims).",
      sources: ["etrtoRec2024"],
      checked: CHECKED,
    },
    {
      id: "bfg-same-as-road",
      category: "tyre-maker",
      title: "Most off-road driving: road pressure",
      summary: "BFGoodrich says that in most conditions you can drive off-road at the same pressure as on paved roads.",
      quote: "In most conditions, your vehicle can be driven off-road at the same pressures used on paved roads.",
      sources: ["bfgUkPressure", "bfgAuFaq"],
      checked: CHECKED,
    },
    {
      id: "bfg-low-traction",
      category: "tyre-maker",
      title: "Low traction (sand): lower a little",
      summary:
        "In low-traction conditions such as sand, slightly lower pressure can improve traction, but only if the tyre still has enough load capacity.",
      quote:
        "However, in low-traction conditions (e.g., sand), slightly reducing tyre pressure can improve traction. … Reducing pressures for a larger contact patch is only suitable if the tyre still maintains sufficient load capacity.",
      sources: ["bfgUkPressure"],
      checked: CHECKED,
    },
    {
      id: "bfg-speed-load",
      category: "tyre-maker",
      title: "Lower pressure means lower speed",
      summary:
        "Load, speed and pressure are linked. If you lower pressure and keep the load, you must slow down; lowering pressure without reducing load or speed overheats the tyre.",
      quote:
        "If you reduce tyre pressure while maintaining load, you must reduce speed. … Reducing pressure without reducing load or speed will lead to excessive heat build-up in the tyre.",
      sources: ["bfgUkPressure"],
      checked: CHECKED,
      notes: ["BFGoodrich gives no speed figure for pressures above 1.5 bar; it only says to slow down."],
    },
    {
      id: "bfg-below-1-5",
      category: "tyre-maker",
      title: "Below 1.5 bar: 20 km/h or less",
      summary:
        "BFGoodrich UK: pressures below 1.5 bar may be used off-road only at 20 km/h or less, and only if the tyre still has enough load capacity.",
      quote:
        "Pressures below 1.5 bar can be used off-road provided speed is limited to 20 km/h or less and the tyre maintains sufficient load capacity.",
      sources: ["bfgUkPressure"],
      checked: CHECKED,
      params: { bar: 1.5, maxKmh: 20 },
      notes: [
        "BFGoodrich's own sand and mud tips (next rules) are stricter: do not go below 1.5 bar.",
        "BFGoodrich Australia puts it differently: below 20 psi (1.38 bar), 25 km/h or less.",
      ],
    },
    {
      id: "bfg-au-20psi",
      category: "tyre-maker",
      title: "BFGoodrich Australia: below 20 psi, 25 km/h or less",
      summary: "BFGoodrich Australia: pressures lower than 20 psi (1.38 bar) may be used off-road at 25 km/h or less, when the tyre has adequate load-carrying capacity.",
      quote:
        "Pressures lower than 20psi may be used off-road provided speeds are reduced to 25kph or less, when the tyre has adequate load-carrying capacity.",
      sources: ["bfgAuFaq"],
      checked: CHECKED,
      params: { psi: 20, maxKmh: 25 },
      notes: ["This doesn't match the UK page (1.5 bar, 20 km/h). The calculator shows the stricter UK figure and mentions this one."],
    },
    {
      id: "bfg-sand",
      category: "tyre-maker",
      title: "Sand: 0.5 bar steps, not below 1.5 bar",
      summary:
        "On sand, BFGoodrich says to carry a gauge, drop pressure 0.5 bar at a time until the footprint works, not go below 1.5 bar, and not exceed 20 km/h at 1.5 bar. Without a compressor, drive very slowly and only short distances.",
      quote:
        "reducing your tyre pressure by 0.5 bar at a time until you reach the optimal footprint on the sand. Do not lower tyre pressure below 1.5 bar. … At 1.5 bar, speed should not exceed 20 km/h. … If you do not have an air compressor, we recommend driving very slowly and over short distances to prevent your tyres from overheating.",
      sources: ["bfgUk4x4"],
      checked: CHECKED,
      params: { stepBar: 0.5, minBar: 1.5, maxKmhAtMin: 20 },
    },
    {
      id: "bfg-mud",
      category: "tyre-maker",
      title: "Mud: no single pressure",
      summary:
        "BFGoodrich: there's no single best mud pressure. Too low spreads the weight and cuts traction, too high won't grip. As a general rule, not below 1.5 bar and not over 20 km/h.",
      quote:
        "There is no single optimal tyre pressure for this, as every situation and terrain requires a different pressure. … if the pressure is too low, the vehicle's weight will be spread too widely, reducing traction. If the pressure is too high, you will not achieve the grip needed to get through the muddy area. … As a general rule, do not go below 1.5 bar and do not exceed 20 km/h.",
      sources: ["bfgUk4x4"],
      checked: CHECKED,
      params: { minBar: 1.5, maxKmh: 20 },
    },
    {
      id: "bfg-africa-sand",
      category: "tyre-maker",
      title: "Sand (BFGoodrich Africa): 0.3 bar steps, not below 1.4 bar",
      summary:
        "BFGoodrich's South African site: drop pressure 0.3 bar at a time until the footprint works in the sand you're in, not below 1.4 bar, and no faster than 25 km/h at 1.4 bar. Without a compressor, drive very slowly and not far.",
      quote:
        "drop your tyre pressures by 0.3 Bar at a time until you reach your optimal footprint on the sand that you're driving in. … We advise not to drop your tyre pressures to under 1.4 Bar. … At 1.4 Bar you don't want to be going any faster than 25kmh.",
      sources: ["bfgAfrica"],
      checked: CHECKED,
      params: { stepBar: 0.3, minBar: 1.4, maxKmhAtMin: 25 },
      notes: ["BFGoodrich's UK site says 0.5 bar steps, not below 1.5 bar, 20 km/h. The calculator uses the South African figures."],
    },
    {
      id: "bfg-africa-mud",
      category: "tyre-maker",
      title: "Mud (BFGoodrich Africa): not below 20 psi",
      summary: "BFGoodrich's South African site: there's no single best mud pressure, but as a rule of thumb not below 20 psi (about 1.4 bar) and not faster than 20 km/h.",
      quote: "A general rule of thumb is to not go below 20psi and not travel faster than 20km/h.",
      sources: ["bfgAfrica"],
      checked: CHECKED,
      params: { minBar: 1.379, maxKmh: 20 },
      notes: ["BFGoodrich's UK site says not below 1.5 bar. The calculator uses the South African figure."],
    },
    {
      id: "bfg-hills",
      category: "tyre-maker",
      title: "Steep climbs",
      summary:
        "BFGoodrich: climbing may need lower pressure for traction, but there's no single figure, and a tyre could puncture partway up the climb, so lower cautiously.",
      quote:
        "To climb hills, you will need as much traction as possible, which may require lowering the tyre pressure before starting. Keep in mind that your tyre could puncture mid-ascent, so be cautious when deflating.",
      sources: ["bfgUk4x4"],
      checked: CHECKED,
    },
    {
      id: "bfg-side-slopes",
      category: "tyre-maker",
      title: "Side slopes: road pressure",
      summary: "Driving across a steep slope, BFGoodrich says to have road pressure in the tyres, or they may come off the rim.",
      quote: "Make sure your tyres are properly inflated (inflate them to road pressure); if they are not, they may come off the rim.",
      sources: ["bfgUk4x4"],
      checked: CHECKED,
    },
    {
      id: "bfg-air-carries-load",
      category: "tyre-maker",
      title: "Air carries the load; heat is the enemy",
      summary:
        "The air in the tyre carries the load, not the tyre itself. Heat from over-flexing or overloading is a tyre's greatest enemy, so keep enough pressure to support the load.",
      quote:
        "Heat (caused by over-flexing or overloading) is a tyre's greatest enemy … It is the air inside the tyre that carries the load, not the tyre itself … To prevent excessive heat from over-flexing, ensure the tyre pressure is sufficient to support the load.",
      sources: ["bfgUkPressure", "bfgAuFaq"],
      checked: CHECKED,
    },
    {
      id: "bfg-reinflate",
      category: "tyre-maker",
      title: "Reinflate before the tar",
      summary: "Reinflate to the correct pressure when you return to paved roads; not doing so seriously affects handling and could cause tyre failure.",
      quote:
        "Always remember to reinflate your tyres to the correct pressure when returning to paved roads. Failure to do so will seriously affect vehicle handling and could cause tyre failure.",
      sources: ["bfgUkPressure", "bfgAuFaq", "fordRanger2025", "etrtoRec2024"],
      checked: CHECKED,
    },

    // ---- Cooper (Australia): terrain ranges for LT tyres
    {
      id: "cooper-lt-terrain",
      category: "tyre-maker",
      title: "Cooper's terrain ranges (LT tyres only)",
      summary:
        "Cooper Tires Australia publishes a pressure range per terrain for light-truck (LT) construction tyres: sand 18–26 psi, fast or smooth gravel 28–34 psi, slow or rough gravel 26–32 psi, mud 22–28 psi, rocky gravel and rocks 22–28 psi, and on bitumen the vehicle placard. Heavier loads need the higher end. The figures are for an average range of sizes, not your exact tyre, and Cooper says they shouldn't be used for passenger or light-duty tyres.",
      quote:
        "All pressures stated are suggested for light truck construction tyres only and should not be advised to any person driving on passenger or light duty construction tyres. … lowering tyre pressures below the manufacturer's recommended pressure for your vehicle is at your own risk and judgement, and doing so could cause over-heating and long-term tyre damage. So, you must drive slowly over obstacles and re-inflate your tyres to proper levels once your vehicle is returned to normal road applications and conditions.",
      sources: ["cooperAu", "cooperAu2022"],
      checked: CHECKED,
      params: {
        psi: { sand: [18, 26], fastGravel: [28, 34], roughGravel: [26, 32], mud: [22, 28], rock: [22, 28], bitumen: [32, 38] },
      },
      notes: [
        "Ranges from the current web page. Cooper's March 2022 PDF guide is a little lower for gravel and rocks: fast gravel 28–32, slow/rough gravel 24–28, rocks 20–26 psi.",
        "The calculator never shows the top of a Cooper range above your road pressure.",
        "Cooper's guide also says: \"Narrow commercial-style tyres require higher pressures.\" (2022 PDF, p. 8)",
      ],
    },
    {
      id: "cooper-rocks",
      category: "tyre-maker",
      title: "Rocks: very slow, and not too low",
      summary:
        "Cooper's rock range assumes a very slow pace in low range, without much heat in the tyre. Lower pressure helps the tyre wrap over obstacles without impact damage; below about 20 psi there's a risk of pushing the tyre off the rim, so 22 psi is a practical minimum for most vehicles.",
      quote: "Pressures below around 20 PSI increase the risk of pushing the tyre off the rim.",
      sources: ["cooperAu", "cooperAu2022"],
      checked: CHECKED,
      notes: ["The 2022 PDF puts it at \"around 18 PSI and below\", with 20 psi as the minimum."],
    },
    {
      id: "cooper-corrugations",
      category: "tyre-maker",
      title: "Corrugations: slow down",
      summary:
        "Corrugated roads build heat in tyres quickly, so Cooper says to reduce speed on them. Rough and corrugated roads make tyres flex and warm up more than usual, and heat in the belts can't always be felt by hand.",
      quote: "When driving over corrugated roads you should reduce your speed, as heat builds up quickly on these roads.",
      sources: ["cooperAu2022", "cooperAu"],
      checked: CHECKED,
      notes: ["Cooper gives no separate corrugation pressure. The calculator uses its slow/rough gravel range for rough, corrugated roads."],
    },
    {
      id: "cooper-sand",
      category: "tyre-maker",
      title: "Sand: depends on the sand, and rest the tyres",
      summary:
        "Cooper: the right sand pressure depends on the depth and coarseness of the sand and the slope. Keep enough momentum, avoid sudden steering, slow down, and rest the vehicle regularly because sand builds a lot of heat in tyres run at low pressure.",
      quote: "Sand can also build up a lot of heat in your tyres because you are running lower pressures for flotation and because of friction and wheel spin. So, you may need to rest your vehicle regularly.",
      sources: ["cooperAu2022", "cooperAu"],
      checked: CHECKED,
    },

    // ---- Toyo (Australia)
    {
      id: "toyo-20-percent",
      category: "tyre-maker",
      title: "Leaving the tar: 20% less pressure, 20% less speed",
      summary:
        "Toyo Tires Australia publishes an off-road instructor's rule: when you go from bitumen to dirt, drop tyre pressure by 20% and speed by 20%. From 36 psi that's about 29 psi, and from 100 km/h a maximum of 80 km/h. Never drive faster than 80 km/h on dirt.",
      quote:
        "when you make the transfer from bitumen to dirt, drop your tyre pressure 20 per cent, and reduce your speed 20 per cent. So if you were running 36psi, drop your tyre pressure down to 29psi … You should never go faster than 80km/h on dirt.",
      sources: ["toyoAu20"],
      checked: CHECKED,
      params: { dropFraction: 0.2, maxKmh: 80 },
      notes: ["The rule comes from David Wilson, an off-road instructor (Adventure 4WD), as published by Toyo. It isn't limited to LT tyres, so the calculator uses it for passenger-type tyres on gravel."],
    },
    {
      id: "toyo-speeds",
      category: "tyre-maker",
      title: "Toyo: aired-down speeds",
      summary: "Toyo's tyre technical manager: off-road pressures should relate to speed. Aired down for dirt roads, keep to 80 km/h at most; aired down for sand, an average of about 30 km/h. Low pressures are a premature tyre killer.",
      quote: "Off-road tyre pressures should relate to speed … unsealed dirt roads at a maximum of 80km/h … sand (or equivalent terrain) at an average speed of 30km/h",
      sources: ["toyoAuSpeed"],
      checked: CHECKED,
      params: { dirtMaxKmh: 80, sandAvgKmh: 30 },
    },

    // ---- vehicle makers
    {
      id: "ford-off-road",
      category: "vehicle-maker",
      title: "Ford: reinflate, inspect, carry a compressor",
      summary:
        "Ford's Ranger manual: always re-inflate to the placard pressure before driving on-road; after off-road use check wheels and tyres for damage; be prepared to re-inflate before returning to the road, for example with a portable compressor. The TPMS warning light will come on when you've aired down. It gives no off-road pressure figures.",
      quote:
        "WARNING: Always re-inflate tires to recommended tire pressures before the vehicle is operated on-road. … WARNING: After off-road use, before returning to the road, check the wheels and tires for damage. … If a tire filling station is not available, remember to prepare a supplemental means to inflate the tires, such as a portable compressor.",
      sources: ["fordRanger2025"],
      checked: CHECKED,
      notes: ["This is the US/Canada edition. South African editions may differ."],
    },
    {
      id: "ford-beadlock",
      category: "vehicle-maker",
      title: "Beadlocks: off-road only",
      summary:
        "Ford: a true beadlock ring allows operation at low tyre pressures off-road with less risk of de-beading the tyre. Ford does not approve true beadlocks for on-road driving.",
      quote:
        "a true bead-lock ring, which allows operation at low tire pressures when off-road to minimize the risk of de-beading the tire. … Converting the bead-lock compatible wheel to true bead-locks is for off-road use only. We do not approve of the use of true bead-locks for on-road driving.",
      sources: ["fordRanger2025"],
      checked: CHECKED,
      notes: [
        "A beadlock holds the bead; it doesn't change how much load the air in the tyre carries (see \"Air carries the load\"), so it doesn't change the load floor or the speed limits shown here.",
        "Whether beadlocks are legal on SA public roads hasn't been checked (see Gaps).",
      ],
    },

    // ---- engineering
    {
      id: "nhtsa-contact-patch",
      category: "engineering",
      title: "Contact patch: load ÷ pressure",
      summary:
        "A tyre flattens until the average pressure over its contact patch balances its air pressure. So, roughly, contact area ≈ load ÷ inflation pressure: halve the pressure and the footprint about doubles (it grows in length more than width).",
      quote:
        "Vehicle load causes tires to deflect until the average contact area pressure is balanced by the tires' internal air pressure. Assuming a typical passenger tire is inflated to 35 psi, then a 350 lb load would need an average of 10 square inches of contact area to support the load. Larger loads require more contact area (more deflection) or higher tire pressures.",
      sources: ["nhtsaPneumaticTire"],
      checked: CHECKED,
      notes: ["\"Roughly\": the casing's own stiffness carries a little of the load, more so at low pressure, so the real footprint is a bit smaller than load ÷ pressure."],
    },
    {
      id: "nhtsa-deflection-heat",
      category: "engineering",
      title: "More deflection, more heat",
      summary:
        "Tyre engineers think in terms of deflection, how far the tyre squashes under load. More deflection strains the tyre more, generates more heat and raises its running temperature.",
      quote:
        "In fact, what they are really concerned with is the deflection of the tire at a given load and pressure. As the deflection increases, the tire is strained more severely and therefore more heat is generated. Consequently the operating temperature increases.",
      sources: ["nhtsaPneumaticTire"],
      checked: CHECKED,
    },
    {
      id: "army-ctis-modes",
      category: "engineering",
      title: "Pressure and speed go together (military trucks)",
      summary:
        "Military trucks with central tyre inflation pair each pressure with a top speed. FMTV example: Highway 60 psi / 88 km/h, Cross-country 37 psi / 64 km/h, Sand 22 psi / 19 km/h, Emergency 16 psi / 8 km/h. These are big truck tyres, so the numbers don't apply to a 4x4; the pattern does.",
      sources: ["armyTm366"],
      checked: CHECKED,
      params: {
        modes: [
          { mode: "Highway", psi: 60, kmh: 88 },
          { mode: "Cross-country", psi: 37, kmh: 64 },
          { mode: "Sand", psi: 22, kmh: 19 },
          { mode: "Emergency", psi: 16, kmh: 8 },
        ],
      },
      notes: ["Figures for FMTV models other than the M1088/M1089, which use higher pressures. Shown only to illustrate the principle."],
    },
    {
      id: "army-hmmwv-sand",
      category: "engineering",
      title: "A military 4x4 below 1.5 bar (Humvee manual)",
      summary:
        "The US Army's Humvee manual takes its 37x12.50R16.5 LT radial tyres well below 1.5 bar: 12 psi (0.83 bar) front and 16 psi (1.1 bar) rear in sand, and 12 psi front, 20 psi (1.38 bar) rear for mud, sand and snow, at 15 mph (24 km/h) at most. Loaded, the same vehicles run about 20–42 psi depending on model. It's a military vehicle on its own tyres and wheels, so the numbers aren't for your 4x4, but it shows a vehicle maker's manual going under 1 bar at low speed.",
      quote:
        "Reduce tire inflation to 12 psi (83 kPa) front and 16 psi (110 kPa) rear to increase traction when operating in sand. … MUD, SAND, AND SNOW … 12 [psi front] 20 [psi rear] (15 mph [48 kph] max. speed)",
      sources: ["armyTm280"],
      checked: CHECKED,
      params: { sandFrontPsi: 12, sandRearPsi: 16, mssFrontPsi: 12, mssRearPsi: 20, maxMph: 15, maxKmh: 24 },
      notes: [
        "The manual prints \"15 mph [48 kph]\", but 15 mph is 24 km/h (48 km/h is 30 mph). This site uses the lower figure, 24 km/h.",
        "The table's column layout is hard to read in the web copy; front and rear are as reconstructed from it. The 12/16 psi sand figures are stated in words in para 2-32.",
      ],
    },
    {
      id: "watkins-gravel",
      category: "engineering",
      title: "Lower pressure, fewer corrugations (log trucks)",
      summary:
        "US Forest Service trials ran loaded log trucks at reduced pressures within the tyre makers' load and speed tables. Washboarding (corrugation) of the gravel roads dropped noticeably and drivers' ride improved; earlier studies found no washboarding when empty trucks' drive tyres were at 25 psi. Trucks needed tubeless radial tyres, and highway speed was limited because of casing heat.",
      quote:
        "The Soper-Wheeler test also experienced a noticeable reduction in washboarding of the unpaved roads. … Ride quality for the truck operator, especially in the loaded truck, improved in all three tests. … Trucks must be equipped with tubeless radial tires for operation at lower pressures. Travel at highway speeds may need to be limited because tire casing heat buildup could be detrimental on a sustained high-speed haul.",
      sources: ["watkins1991"],
      checked: CHECKED,
      notes: ["Log trucks, not 4x4s. It explains why corrugations form, not what pressure a 4x4 should run on them."],
    },

    {
      id: "bridgestone-snow",
      category: "tyre-maker",
      title: "Snow and ice: don't let air out",
      summary: "Bridgestone: never lower tyre pressure to try to get more traction on snow or ice. It doesn't work, and driving on under-inflated tyres can damage them.",
      quote: "Never reduce tire pressures in an attempt to increase traction on snow or ice. … \"Deflating your tires simply doesn't work in this situation,\" … \"In fact, you could end up damaging your tires if you drive on them under-inflated.\"",
      sources: ["bridgestone2013"],
      checked: CHECKED,
      notes: ["About driving on snowy or icy roads. Deep soft snow off-road is a flotation problem, like sand: see the next rules."],
    },
    {
      id: "nokian-flotation",
      category: "tyre-maker",
      title: "Deep snow: Nokian lowers pressure for flotation",
      summary: "Nokian's Hakkapeliitta 44, an LT475/70R17 winter tyre made for Arctic Trucks' expedition 4x4s, has a maximum pressure of 240 kPa and is run at about 160 kPa (1.6 bar) for flotation in snow.",
      quote: "Max pressure: 240 kPa, in flotation use approx. 160 kPa",
      sources: ["nokianH44"],
      checked: CHECKED,
      notes: ["A very large special-purpose tyre: it shows that a tyre maker lowers pressure for deep snow, not a figure for your tyre."],
    },
    {
      id: "deep-snow-sand-figures",
      category: "calculation",
      title: "Deep snow uses the sand figures",
      summary:
        "No civilian tyre or vehicle maker publishes pressures for deep snow. Deep soft snow is a flotation problem like soft sand, and both the US Army's Humvee manual (one mud, sand and snow setting) and Nokian lower pressure for it, so the calculator uses your tyres' sand figures for deep snow off-road. On snowy or icy roads it keeps road pressure (Bridgestone).",
      sources: ["armyTm280", "nokianH44", "bridgestone2013"],
      checked: CHECKED,
      notes: ["This is the site's own application of the sand figures, not a published snow figure."],
    },
    {
      id: "rock-passenger-toyo",
      category: "calculation",
      title: "Rock on passenger tyres: Toyo's 20% rule",
      summary:
        "No tyre maker publishes a rock pressure for passenger-type tyres (Cooper's rock range is for LT tyres only). The calculator uses Toyo's 20 per cent rule for leaving the tar as a cautious starting point on rocky tracks, at a crawl. BFGoodrich says to air down conservatively on climbs, and Cooper warns that below about 20 psi a tyre can be pushed off the rim.",
      sources: ["toyoAu20", "bfgAfrica", "cooperAu"],
      checked: CHECKED,
      notes: ["Toyo's rule is written for dirt roads, not rock: this is the site's own application of it."],
    },
    {
      id: "nexen-rocks",
      category: "tyre-maker",
      title: "Nexen: lower isn't always better on rocks",
      summary: "Nexen: there are diminishing returns to lowering pressure past a comfortable point, with the risk of the tyre slipping off the rim; beadlocks help. It advises against going below 11–15 psi unless you're an experienced off-roader and have asked a tyre fitter, and that's for its heavy-duty, dual-sidewall mud-terrain tyre.",
      quote: "There are diminishing returns to lowering air pressures past a comfortable point … Airing down below 11-15 PSI is not recommended unless you are a capable off-road expert and have consulted a tire installer.",
      sources: ["nexen2018"],
      checked: CHECKED,
    },
    {
      id: "nhtsa-temperature",
      category: "engineering",
      title: "Colder air, lower pressure",
      summary: "Check pressures cold, after the vehicle has stood for several hours. Every 10°F (about 5.5°C) drop in air temperature gives about 1 psi (0.07 bar) less in the tyre.",
      quote:
        "Pressures should be checked when the tires are cold, i.e., when the vehicle has not been driven for several hours, and using an accurate gauge. It should be noted that every 10°F drop in ambient temperature results in about one psi drop in tire inflation pressure.",
      sources: ["nhtsaPneumaticTire"],
      checked: CHECKED,
    },
    {
      id: "toyo-cold",
      category: "tyre-maker",
      title: "What \"cold\" means",
      summary:
        "Cold pressure is taken with the tyres at the surrounding air temperature, without any build-up from driving: parked for at least three hours, or driven less than a mile (1.6 km). The morning, after standing overnight, is the easiest time.",
      quote:
        "According to TRA, the cold inflation pressure is \"taken with the tires at the prevailing atmospheric temperatures and do not include any inflation pressure build-up due to vehicle operation.\" In short, tires should be checked when they are cold; that is after the vehicle has been parked for at least three hours or driven less than one mile. It is easiest to check your inflation pressure in the morning, after the car has been parked overnight.",
      sources: ["toyo2020", "fordRanger2025"],
      checked: CHECKED,
      notes: ["Ford's Ranger manual: \"Wait at least three hours after parking the vehicle before checking tire pressure.\" ETRTO is a little shorter: at least one hour, or no more than 2–3 km at low speed."],
    },
    {
      id: "etrto-90c",
      category: "standard",
      title: "Above 90°C can damage a tyre",
      summary: "ETRTO warns that exposing tyres to more than 90°C may cause permanent damage, for example heat from brakes or exhausts.",
      quote: "The exposure of tyres to temperatures in excess of 90° C may cause permanent damage to the tyre and this is to be avoided. Such exposure may be caused by brakes, exhaust pipes, catalytic converters, etc.",
      sources: ["etrtoRec2024"],
      checked: CHECKED,
      params: { damageC: 90 },
      notes: ["This is in ETRTO's commercial-vehicle chapter. It's about outside heat sources, not a running-temperature limit."],
    },

    // ---- field practice: the one owner-approved exception to the source policy
    {
      id: "field-practice-sand",
      category: "field-practice",
      title: "Field practice: very soft sand",
      summary:
        "Experienced drivers, the site's owner among them, often run about 1 bar in soft sand, and go as low as 0.3–0.5 bar in very soft sand at walking pace. No tyre or vehicle maker publishes figures this low: it's experience, not a recommendation. The risks rise sharply down there: the bead coming off the rim, sidewall and rim damage, and heat if you speed up.",
      sources: [],
      checked: CHECKED,
      params: { lowBar: 0.3, highBar: 0.5, typicalBar: 1.0 },
      notes: ["Not from any tyre maker, vehicle maker, standard or engineering source. Shown at the owner's request, beside the published figures, never in place of them."],
    },

    // ---- the site's own calculations (physics, not a source's figures)
    {
      id: "calc-free-air",
      category: "calculation",
      title: "Air needed to reinflate (Boyle's law)",
      summary:
        "At a constant temperature, the air needed to raise a tyre from p1 to p2 (gauge) is its air volume × (p2 − p1) ÷ the local atmospheric pressure, measured as \"free air\" at the compressor's intake. Divide by the compressor's flow to get the time.",
      sources: [],
      checked: CHECKED,
      notes: [
        "Compressed air comes out warm. As it cools in the tyre the pressure drops a little, so check again when the tyres are cold.",
        "A compressor's \"free flow\" figure (no back-pressure) is higher than what it delivers into a tyre at 2–3 bar, so with that figure the real time is longer than shown.",
      ],
    },
    {
      id: "calc-air-volume",
      category: "calculation",
      title: "Tyre air volume estimate",
      summary:
        "The air space is treated as a ring with an oval cross-section (section width × section height), its volume found with Pappus's theorem, then scaled by 0.86 so the same method gives the 57 litres Michelin publishes for its 7.50R16. Where a tyre maker publishes the volume, that figure is used instead.",
      sources: ["michelinXForceS"],
      checked: CHECKED,
      params: { calibration: 0.86 },
      notes: ["An estimate. It's calibrated on one tyre only."],
    },
    {
      id: "calc-temperature",
      category: "calculation",
      title: "Pressure and temperature (gas law)",
      summary:
        "With the same air in the tyre, absolute pressure (gauge + atmosphere) rises in step with absolute temperature (°C + 273). A tyre set to 2.4 bar at 15°C reads about 2.5 bar at 25°C, and 20% higher after driving means the air inside has warmed by about 40°C.",
      sources: ["nhtsaPneumaticTire"],
      checked: CHECKED,
      notes: ["Ignores the small change in the tyre's volume. Agrees with NHTSA's rule of thumb of about 1 psi per 10°F."],
    },
    {
      id: "calc-altitude",
      category: "calculation",
      title: "Atmospheric pressure falls with altitude",
      summary:
        "Gauges read pressure above the local atmosphere, which is lower inland: about 101 kPa at the coast and about 82 kPa at 1 750 m. Atmospheric pressure from the U.S. Standard Atmosphere 1976 (troposphere): p = 101.325 × (1 − 2.25577×10⁻⁵ × h)^5.25588 kPa, h in metres.",
      sources: ["usStdAtm1976"],
      checked: CHECKED,
      params: { p0Kpa: 101.325, k: 2.25577e-5, n: 5.25588 },
      notes: ["Side effect: a tyre set at the coast reads roughly 0.2 bar higher at 1 750 m, with the same air inside."],
    },
  ];

  // ---------------------------------------------------------------- terrains
  const terrains = [
    // lt / passenger: what applies to each tyre class. kind "cooper" uses
    // cooper-lt-terrain params.psi[key]; "toyo20" the 20% rule; "bfg" the
    // BFGoodrich 1.5 bar floor (steps only where the rule gives a stepBar);
    // null means no citable figure, so the range stays at road pressure.
    {
      id: "tar",
      name: "Tar",
      image: "tar",
      lt: null,
      passenger: null,
      ruleIds: ["toyo-vehicle-maker-minimum", "etrto-off-road", "bfg-reinflate", "etrto-hard-driving"],
      summary: "Use the vehicle maker's placard pressure (or more if your load needs it).",
    },
    {
      id: "gravel",
      name: "Gravel road",
      image: "gravel",
      lt: { kind: "cooper", key: "fastGravel" },
      passenger: { kind: "toyo20" },
      maxKmh: { rule: "toyo-20-percent", param: "maxKmh" },
      ruleIds: ["cooper-lt-terrain", "toyo-20-percent", "toyo-speeds", "bfg-same-as-road", "law-reg238", "law-public-road"],
      summary: "Fast or smooth gravel. Too low costs steering and stability at speed. 80 km/h at most on dirt.",
    },
    {
      id: "corrugations",
      name: "Rough gravel & corrugations",
      image: "corrugations",
      lt: { kind: "cooper", key: "roughGravel" },
      passenger: { kind: "toyo20" },
      maxKmh: { rule: "toyo-20-percent", param: "maxKmh" },
      ruleIds: ["cooper-lt-terrain", "cooper-corrugations", "toyo-20-percent", "watkins-gravel", "law-reg238"],
      summary: "Slow, rough or corrugated gravel. Slow down: corrugations build heat in tyres quickly.",
    },
    {
      id: "sand",
      name: "Soft sand",
      image: "sand",
      lt: { kind: "cooper", key: "sand", steps: "bfg-africa-sand" },
      passenger: { kind: "bfg", rule: "bfg-africa-sand" },
      ruleIds: ["cooper-lt-terrain", "cooper-sand", "bfg-africa-sand", "bfg-low-traction", "bfg-sand", "bfg-below-1-5", "toyo-speeds", "bfg-speed-load", "bfg-side-slopes", "army-hmmwv-sand", "field-practice-sand"],
      summary: "Lower step by step until the tyres float, slow down, and rest the tyres now and then: sand builds heat.",
    },
    {
      id: "mud",
      name: "Mud",
      image: "mud",
      lt: { kind: "cooper", key: "mud" },
      passenger: { kind: "bfg", rule: "bfg-africa-mud" },
      ruleIds: ["cooper-lt-terrain", "bfg-africa-mud", "bfg-mud", "bfg-speed-load", "bfg-below-1-5", "army-hmmwv-sand"],
      summary: "No single best pressure: thick mud on a soft base needs lower, watery mud on a firm base can stay higher. Too low can cut traction.",
    },
    {
      id: "rock",
      name: "Rock",
      image: "rock",
      lt: { kind: "cooper", key: "rock" },
      passenger: { kind: "toyo20" },
      ruleIds: ["cooper-lt-terrain", "cooper-rocks", "rock-passenger-toyo", "toyo-20-percent", "nexen-rocks", "bfg-hills", "bfg-side-slopes", "law-reg212"],
      summary: "Very slow, in low range. Lower pressure helps the tyre wrap over rocks, but too low risks pushing it off the rim.",
    },
    {
      id: "snow",
      name: "Snow & ice (road)",
      image: "snowroad",
      lt: { kind: "keep", rule: "bridgestone-snow" },
      passenger: { kind: "keep", rule: "bridgestone-snow" },
      ruleIds: ["bridgestone-snow", "nhtsa-temperature", "calc-temperature", "law-reg238"],
      summary: "Keep road pressure: letting air out doesn't help grip on snow or ice. Cold air lowers tyre pressure, so check it cold and top up to the placard.",
    },
    {
      id: "deepsnow",
      name: "Deep snow (off-road)",
      image: "snow",
      lt: { kind: "cooper", key: "sand", steps: "bfg-africa-sand" },
      passenger: { kind: "bfg", rule: "bfg-africa-sand" },
      ruleIds: ["deep-snow-sand-figures", "army-hmmwv-sand", "nokian-flotation", "bridgestone-snow", "bfg-africa-sand", "cooper-lt-terrain", "bfg-speed-load"],
      summary: "Deep soft snow is a flotation problem, like sand, so this uses your tyres' sand figures. Off-road only: back to road pressure for snowy roads.",
    },
  ];

  // ---------------------------------------------------------------- tyre options
  // Each size lists the tyre types it comes in. `table` points into TYRE_TABLES.
  const LI_SL = range(100, 125);
  const LI_XL = range(109, 120);
  const tyreSizes = [
    {
      id: "265-65r17",
      label: "265/65R17",
      geometry: { widthMm: 265, aspect: 65, rimIn: 17 },
      types: [
        { id: "sl", label: "Standard load (passenger/SUV, no XL or LT marking)", table: "etrto-sl", loadIndices: LI_SL, defaultLi: 112, example: "265/65R17 112T" },
        { id: "xl", label: "Extra Load (marked XL or Reinforced)", table: "etrto-xl", loadIndices: LI_XL, defaultLi: 116, example: "265/65R17 116H XL" },
        { id: "lt", label: "LT (light truck, two load indices)", table: "tra-lt", size: "LT265/65R17", example: "LT265/65R17 120/117S" },
      ],
    },
    {
      id: "265-60r18",
      label: "265/60R18",
      geometry: { widthMm: 265, aspect: 60, rimIn: 18 },
      types: [
        { id: "sl", label: "Standard load (passenger/SUV, no XL or LT marking)", table: "etrto-sl", loadIndices: LI_SL, defaultLi: 110, example: "265/60R18 110H" },
        { id: "xl", label: "Extra Load (marked XL or Reinforced)", table: "etrto-xl", loadIndices: LI_XL, defaultLi: 114, example: "265/60R18 114H XL" },
        { id: "lt", label: "LT (light truck, two load indices)", table: "tra-lt", size: "LT265/60R18", example: "LT265/60R18 119/116S" },
      ],
    },
    {
      id: "255-70r16",
      label: "255/70R16",
      geometry: { widthMm: 255, aspect: 70, rimIn: 16 },
      types: [
        { id: "sl", label: "Standard load (passenger/SUV, no XL or LT marking)", table: "etrto-sl", loadIndices: LI_SL, defaultLi: 111, example: "255/70R16 111T" },
        { id: "xl", label: "Extra Load (marked XL or Reinforced)", table: "etrto-xl", loadIndices: LI_XL, defaultLi: 115, example: "255/70R16 115T XL" },
        { id: "lt", label: "LT (light truck, two load indices)", table: "tra-lt", size: "LT255/70R16", example: "LT255/70R16 120/117S" },
      ],
    },
    {
      id: "lt265-75r16",
      label: "LT265/75R16",
      geometry: { widthMm: 265, aspect: 75, rimIn: 16 },
      types: [{ id: "lt", label: "LT (light truck, two load indices)", table: "tra-lt", size: "LT265/75R16", example: "LT265/75R16 123/120Q" }],
    },
    {
      id: "lt285-70r17",
      label: "LT285/70R17",
      geometry: { widthMm: 285, aspect: 70, rimIn: 17 },
      types: [{ id: "lt", label: "LT (light truck, two load indices)", table: "tra-lt", size: "LT285/70R17", example: "LT285/70R17 121/118S" }],
    },
    {
      id: "750r16",
      label: "7.50R16",
      geometry: { overallIn: 32.4, sectionWidthIn: 8.3, rimIn: 16, publishedVolumeL: 57, volumeRule: "michelin-750r16-axle" },
      types: [{ id: "michelin", label: "Michelin X Force S 116/114N (Michelin's own table)", table: "michelin-750r16", example: "7.50R16 116/114N" }],
    },
    {
      id: "31x1050r15",
      label: "31x10.50R15LT",
      geometry: { overallIn: 31, sectionWidthIn: 10.5, rimIn: 15 },
      types: [{ id: "flotation", label: "LT flotation", table: "tra-flotation", size: "31x10.50R15LT", example: "31x10.50R15LT 109S" }],
    },
  ];

  // ---------------------------------------------------------------- gaps
  const gaps = [
    { id: "gap-sans1550", title: "SANS 1550 not read", text: "SANS 1550 is a paid standard, so it hasn't been checked that its load tables match the ETRTO and TRA tables used here. Reg 238 refers to SANS 1550." },
    { id: "gap-below-tables", title: "No load data below the tables", text: "No standard or tyre maker found publishes what a tyre can carry below the lowest pressure in its table (2.4 bar for LT tyres, 1.5 bar for passenger tyres). This site shows no floor there, only the makers' speed limits." },
    { id: "gap-terrain", title: "Deep snow, and rock on passenger tyres", text: "No civilian tyre or vehicle maker publishes deep-snow pressures, so the sand figures are used for deep snow off-road. No tyre maker publishes a rock pressure for passenger-type tyres (Cooper's is LT only), so Toyo's 20% dirt-road rule is used as a cautious start." },
    { id: "gap-sand-low", title: "Soft sand below 1.5 bar", text: "For LT tyres Cooper goes down to 18 psi (about 1.25 bar) in sand; for passenger-type tyres the lowest published figure is BFGoodrich Africa's 1.4 bar (1.5 bar on its UK site), though its general page allows lower at 20 km/h or less if the tyre still carries the load. The US Army's Humvee manual goes to 0.83 bar on its own tyres, and experienced drivers go lower still (see the field-practice note)." },
    { id: "gap-speed", title: "Speed limits between road pressure and 1.5 bar", text: "BFGoodrich says to slow down when you lower pressure but gives no figure above 1.5 bar." },
    { id: "gap-beadlock-law", title: "Beadlocks on SA roads", text: "Whether beadlock wheels are allowed on SA public roads hasn't been checked." },
    { id: "gap-vehicle-handbooks", title: "SA-market owner's manuals", text: "Only a US Ford Ranger manual was read. SA editions of the Hilux, Land Cruiser, Fortuner, Ranger and Defender manuals may give figures." },
    { id: "gap-etrto-c", title: "ETRTO commercial (C) tyres", text: "Only Michelin's own 7.50R16 table is included. The ETRTO table for other C-type tyres wasn't available." },
  ];

  function range(a, b) {
    const out = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }

  root.TYRE_DATA = { checked: CHECKED, sources, rules, terrains, tyreSizes, gaps, images: [] };
})(typeof window !== "undefined" ? window : globalThis);
