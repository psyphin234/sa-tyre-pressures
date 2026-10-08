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
 * Rule categories: law | standard | tyre-maker | vehicle-maker | engineering | calculation
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
    bfgAuFaq: {
      label: "BFGoodrich (Australia), FAQ: tyre pressures",
      url: "https://www.bfgoodrich.com.au/auto/help-and-advice/faq-tyre-pressures",
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
      id: "etrto-tube-type",
      category: "standard",
      title: "Tube-type tyres",
      summary:
        "A tyre without a tubeless marking is meant to be used with an inner tube, and a new tube, valve and flap should be fitted when a tube-type tyre is replaced.",
      quote:
        "Where no tubeless marking appears on the tyre sidewalls, tyres are intended for fitment with an appropriate inner tube. … In the case of replacement of tube type tyres, always fit a new inner tube, valve and flap.",
      sources: ["etrtoRec2024"],
      checked: CHECKED,
    },

    // ---- BFGoodrich (the only tyre maker found that publishes off-road figures)
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
  // `lowerTo` is the lowest pressure a tyre-maker source names for this
  // terrain; null means no citable figure, so the range stays at road pressure.
  const terrains = [
    {
      id: "tar",
      name: "Tar",
      image: "tar",
      lowerTo: null,
      ruleIds: ["toyo-vehicle-maker-minimum", "etrto-off-road", "bfg-reinflate", "etrto-hard-driving"],
      summary: "Use the vehicle maker's placard pressure (or more if your load needs it). Towing or sustained high speed: ETRTO adds 0.2–0.5 bar for passenger-type tyres.",
    },
    {
      id: "gravel",
      name: "Gravel / dirt",
      image: "gravel",
      lowerTo: null,
      ruleIds: ["bfg-same-as-road", "law-reg238", "law-public-road"],
      summary: "No tyre or vehicle maker found publishes a lower pressure for gravel. BFGoodrich: most off-road driving can be done at road pressure. Public gravel roads are public roads.",
    },
    {
      id: "corrugations",
      name: "Corrugations",
      image: "corrugations",
      lowerTo: null,
      ruleIds: ["bfg-same-as-road", "watkins-gravel", "law-reg238"],
      summary: "No tyre or vehicle maker figure found. Research on log trucks shows lower pressures reduce how corrugations form, but that isn't a pressure for your 4x4.",
    },
    {
      id: "sand",
      name: "Soft sand",
      image: "sand",
      lowerTo: "bfg-sand",
      ruleIds: ["bfg-low-traction", "bfg-sand", "bfg-below-1-5", "bfg-au-20psi", "bfg-speed-load", "bfg-side-slopes"],
      summary: "BFGoodrich: lower 0.5 bar at a time until the tyre floats, no lower than 1.5 bar, and no faster than 20 km/h at 1.5 bar.",
    },
    {
      id: "mud",
      name: "Mud",
      image: "mud",
      lowerTo: "bfg-mud",
      ruleIds: ["bfg-mud", "bfg-speed-load"],
      summary: "BFGoodrich: no single best pressure; too low can cut traction. Not below 1.5 bar, not over 20 km/h.",
    },
    {
      id: "rock",
      name: "Rock",
      image: "rock",
      lowerTo: null,
      ruleIds: ["bfg-hills", "bfg-side-slopes", "bfg-same-as-road", "law-reg212"],
      summary: "No tyre or vehicle maker figure found for rock. BFGoodrich: climbs may need less pressure, but lower cautiously (punctures mid-climb), and use road pressure across side slopes.",
    },
    {
      id: "snow",
      name: "Snow / ice",
      image: "snow",
      lowerTo: null,
      ruleIds: ["bfg-same-as-road"],
      summary: "No tyre or vehicle maker figure found for snow or ice.",
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
    { id: "gap-terrain", title: "No figures for gravel, corrugations, rock, snow", text: "No tyre maker, vehicle maker or engineering source found gives pressures for gravel, corrugations, rock or snow/ice. Only BFGoodrich gives figures, for sand and mud." },
    { id: "gap-sand-low", title: "Soft sand below 1.5 bar", text: "Pressures around 0.8–1.2 bar for soft sand are widely repeated, but no tyre or vehicle maker publishing them was found. BFGoodrich says not below 1.5 bar on sand." },
    { id: "gap-speed", title: "Speed limits between road pressure and 1.5 bar", text: "BFGoodrich says to slow down when you lower pressure but gives no figure above 1.5 bar." },
    { id: "gap-tubes", title: "Tubes at low pressure", text: "No tyre or vehicle maker guidance was found on running tube-type tyres at low pressure." },
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
