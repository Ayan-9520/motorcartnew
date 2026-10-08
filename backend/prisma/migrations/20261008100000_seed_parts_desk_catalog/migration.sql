-- Motorcart Parts Desk starter catalogue (platform-fulfilled, COD / WhatsApp confirm).
-- Prices are GST-inclusive retail (18% GST on auto parts, Sept 2025 rate). Existing slugs are left untouched.
INSERT INTO "parts" ("id", "seller_id", "name", "slug", "category", "brand", "price", "original_price", "stock", "rating", "review_count", "images", "compatibility", "is_featured", "is_active", "sku", "metadata", "created_at", "updated_at")
SELECT gen_random_uuid()::text, 'motorcart-parts-desk', v.name, v.slug, v.category, v.brand, v.price, v.mrp, v.stock, 0, 0, '[]'::jsonb, v.compat::jsonb, v.featured, true, v.sku,
  jsonb_build_object(
    'mrp', v.mrp,
    'wholesale_price', v.wholesale,
    'gst_rate', 18,
    'bulk_min_qty', v.bulk,
    'part_origin', v.origin,
    'vehicle_hubs', v.hubs::jsonb,
    'description', v.description,
    'hsn_code', v.hsn,
    'fulfilled_by', 'Motorcart Parts Desk'
  ),
  NOW(), NOW()
FROM (VALUES
  -- Engine parts
  ('Bosch Oil Filter F002H23887', 'bosch-oil-filter-f002h23887-maruti', 'engine-parts', 'Bosch', 249, 320, 205, 120, 10, 'aftermarket', '["cars"]', '["Maruti Swift","Maruti Dzire","Maruti Baleno","Maruti Ertiga","Maruti WagonR"]', true, 'MCPD-ENG-001', 'Spin-on oil filter for Maruti K-series petrol engines. Replace every 10,000 km or with each oil change.', '8421'),
  ('Bosch Air Filter — Creta / Seltos 1.5', 'bosch-air-filter-creta-seltos-1-5', 'engine-parts', 'Bosch', 549, 690, 455, 80, 10, 'aftermarket', '["cars"]', '["Hyundai Creta 1.5","Kia Seltos 1.5","Hyundai Verna 1.5"]', false, 'MCPD-ENG-002', 'Panel air filter for Hyundai/Kia 1.5 petrol & diesel engines.', '8421'),
  ('Mann-Filter Cabin AC Filter CU 2135', 'mann-cabin-filter-cu2135-honda', 'engine-parts', 'Mann-Filter', 699, 899, 580, 60, 10, 'aftermarket', '["cars"]', '["Honda City","Honda Amaze","Honda Jazz","Honda WR-V"]', false, 'MCPD-ENG-003', 'Cabin air filter that traps dust and pollen. Replace every 15,000 km.', '8421'),
  ('NGK Iridium IX Spark Plug BKR6EIX', 'ngk-iridium-ix-bkr6eix', 'engine-parts', 'NGK', 749, 899, 620, 150, 4, 'aftermarket', '["cars"]', '["Maruti Swift","Hyundai i20","Honda City","Toyota Glanza"]', false, 'MCPD-ENG-004', 'Iridium spark plug — smoother idle and longer life than copper plugs. Price per plug.', '8511'),
  ('Valeo 3-Piece Clutch Kit — Swift / Dzire Petrol', 'valeo-clutch-kit-swift-dzire-petrol', 'engine-parts', 'Valeo', 5490, 6990, 4650, 25, 2, 'aftermarket', '["cars"]', '["Maruti Swift (2011+)","Maruti Dzire (2012+)","Maruti Baleno"]', true, 'MCPD-ENG-005', 'Clutch plate, pressure plate and release bearing in one kit.', '8708'),
  ('Uno Minda Fuel Pump Assembly — i20 / Grand i10', 'uno-minda-fuel-pump-i20-grand-i10', 'engine-parts', 'Uno Minda', 3990, 4800, 3350, 18, 2, 'aftermarket', '["cars"]', '["Hyundai i20","Hyundai Grand i10","Hyundai Xcent"]', false, 'MCPD-ENG-006', 'In-tank electric fuel pump module with sender unit.', '8413'),
  ('Bosch Spark Plug UR4AC — Splendor / HF Deluxe', 'bosch-spark-plug-ur4ac-hero', 'engine-parts', 'Bosch', 119, 145, 95, 400, 20, 'aftermarket', '["bikes"]', '["Hero Splendor Plus","Hero HF Deluxe","Hero Passion Pro"]', false, 'MCPD-ENG-007', 'Standard spark plug for Hero 97–110cc commuter bikes.', '8511'),
  ('Rolon Chain Sprocket Kit — Pulsar 150', 'rolon-chain-sprocket-kit-pulsar-150', 'engine-parts', 'Rolon', 1349, 1650, 1120, 45, 5, 'aftermarket', '["bikes"]', '["Bajaj Pulsar 150","Bajaj Pulsar 150 Neon"]', false, 'MCPD-ENG-008', 'O-ring chain with front and rear sprockets.', '8714'),
  ('TVS Genuine Air Filter — Apache RTR 160', 'tvs-genuine-air-filter-apache-rtr-160', 'engine-parts', 'TVS', 219, 260, 185, 90, 10, 'oem', '["bikes"]', '["TVS Apache RTR 160 2V","TVS Apache RTR 160 4V"]', false, 'MCPD-ENG-009', 'Original TVS air filter element.', '8421'),
  ('Fleetguard Fuel Filter FF5052', 'fleetguard-fuel-filter-ff5052', 'engine-parts', 'Fleetguard', 829, 980, 690, 70, 6, 'aftermarket', '["trucks","buses"]', '["Tata LPT","Ashok Leyland Ecomet","Eicher Pro"]', false, 'MCPD-ENG-010', 'Spin-on fuel filter for Cummins-powered commercial vehicles.', '8421'),
  ('Fleetguard Lube Filter LF9009', 'fleetguard-lube-filter-lf9009', 'engine-parts', 'Fleetguard', 1390, 1650, 1160, 50, 6, 'aftermarket', '["trucks","buses"]', '["Tata Prima","Ashok Leyland 3718","BharatBenz 2523"]', false, 'MCPD-ENG-011', 'Heavy-duty lube oil filter for 6-cylinder diesel engines.', '8421'),

  -- Batteries
  ('Amaron Pro 35Ah Car Battery AAM-PR-00042B20L', 'amaron-pro-35ah-00042b20l', 'battery', 'Amaron', 4549, 5199, 3990, 40, 2, 'aftermarket', '["cars"]', '["Maruti Swift","Maruti WagonR","Hyundai Grand i10","Tata Tiago"]', true, 'MCPD-BAT-001', '35Ah maintenance-free car battery with 66-month warranty (36 months free replacement). Old battery exchange accepted at delivery.', '8507'),
  ('Exide Mileage ML38B20L 35Ah', 'exide-mileage-ml38b20l-35ah', 'battery', 'Exide', 4249, 4899, 3720, 35, 2, 'aftermarket', '["cars"]', '["Maruti Alto","Maruti Swift","Hyundai Santro","Renault Kwid"]', false, 'MCPD-BAT-002', '35Ah car battery with 55-month warranty.', '8507'),
  ('Amaron Hi-Life Pro 65Ah DIN65', 'amaron-hi-life-pro-65ah-din65', 'battery', 'Amaron', 7899, 8999, 6950, 20, 2, 'aftermarket', '["cars"]', '["Hyundai Creta Diesel","Kia Seltos Diesel","Mahindra XUV700","Skoda Kushaq"]', false, 'MCPD-BAT-003', 'DIN65 battery for diesel SUVs and premium sedans.', '8507'),
  ('Exide Xplore XLTZ5A 5Ah Bike Battery', 'exide-xplore-xltz5a-5ah', 'battery', 'Exide', 1249, 1499, 1060, 80, 5, 'aftermarket', '["bikes"]', '["Hero Splendor","Honda Activa","TVS Jupiter","Bajaj Platina"]', false, 'MCPD-BAT-004', 'Factory-charged 5Ah VRLA battery for scooters and commuter bikes.', '8507'),
  ('Amaron Pro Bike Rider ETZ5L', 'amaron-pro-bike-rider-etz5l', 'battery', 'Amaron', 1349, 1599, 1150, 60, 5, 'aftermarket', '["bikes"]', '["Honda Shine","Honda Activa 6G","Suzuki Access 125"]', false, 'MCPD-BAT-005', 'Zero-maintenance two-wheeler battery, 48-month warranty.', '8507'),
  ('Exide Drimax 150Ah Truck Battery', 'exide-drimax-150ah', 'battery', 'Exide', 12999, 14999, 11400, 12, 2, 'aftermarket', '["trucks","buses"]', '["Tata LPT","Ashok Leyland","Eicher","BharatBenz"]', false, 'MCPD-BAT-006', 'Heavy-duty 150Ah battery for trucks and buses.', '8507'),
  ('Exide 3W Battery 12V 32Ah — Auto Rickshaw', 'exide-3w-battery-32ah', 'battery', 'Exide', 3790, 4390, 3290, 30, 3, 'aftermarket', '["auto"]', '["Bajaj RE","Piaggio Ape","Mahindra Alfa"]', false, 'MCPD-BAT-007', '32Ah starter battery for three-wheelers.', '8507'),

  -- Tyres
  ('MRF ZVTV 165/80 R14 Tubeless', 'mrf-zvtv-165-80-r14', 'tyres', 'MRF', 4899, 5600, 4290, 48, 4, 'aftermarket', '["cars"]', '["Maruti Dzire","Toyota Etios","Maruti Ertiga (old)"]', true, 'MCPD-TYR-001', 'Long-life tubeless tyre, price per tyre.', '4011'),
  ('Apollo Alnac 4G 185/65 R15', 'apollo-alnac-4g-185-65-r15', 'tyres', 'Apollo', 5590, 6400, 4890, 40, 4, 'aftermarket', '["cars"]', '["Honda City","Honda Amaze","Maruti Ciaz","Hyundai Verna (old)"]', false, 'MCPD-TYR-002', 'Comfort tubeless tyre with low rolling resistance, price per tyre.', '4011'),
  ('CEAT SecuraDrive 195/55 R16', 'ceat-securadrive-195-55-r16', 'tyres', 'CEAT', 6890, 7800, 6020, 32, 4, 'aftermarket', '["cars"]', '["Hyundai Creta","Hyundai Verna","Kia Seltos","Honda City (2020+)"]', false, 'MCPD-TYR-003', 'Premium touring tyre with strong wet grip, price per tyre.', '4011'),
  ('Bridgestone Ecopia EP150 175/65 R14', 'bridgestone-ecopia-ep150-175-65-r14', 'tyres', 'Bridgestone', 4690, 5300, 4100, 36, 4, 'aftermarket', '["cars"]', '["Maruti Swift (old)","Hyundai i20 (old)","Honda Brio"]', false, 'MCPD-TYR-004', 'Fuel-efficient tubeless tyre, price per tyre.', '4011'),
  ('MRF Nylogrip Zapper 90/90-17 Tubeless', 'mrf-nylogrip-zapper-90-90-17', 'tyres', 'MRF', 1990, 2350, 1720, 60, 5, 'aftermarket', '["bikes"]', '["Bajaj Pulsar 150 (front)","TVS Apache RTR 160 (front)","Honda Unicorn (front)"]', false, 'MCPD-TYR-005', 'Front tubeless tyre for 150–160cc bikes.', '4011'),
  ('CEAT Zoom Rad 100/80-17 Tubeless', 'ceat-zoom-rad-100-80-17', 'tyres', 'CEAT', 2449, 2900, 2120, 50, 5, 'aftermarket', '["bikes"]', '["Yamaha FZ (rear)","Bajaj Pulsar NS160 (front)","Honda Hornet"]', false, 'MCPD-TYR-006', 'Radial tubeless tyre for sporty commuters.', '4011'),
  ('Apollo EnduRace RA 10.00 R20', 'apollo-endurace-ra-10-00-r20', 'tyres', 'Apollo', 25900, 28500, 23800, 10, 2, 'aftermarket', '["trucks"]', '["Tata LPT 2518","Ashok Leyland 2518","Eicher Pro 6025"]', false, 'MCPD-TYR-007', 'All-position radial truck tyre for highway haulage.', '4011'),
  ('TVS Eurogrip 4.00-8 Auto Rickshaw Tyre', 'tvs-eurogrip-4-00-8-auto', 'tyres', 'TVS Eurogrip', 1790, 2100, 1540, 70, 3, 'aftermarket', '["auto"]', '["Bajaj RE","Piaggio Ape City","TVS King"]', false, 'MCPD-TYR-008', 'Nylon tyre for three-wheelers, price per tyre.', '4011'),

  -- Brake parts
  ('Bosch Front Brake Pads — Swift / Dzire / Baleno', 'bosch-front-brake-pads-swift-dzire-baleno', 'brake-parts', 'Bosch', 1349, 1690, 1120, 70, 4, 'aftermarket', '["cars"]', '["Maruti Swift","Maruti Dzire","Maruti Baleno","Maruti Ertiga"]', true, 'MCPD-BRK-001', 'Low-dust front disc pad set (4 pads).', '8708'),
  ('Brembo Front Brake Pads — Creta / Verna', 'brembo-front-brake-pads-creta-verna', 'brake-parts', 'Brembo', 2790, 3290, 2390, 30, 4, 'aftermarket', '["cars"]', '["Hyundai Creta","Hyundai Verna","Kia Seltos"]', false, 'MCPD-BRK-002', 'Premium ceramic-blend front pad set.', '8708'),
  ('Rane Brake Shoe Set — Mahindra Bolero', 'rane-brake-shoe-set-bolero', 'brake-parts', 'Rane', 1199, 1450, 1010, 40, 4, 'aftermarket', '["cars"]', '["Mahindra Bolero","Mahindra Bolero Neo","Mahindra Scorpio (rear)"]', false, 'MCPD-BRK-003', 'Rear drum brake shoe set.', '8708'),
  ('Bosch DOT 4 Brake Fluid 500 ml', 'bosch-dot4-brake-fluid-500ml', 'brake-parts', 'Bosch', 329, 399, 275, 150, 12, 'aftermarket', '["cars","bikes","auto"]', '["Universal — cars & bikes with DOT 3/4 spec"]', false, 'MCPD-BRK-004', 'High boiling-point DOT 4 brake fluid.', '3819'),
  ('Minda Front Disc Pads — Royal Enfield Classic 350', 'minda-front-disc-pads-classic-350', 'brake-parts', 'Uno Minda', 549, 650, 460, 80, 10, 'aftermarket', '["bikes"]', '["Royal Enfield Classic 350","Royal Enfield Bullet 350","Royal Enfield Meteor 350"]', false, 'MCPD-BRK-005', 'Front disc pad pair for Royal Enfield J-platform bikes.', '8714'),
  ('Brakes India Brake Lining — Tata 407', 'brakes-india-brake-lining-tata-407', 'brake-parts', 'Brakes India', 2049, 2400, 1760, 30, 4, 'aftermarket', '["trucks"]', '["Tata 407","Tata 709","Tata SFC 407"]', false, 'MCPD-BRK-006', 'Rivet-type brake lining set for light commercial vehicles.', '6813'),

  -- Lubricants
  ('Castrol GTX 15W-40 Engine Oil 3.5L', 'castrol-gtx-15w40-3-5l', 'lubricants', 'Castrol', 1349, 1530, 1180, 100, 6, 'aftermarket', '["cars"]', '["Petrol & CNG cars (API SN)"]', true, 'MCPD-LUB-001', 'Mineral engine oil for petrol and CNG cars.', '2710'),
  ('Mobil Super 3000 X1 5W-40 3.5L', 'mobil-super-3000-x1-5w40-3-5l', 'lubricants', 'Mobil', 2899, 3299, 2540, 60, 6, 'aftermarket', '["cars"]', '["Petrol & diesel cars needing 5W-40 full synthetic"]', false, 'MCPD-LUB-002', 'Full-synthetic engine oil for modern petrol and diesel engines.', '2710'),
  ('Shell Helix HX7 10W-40 3L', 'shell-helix-hx7-10w40-3l', 'lubricants', 'Shell', 1999, 2350, 1750, 70, 6, 'aftermarket', '["cars"]', '["Petrol & diesel cars (API SN/CF)"]', false, 'MCPD-LUB-003', 'Synthetic-technology engine oil.', '2710'),
  ('Castrol Activ 4T 20W-40 1L', 'castrol-activ-4t-20w40-1l', 'lubricants', 'Castrol', 379, 425, 330, 300, 12, 'aftermarket', '["bikes"]', '["Commuter motorcycles (JASO MA2)"]', false, 'MCPD-LUB-004', 'Engine oil for four-stroke motorcycles.', '2710'),
  ('Motul 7100 4T 10W-50 1L', 'motul-7100-4t-10w50-1l', 'lubricants', 'Motul', 949, 1050, 840, 120, 12, 'aftermarket', '["bikes"]', '["Royal Enfield 350/650","KTM Duke","Performance bikes (JASO MA2)"]', false, 'MCPD-LUB-005', '100% synthetic ester engine oil for performance motorcycles.', '2710'),
  ('Servo Superpremium 15W-40 7.5L', 'servo-superpremium-15w40-7-5l', 'lubricants', 'Servo', 2749, 3100, 2420, 40, 4, 'aftermarket', '["trucks","buses","cars"]', '["Diesel SUVs, pickups & LCVs (API CI-4)"]', false, 'MCPD-LUB-006', 'Diesel engine oil for SUVs, pickups and light trucks.', '2710'),
  ('Castrol CRB Turbomax 15W-40 15L', 'castrol-crb-turbomax-15w40-15l', 'lubricants', 'Castrol', 5499, 6100, 4850, 25, 2, 'aftermarket', '["trucks","buses"]', '["BS6 trucks & buses (API CK-4)"]', false, 'MCPD-LUB-007', 'Heavy-duty diesel engine oil for BS6 commercial vehicles.', '2710'),
  ('Prestone Coolant & Antifreeze 1L', 'prestone-coolant-antifreeze-1l', 'lubricants', 'Prestone', 429, 499, 360, 120, 12, 'aftermarket', '["cars"]', '["Universal — all cars"]', false, 'MCPD-LUB-008', 'Ready-to-use long-life coolant.', '3820'),

  -- Electronics
  ('Philips X-tremeVision H4 Bulbs (Pair)', 'philips-xtremevision-h4-pair', 'electronics', 'Philips', 1199, 1499, 990, 90, 5, 'aftermarket', '["cars","bikes"]', '["Any car/bike with H4 headlamp"]', false, 'MCPD-ELE-001', 'Up to 130% brighter halogen headlamp bulbs, pair.', '8539'),
  ('Philips Ultinon LED H4 (Pair)', 'philips-ultinon-led-h4-pair', 'electronics', 'Philips', 3999, 4999, 3380, 40, 3, 'aftermarket', '["cars"]', '["Any car with H4 headlamp"]', true, 'MCPD-ELE-002', '6000K LED headlamp upgrade, plug-and-play, pair.', '8539'),
  ('Bosch EC6 Car Horn (Pair)', 'bosch-ec6-horn-pair', 'electronics', 'Bosch', 1099, 1350, 920, 80, 5, 'aftermarket', '["cars"]', '["Universal 12V cars"]', false, 'MCPD-ELE-003', 'High-low tone disc horn set, 12V.', '8512'),
  ('Uno Minda Reverse Parking Sensor Kit', 'uno-minda-reverse-parking-sensor-kit', 'electronics', 'Uno Minda', 1899, 2499, 1580, 45, 3, 'aftermarket', '["cars"]', '["Universal — 4 sensors with buzzer display"]', false, 'MCPD-ELE-004', 'Four-sensor rear parking kit with LED distance display.', '8531'),
  ('70mai Dash Cam A400 with Rear Cam', '70mai-dash-cam-a400-rear', 'electronics', '70mai', 6999, 8999, 6050, 25, 2, 'aftermarket', '["cars"]', '["Universal — all cars"]', false, 'MCPD-ELE-005', '1440p front + 1080p rear dash cam with app control.', '8525'),
  ('Lucas TVS Starter Motor — Mahindra Bolero', 'lucas-tvs-starter-motor-bolero', 'electronics', 'Lucas TVS', 8490, 9800, 7350, 8, 1, 'aftermarket', '["cars"]', '["Mahindra Bolero","Mahindra Scorpio (m2DiCR)"]', false, 'MCPD-ELE-006', 'Remanufacture-free new starter motor, 12V.', '8511'),

  -- Body parts
  ('Maruti Genuine Front Bumper — Swift (2018+)', 'maruti-genuine-front-bumper-swift-2018', 'body-parts', 'Maruti Suzuki Genuine Parts', 3650, 3950, 3400, 10, 1, 'oem', '["cars"]', '["Maruti Swift (2018–2023)"]', false, 'MCPD-BDY-001', 'Unpainted genuine front bumper. Painting and fitting at your garage.', '8708'),
  ('Uno Minda ORVM Assembly LH — Creta (2020+)', 'uno-minda-orvm-lh-creta-2020', 'body-parts', 'Uno Minda', 3590, 4200, 3080, 12, 1, 'aftermarket', '["cars"]', '["Hyundai Creta (2020+)"]', false, 'MCPD-BDY-002', 'Electric-adjust left outside mirror with indicator.', '7009'),
  ('Mahindra Genuine Tail Lamp RH — Bolero Neo', 'mahindra-genuine-tail-lamp-rh-bolero-neo', 'body-parts', 'Mahindra Genuine Parts', 2450, 2650, 2280, 10, 1, 'oem', '["cars"]', '["Mahindra Bolero Neo"]', false, 'MCPD-BDY-003', 'Original right-hand tail lamp assembly.', '8512'),
  ('Lumax Headlamp Assembly — Honda Activa 6G', 'lumax-headlamp-activa-6g', 'body-parts', 'Lumax', 1249, 1450, 1060, 25, 2, 'aftermarket', '["bikes"]', '["Honda Activa 6G"]', false, 'MCPD-BDY-004', 'Complete headlamp unit for Activa 6G.', '8512'),

  -- Accessories
  ('Bosch Aerotwin Wiper Blades 24"+16"', 'bosch-aerotwin-wiper-24-16', 'accessories', 'Bosch', 1199, 1499, 1000, 70, 4, 'aftermarket', '["cars"]', '["Maruti Swift","Maruti Baleno","Hyundai i20","Tata Altroz"]', false, 'MCPD-ACC-001', 'Beam-type frameless wiper blade pair.', '8512'),
  ('3M Car Shampoo 1L', '3m-car-shampoo-1l', 'accessories', '3M', 549, 649, 460, 120, 12, 'aftermarket', '["cars","bikes"]', '["Universal"]', false, 'MCPD-ACC-002', 'pH-balanced foam shampoo that is safe on wax and ceramic coats.', '3405'),
  ('Michelin 12V Digital Tyre Inflator', 'michelin-12v-digital-tyre-inflator', 'accessories', 'Michelin', 3299, 4499, 2800, 30, 3, 'aftermarket', '["cars","bikes"]', '["Universal — 12V socket"]', true, 'MCPD-ACC-003', 'Auto cut-off inflator with digital pressure gauge.', '8414'),
  ('Steelbird SBH-34 ISI Full-Face Helmet', 'steelbird-sbh-34-helmet', 'accessories', 'Steelbird', 1549, 1899, 1300, 60, 5, 'aftermarket', '["bikes"]', '["Universal — M/L sizes"]', false, 'MCPD-ACC-004', 'ISI-certified full-face helmet with clear visor.', '6506'),
  ('3D Car Floor Mats — Maruti Brezza', '3d-floor-mats-maruti-brezza', 'accessories', 'Elegant', 2499, 3499, 2100, 20, 2, 'aftermarket', '["cars"]', '["Maruti Brezza (2022+)"]', false, 'MCPD-ACC-005', 'Custom-fit TPE 3D floor mats, full set.', '4016'),

  -- Interior
  ('Autofurnish PU Leather Seat Covers — Swift', 'autofurnish-seat-covers-swift', 'interior-parts', 'Autofurnish', 5999, 7999, 5100, 15, 2, 'aftermarket', '["cars"]', '["Maruti Swift (2018+)"]', false, 'MCPD-INT-001', 'Custom-fit PU leather seat covers, full set for 5 seats.', '9401'),
  ('Leather Steering Wheel Cover 38 cm', 'leather-steering-wheel-cover-38cm', 'interior-parts', 'Kingsway', 449, 699, 360, 100, 10, 'aftermarket', '["cars"]', '["Universal — 37–39 cm steering wheels"]', false, 'MCPD-INT-002', 'Anti-slip stitched leather steering cover.', '4205'),
  ('Godrej aer twist Car Freshener', 'godrej-aer-twist-car-freshener', 'interior-parts', 'Godrej', 269, 299, 225, 200, 12, 'aftermarket', '["cars"]', '["Universal — AC vent clip"]', false, 'MCPD-INT-003', 'Vent-clip gel freshener, lasts up to 60 days.', '3307')
) AS v(name, slug, category, brand, price, mrp, wholesale, stock, bulk, origin, hubs, compat, featured, sku, description, hsn)
ON CONFLICT ("slug") DO NOTHING;
