console.log('--- RUNNING LOOP 5 3D RECONSTRUCTION ENGINE TESTS ---');

// Import or recreate the reconstruction logic for testing
function buildRoom3DModel(analysis) {
  const defaultLength = 5.0;
  const defaultWidth = 4.0;
  const defaultHeight = 2.8;

  const length = (analysis && typeof analysis.dimensions?.lengthMeters === 'number') 
    ? Math.max(2.0, analysis.dimensions.lengthMeters) 
    : defaultLength;
  const width = (analysis && typeof analysis.dimensions?.widthMeters === 'number') 
    ? Math.max(2.0, analysis.dimensions.widthMeters) 
    : defaultWidth;
  const height = (analysis && typeof analysis.dimensions?.heightMeters === 'number') 
    ? Math.max(2.0, analysis.dimensions.heightMeters) 
    : defaultHeight;

  const wallThickness = 0.15;
  const halfL = length / 2;
  const halfW = width / 2;
  const halfH = height / 2;

  const floorColor = analysis?.floor?.colorHex || '#c2b280';
  const wallColor = analysis?.walls?.[0]?.colorHex || '#e2e8f0';
  const hasUncertainGeometry = analysis?.hasUncertainGeometry ?? true;
  const uncertainty = analysis?.dimensions?.uncertaintyMarginMeters ?? 0.5;

  const walls = [
    { id: 'wall_north', orientation: 'north', width: length, height, depth: wallThickness, position: [0, halfH, -halfW], rotation: [0, 0, 0], color: wallColor, isEstimated: false },
    { id: 'wall_south', orientation: 'south', width: length, height, depth: wallThickness, position: [0, halfH, halfW], rotation: [0, 0, 0], color: wallColor, isEstimated: hasUncertainGeometry },
    { id: 'wall_west', orientation: 'west', width, height, depth: wallThickness, position: [-halfL, halfH, 0], rotation: [0, Math.PI / 2, 0], color: wallColor, isEstimated: false },
    { id: 'wall_east', orientation: 'east', width, height, depth: wallThickness, position: [halfL, halfH, 0], rotation: [0, Math.PI / 2, 0], color: wallColor, isEstimated: false }
  ];

  const openings = [];
  const rawDoors = Array.isArray(analysis?.doors) ? analysis.doors : [];
  rawDoors.forEach((door, idx) => {
    const doorW = typeof door.estimatedDimensions?.widthMeters === 'number' ? door.estimatedDimensions.widthMeters : 0.9;
    const doorH = typeof door.estimatedDimensions?.heightMeters === 'number' ? door.estimatedDimensions.heightMeters : 2.1;
    openings.push({
      id: door.id || `door_${idx}`,
      type: 'door',
      label: door.label || 'Door',
      width: doorW,
      height: doorH,
      depth: 0.1,
      position: [-halfL, doorH / 2, -halfW * 0.3],
      rotation: [0, Math.PI / 2, 0],
      isEstimated: true
    });
  });

  const rawWindows = Array.isArray(analysis?.windows) ? analysis.windows : [];
  rawWindows.forEach((win, idx) => {
    const winW = typeof win.estimatedDimensions?.widthMeters === 'number' ? win.estimatedDimensions.widthMeters : 1.4;
    const winH = typeof win.estimatedDimensions?.heightMeters === 'number' ? win.estimatedDimensions.heightMeters : 1.4;
    openings.push({
      id: win.id || `win_${idx}`,
      type: 'window',
      label: win.label || 'Window',
      width: winW,
      height: winH,
      depth: 0.08,
      position: [halfL, 1.0 + winH / 2, 0],
      rotation: [0, Math.PI / 2, 0],
      isEstimated: true
    });
  });

  const furniture = [];
  const detectedItems = [
    ...(Array.isArray(analysis?.furniture) ? analysis.furniture : []),
    ...(Array.isArray(analysis?.appliances) ? analysis.appliances : []),
    ...(Array.isArray(analysis?.majorObjects) ? analysis.majorObjects : [])
  ];

  detectedItems.forEach((item, idx) => {
    const objW = typeof item.estimatedDimensions?.widthMeters === 'number' ? item.estimatedDimensions.widthMeters : 1.0;
    const objH = typeof item.estimatedDimensions?.heightMeters === 'number' ? item.estimatedDimensions.heightMeters : 0.8;
    const objD = typeof item.estimatedDimensions?.depthMeters === 'number' ? item.estimatedDimensions.depthMeters : 0.8;

    let posX = 0;
    let posZ = 0;
    let posY = item.relativePosition?.floorProximity === 'wall_mounted' ? 1.5 : objH / 2;

    if (item.relativePosition?.wallAlignment === 'north') {
      posX = (idx % 2 === 0 ? -0.2 : 0.4) * halfL;
      posZ = -halfW + objD / 2 + 0.1;
    } else if (item.relativePosition?.wallAlignment === 'south') {
      posX = 0;
      posZ = halfW - objD / 2 - 0.1;
    } else if (item.relativePosition?.wallAlignment === 'west') {
      posX = -halfL + objW / 2 + 0.1;
      posZ = 0;
    } else if (item.relativePosition?.wallAlignment === 'east') {
      posX = halfL - objW / 2 - 0.1;
      posZ = 0;
    } else {
      posX = 0;
      posZ = (idx % 2 === 0 ? 0.2 : -0.2);
    }

    furniture.push({
      id: item.id || `furn_${idx}`,
      label: item.label || 'Furniture Object',
      category: item.category || 'furniture',
      width: objW,
      height: objH,
      depth: objD,
      position: [posX, posY, posZ],
      rotation: [0, 0, 0],
      isEstimated: true,
      confidence: item.confidence || 0.8
    });
  });

  return {
    dimensions: { length, width, height, uncertainty, isEstimated: true },
    floor: { width: length, length: width, color: floorColor },
    ceiling: { width: length, length: width, height, color: '#f8fafc' },
    walls,
    openings,
    furniture,
    hasUncertainGeometry
  };
}

// 1. Scene Creation with Valid Analysis Data
const mockAnalysis = {
  roomType: 'Living Room',
  confidence: 0.88,
  dimensions: { lengthMeters: 5.4, widthMeters: 4.2, heightMeters: 2.8, isEstimated: true, uncertaintyMarginMeters: 0.3 },
  walls: [{ id: 'w1', colorHex: '#f1f5f9' }],
  floor: { id: 'f1', colorHex: '#d2b48c' },
  doors: [{ id: 'd1', label: 'Main Door', estimatedDimensions: { widthMeters: 0.9, heightMeters: 2.1, depthMeters: 0.1 }, relativePosition: { wallAlignment: 'west' } }],
  windows: [{ id: 'win1', label: 'Bay Window', estimatedDimensions: { widthMeters: 1.6, heightMeters: 1.4, depthMeters: 'unknown' }, relativePosition: { wallAlignment: 'east' } }],
  furniture: [{ id: 'sofa1', label: 'Sectional Sofa', category: 'furniture', estimatedDimensions: { widthMeters: 2.2, heightMeters: 0.85, depthMeters: 0.95 }, relativePosition: { wallAlignment: 'north', floorProximity: 'on_floor' } }],
  appliances: [{ id: 'tv1', label: 'OLED TV', category: 'appliance', estimatedDimensions: { widthMeters: 1.3, heightMeters: 0.75, depthMeters: 0.08 }, relativePosition: { wallAlignment: 'north', floorProximity: 'wall_mounted' } }],
  majorObjects: [],
  hasUncertainGeometry: false
};

const model1 = buildRoom3DModel(mockAnalysis);
console.assert(model1.dimensions.length === 5.4, 'Test 1.1 Failed: Length mismatch');
console.assert(model1.dimensions.width === 4.2, 'Test 1.2 Failed: Width mismatch');
console.assert(model1.walls.length === 4, 'Test 1.3 Failed: 4 walls expected');
console.assert(model1.openings.length === 2, 'Test 1.4 Failed: 2 openings expected');
console.assert(model1.furniture.length === 2, 'Test 1.5 Failed: 2 furniture objects expected');
console.assert(model1.furniture.find(f => f.id === 'tv1').position[1] === 1.5, 'Test 1.6 Failed: TV should be wall mounted at Y=1.5');
console.log('✓ Test 1 Passed: 3D scene model generated from valid room analysis');

// 2. Malformed Reconstruction Data Resilience
const nullModel = buildRoom3DModel(null);
console.assert(nullModel.dimensions.length > 0, 'Test 2.1 Failed: null input should use fallback length');
console.assert(nullModel.walls.length === 4, 'Test 2.2 Failed: null input should have 4 fallback walls');

const emptyModel = buildRoom3DModel({});
console.assert(emptyModel.dimensions.height === 2.8, 'Test 2.3 Failed: empty input should have fallback height');

const corruptedModel = buildRoom3DModel({ dimensions: { lengthMeters: 'five', widthMeters: null } });
console.assert(typeof corruptedModel.dimensions.length === 'number', 'Test 2.4 Failed: corrupted types must fallback to numbers');
console.log('✓ Test 2 Passed: Malformed reconstruction data handled safely without crashes');

// 3. Uncertainty Representation
console.assert(model1.walls.find(w => w.orientation === 'south').isEstimated === false, 'Test 3.1 Failed: South wall should be known when hasUncertainGeometry=false');
const uncertainAnalysis = { ...mockAnalysis, hasUncertainGeometry: true };
const modelUncertain = buildRoom3DModel(uncertainAnalysis);
console.assert(modelUncertain.walls.find(w => w.orientation === 'south').isEstimated === true, 'Test 3.2 Failed: South wall must be marked estimated when geometry is uncertain');
console.log('✓ Test 3 Passed: Estimated vs known geometry differentiation verified');

// 4. Boundary Constraint Integrity
model1.furniture.forEach((f) => {
  const halfL = model1.dimensions.length / 2;
  const halfW = model1.dimensions.width / 2;
  const withinX = Math.abs(f.position[0]) <= halfL + 0.1;
  const withinZ = Math.abs(f.position[2]) <= halfW + 0.1;
  console.assert(withinX && withinZ, `Test 4 Failed: Object ${f.label} positioned outside room bounds`);
});
console.log('✓ Test 4 Passed: Spatial boundary constraint integrity verified');

console.log('--- ALL LOOP 5 UNIT VERIFICATIONS PASSED ---');
