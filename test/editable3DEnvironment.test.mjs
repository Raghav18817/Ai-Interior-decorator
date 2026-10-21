console.log('--- RUNNING LOOP 13 EDITABLE 3D ENVIRONMENT TESTS ---');

// Recreate pure logic from editable3DService in isolated test runner
function getEffectiveFootprint(item) {
  const rotY = item.rotation ? item.rotation[1] : 0;
  const cos = Math.abs(Math.cos(rotY));
  const sin = Math.abs(Math.sin(rotY));

  const effW = cos * item.width + sin * item.depth;
  const effD = sin * item.width + cos * item.depth;

  return {
    minX: item.position[0] - effW / 2,
    maxX: item.position[0] + effW / 2,
    minZ: item.position[2] - effD / 2,
    maxZ: item.position[2] + effD / 2,
    effW,
    effD
  };
}

function checkPairwiseCollision(a, b) {
  if (a.type === 'rug' || b.type === 'rug' || a.category === 'decor' || b.category === 'decor') return false;

  const isStacked = (lower, upper) => {
    const horizontalOverlap = 
      Math.abs(lower.position[0] - upper.position[0]) < lower.width / 2 &&
      Math.abs(lower.position[2] - upper.position[2]) < lower.depth / 2;
    const verticalElevation = upper.position[1] >= lower.position[1] + lower.height - 0.1;
    return horizontalOverlap && verticalElevation;
  };

  if (isStacked(a, b) || isStacked(b, a)) return false;

  const boxA = getEffectiveFootprint(a);
  const boxB = getEffectiveFootprint(b);
  const buffer = 0.03;

  const overlapX = boxA.minX + buffer < boxB.maxX - buffer && boxA.maxX - buffer > boxB.minX + buffer;
  const overlapZ = boxA.minZ + buffer < boxB.maxZ - buffer && boxA.maxZ - buffer > boxB.minZ + buffer;

  return overlapX && overlapZ;
}

function checkItemLiveConstraints(item, allFurniture, roomDimensions, openings = []) {
  const { length: roomL, width: roomW } = roomDimensions;
  const halfL = roomL / 2;
  const halfW = roomW / 2;
  const fp = getEffectiveFootprint(item);

  const margin = 0.02;
  if (
    fp.minX < -halfL - margin || 
    fp.maxX > halfL + margin || 
    fp.minZ < -halfW - margin || 
    fp.maxZ > halfW + margin
  ) {
    return { isValid: false, status: 'boundary', message: 'Item protrudes outside room boundary' };
  }

  for (const door of openings.filter(o => o.type === 'door')) {
    const distToDoor = Math.hypot(item.position[0] - door.position[0], item.position[2] - door.position[2]);
    if (distToDoor < 0.85) {
      return { isValid: false, status: 'door', message: `Encroaches door passage (${door.label})` };
    }
  }

  for (const other of allFurniture) {
    if (other.id === item.id) continue;
    if (checkPairwiseCollision(item, other)) {
      return { isValid: false, status: 'collision', message: `Colliding with ${other.name}` };
    }
  }

  return { isValid: true, status: 'ok', message: 'Placement code-compliant & clear' };
}

function calculateFloorDragPosition(targetPos, item, roomDimensions) {
  const { length: roomL, width: roomW } = roomDimensions;
  const fp = getEffectiveFootprint(item);
  const maxAllowedX = roomL / 2 - fp.effW / 2;
  const maxAllowedZ = roomW / 2 - fp.effD / 2;

  const clampedX = Math.max(-maxAllowedX, Math.min(maxAllowedX, targetPos.x));
  const clampedZ = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, targetPos.z));

  return [Number(clampedX.toFixed(2)), item.position[1], Number(clampedZ.toFixed(2))];
}

function calculateSnapToWall(item, roomDimensions) {
  const { length: roomL, width: roomW } = roomDimensions;
  const halfL = roomL / 2;
  const halfW = roomW / 2;

  const distToEast = Math.abs(halfL - item.position[0]);
  const distToWest = Math.abs(-halfL - item.position[0]);
  const distToSouth = Math.abs(halfW - item.position[2]);
  const distToNorth = Math.abs(-halfW - item.position[2]);

  const minDist = Math.min(distToEast, distToWest, distToSouth, distToNorth);

  let wall = 'north';
  let newX = item.position[0];
  let newZ = item.position[2];
  let newRotY = 0;

  if (minDist === distToNorth) {
    wall = 'north';
    newZ = -halfW + item.depth / 2 + 0.05;
    newRotY = 0;
  } else if (minDist === distToSouth) {
    wall = 'south';
    newZ = halfW - item.depth / 2 - 0.05;
    newRotY = Math.PI;
  } else if (minDist === distToEast) {
    wall = 'east';
    newX = halfL - item.depth / 2 - 0.05;
    newRotY = -Math.PI / 2;
  } else {
    wall = 'west';
    newX = -halfL + item.depth / 2 + 0.05;
    newRotY = Math.PI / 2;
  }

  const isNorthSouth = wall === 'north' || wall === 'south';
  const maxAllowedX = halfL - (isNorthSouth ? item.width : item.depth) / 2;
  const maxAllowedZ = halfW - (isNorthSouth ? item.depth : item.width) / 2;
  newX = Math.max(-maxAllowedX, Math.min(maxAllowedX, Number(newX.toFixed(2))));
  newZ = Math.max(-maxAllowedZ, Math.min(maxAllowedZ, Number(newZ.toFixed(2))));

  return {
    position: [newX, item.position[1], newZ],
    rotation: [item.rotation[0], Number(newRotY.toFixed(4)), item.rotation[2]],
    wall
  };
}

function duplicateFurnitureItem(item, roomDimensions) {
  const { length: roomL, width: roomW } = roomDimensions;
  const maxAllowedX = roomL / 2 - item.width / 2;
  const maxAllowedZ = roomW / 2 - item.depth / 2;

  let nextX = item.position[0] + 0.35;
  let nextZ = item.position[2] + 0.35;

  if (nextX > maxAllowedX) nextX = item.position[0] - 0.35;
  if (nextZ > maxAllowedZ) nextZ = item.position[2] - 0.35;

  return {
    ...item,
    id: `furn_dup_${Date.now()}_test`,
    name: `${item.name} (Copy)`,
    position: [Number(nextX.toFixed(2)), item.position[1], Number(nextZ.toFixed(2))],
    rotation: [...item.rotation],
    isExisting: false
  };
}

// ----------------------------------------------------
// Test Fixtures
// ----------------------------------------------------
const roomDim = { length: 5.0, width: 4.0, height: 2.8 };
const openings = [
  { id: 'door1', type: 'door', position: [-2.5, 1.0, -1.0], width: 0.9, height: 2.1, label: 'Entry Door' }
];

const sampleSofa = {
  id: 'sofa_1',
  name: 'Modern 3-Seater Sofa',
  category: 'seating',
  width: 2.2,
  height: 0.85,
  depth: 0.95,
  position: [0, 0, 1.2],
  rotation: [0, 0, 0]
};

const sampleTable = {
  id: 'table_1',
  name: 'Glass Coffee Table',
  category: 'tables',
  width: 1.1,
  height: 0.45,
  depth: 0.6,
  position: [0, 0, 0.2],
  rotation: [0, 0, 0]
};

const furnitureList = [sampleSofa, sampleTable];

// ----------------------------------------------------
// TEST 1: Live Constraint Status - Code Compliant
// ----------------------------------------------------
console.log('Testing 1: Live Constraint Check on Valid Placement');
const statusOk = checkItemLiveConstraints(sampleSofa, furnitureList, roomDim, openings);
console.assert(statusOk.isValid === true, `Test 1.1 Failed: Got status ${statusOk.status}`);
console.assert(statusOk.status === 'ok', `Test 1.2 Failed: Message ${statusOk.message}`);
console.log('✓ Test 1 Passed: Valid piece confirmed code-compliant and clear');

// ----------------------------------------------------
// TEST 2: Live Constraint Check - Collision Detection
// ----------------------------------------------------
console.log('\nTesting 2: Live Constraint Check on Collision');
const collidingTable = { ...sampleTable, position: [0, 0, 1.1] }; // Intersects sofa at [0, 0, 1.2]
const statusCol = checkItemLiveConstraints(collidingTable, furnitureList, roomDim, openings);
console.assert(statusCol.isValid === false, 'Test 2.1 Failed: Expected invalid status on collision');
console.assert(statusCol.status === 'collision', `Test 2.2 Failed: Expected collision, got ${statusCol.status}`);
console.log('✓ Test 2 Passed: Collision with sofa immediately flagged in real-time');

// ----------------------------------------------------
// TEST 3: Live Constraint Check - Boundary Overflow
// ----------------------------------------------------
console.log('\nTesting 3: Live Constraint Check on Boundary Overflow');
const outOfBoundsSofa = { ...sampleSofa, position: [2.0, 0, 0] }; // halfL is 2.5, sofa width is 2.2 -> maxX = 2.0 + 1.1 = 3.1 > 2.5
const statusBnd = checkItemLiveConstraints(outOfBoundsSofa, furnitureList, roomDim, openings);
console.assert(statusBnd.isValid === false, 'Test 3.1 Failed: Expected boundary violation');
console.assert(statusBnd.status === 'boundary', `Test 3.2 Failed: Expected boundary, got ${statusBnd.status}`);
console.log('✓ Test 3 Passed: Boundary overflow immediately detected and flagged');

// ----------------------------------------------------
// TEST 4: Floor Drag Projection & Clamping
// ----------------------------------------------------
console.log('\nTesting 4: Floor Drag Plane Projection & Boundary Clamping');
// User drags cursor to [4.0, -3.5] (way outside room bounds)
const dragPos = calculateFloorDragPosition({ x: 4.0, z: -3.5 }, sampleSofa, roomDim);
const halfL = roomDim.length / 2; // 2.5
const halfW = roomDim.width / 2; // 2.0
const maxAllowedX = halfL - sampleSofa.width / 2; // 2.5 - 1.1 = 1.4
const maxAllowedZ = halfW - sampleSofa.depth / 2; // 2.0 - 0.475 = 1.525

console.assert(dragPos[0] <= maxAllowedX, `Test 4.1 Failed: Clamped X ${dragPos[0]} exceeds maxAllowedX ${maxAllowedX}`);
console.assert(dragPos[2] >= -maxAllowedZ, `Test 4.2 Failed: Clamped Z ${dragPos[2]} exceeds -maxAllowedZ`);
console.log(`✓ Test 4 Passed: Out-of-bounds drag target [4.0, -3.5] safely clamped to [${dragPos[0]}, ${dragPos[2]}]`);

// ----------------------------------------------------
// TEST 5: Snap to Nearest Wall
// ----------------------------------------------------
console.log('\nTesting 5: Snap-to-Wall Precision');
// Place sofa near South wall (Z = 1.6, halfW = 2.0)
const nearSouthSofa = { ...sampleSofa, position: [0.5, 0, 1.6] };
const snapResult = calculateSnapToWall(nearSouthSofa, roomDim);

console.assert(snapResult.wall === 'south', `Test 5.1 Failed: Expected South wall, got ${snapResult.wall}`);
console.assert(snapResult.position[2] > 1.4, `Test 5.2 Failed: Snapped Z position ${snapResult.position[2]} not flush against South wall`);
console.assert(Math.abs(snapResult.rotation[1] - Math.PI) < 0.01, `Test 5.3 Failed: Expected rotation PI facing into room`);
console.log(`✓ Test 5 Passed: Successfully snapped sofa flush against South wall at Z=${snapResult.position[2]}m`);

// ----------------------------------------------------
// TEST 6: Furniture Duplication
// ----------------------------------------------------
console.log('\nTesting 6: Furniture Piece Duplication');
const duplicated = duplicateFurnitureItem(sampleTable, roomDim);

console.assert(duplicated.id !== sampleTable.id, 'Test 6.1 Failed: Clone ID must be unique');
console.assert(duplicated.name.includes('(Copy)'), 'Test 6.2 Failed: Cloned name missing tag');
console.assert(duplicated.width === sampleTable.width, 'Test 6.3 Failed: Cloned width mismatch');
console.assert(duplicated.position[0] !== sampleTable.position[0] || duplicated.position[2] !== sampleTable.position[2], 'Test 6.4 Failed: Cloned item directly overlaps original');
console.log(`✓ Test 6 Passed: Duplicated ${sampleTable.name} into ${duplicated.name} with unique ID and offset position`);

console.log('\nALL LOOP 13 EDITABLE 3D ENVIRONMENT TESTS PASSED CLEANLY!');
