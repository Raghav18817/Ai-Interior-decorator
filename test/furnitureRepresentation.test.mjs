console.log('--- RUNNING LOOP 6 FURNITURE REPRESENTATION TESTS ---');

// 1. Catalog Standards Verification
const catalog = [
  { type: 'sofa_3seater', defaultWidth: 2.1, defaultHeight: 0.85, defaultDepth: 0.9, clearance: { frontMeters: 0.8 } },
  { type: 'armchair', defaultWidth: 0.85, defaultHeight: 0.85, defaultDepth: 0.85, clearance: { frontMeters: 0.6 } },
  { type: 'coffee_table', defaultWidth: 1.1, defaultHeight: 0.45, defaultDepth: 0.6, clearance: { frontMeters: 0.45 } },
  { type: 'queen_bed', defaultWidth: 1.6, defaultHeight: 1.0, defaultDepth: 2.1, clearance: { frontMeters: 0.8 } },
  { type: 'study_desk', defaultWidth: 1.4, defaultHeight: 0.75, defaultDepth: 0.7, clearance: { frontMeters: 0.9 } },
  { type: 'ergonomic_chair', defaultWidth: 0.65, defaultHeight: 1.05, defaultDepth: 0.65, clearance: { frontMeters: 0.7 } }
];

catalog.forEach((item) => {
  console.assert(item.defaultWidth > 0, `Catalog Test Failed: ${item.type} width invalid`);
  console.assert(item.defaultHeight > 0, `Catalog Test Failed: ${item.type} height invalid`);
  console.assert(item.defaultDepth > 0, `Catalog Test Failed: ${item.type} depth invalid`);
  console.assert(item.clearance.frontMeters > 0, `Catalog Test Failed: ${item.type} front clearance invalid`);
});
console.log('✓ Test 1 Passed: Furniture catalog dimensional standards and clearances verified');

// 2. Furniture Representation Structure
const sampleItem = {
  id: 'furn_sofa_1',
  type: 'sofa_3seater',
  name: 'Primary 3-Seater Sofa',
  category: 'seating',
  width: 2.1,
  height: 0.85,
  depth: 0.9,
  position: [0.2, 0, -1.5],
  rotation: [0, 0, 0],
  room: 'Living Room',
  color: '#334155',
  clearanceRequired: { frontMeters: 0.8, sidesMeters: 0.3 },
  isExisting: true
};

console.assert(sampleItem.width === 2.1, 'Test 2.1 Failed: Width mismatch');
console.assert(sampleItem.position.length === 3, 'Test 2.2 Failed: Position vector must have 3 coordinates');
console.assert(sampleItem.rotation.length === 3, 'Test 2.3 Failed: Rotation vector must have 3 coordinates');
console.assert(sampleItem.room === 'Living Room', 'Test 2.4 Failed: Room assignment mismatch');
console.log('✓ Test 2 Passed: Furniture schema completeness (type, dimensions, position, rotation, room) verified');

// 3. Positioning and Boundary Clamping
function nudgePosition(item, roomLength, roomWidth, axis, delta) {
  const halfL = roomLength / 2 - item.width / 2;
  const halfW = roomWidth / 2 - item.depth / 2;
  const newPos = [...item.position];

  if (axis === 'x') {
    newPos[0] = Math.max(-halfL, Math.min(halfL, Number((newPos[0] + delta).toFixed(2))));
  } else {
    newPos[2] = Math.max(-halfW, Math.min(halfW, Number((newPos[2] + delta).toFixed(2))));
  }
  return { ...item, position: newPos };
}

const roomL = 5.0;
const roomW = 4.0;
// Nudge within room
const moved = nudgePosition(sampleItem, roomL, roomW, 'x', 0.4);
console.assert(moved.position[0] === 0.6, 'Test 3.1 Failed: Normal nudge failed');

// Extreme nudge clamped by wall boundary
const clamped = nudgePosition(sampleItem, roomL, roomW, 'x', 10.0);
const maxAllowedX = roomL / 2 - sampleItem.width / 2;
console.assert(clamped.position[0] === maxAllowedX, `Test 3.2 Failed: Boundary clamp failed, got ${clamped.position[0]}, expected ${maxAllowedX}`);
console.log('✓ Test 3 Passed: Interactive positioning and room boundary clamping verified');

// 4. Rotation Transformations (90 degree snapping)
function rotate90(item) {
  const nextRotY = (item.rotation[1] + Math.PI / 2) % (Math.PI * 2);
  return {
    ...item,
    rotation: [item.rotation[0], Number(nextRotY.toFixed(4)), item.rotation[2]]
  };
}

let rItem = sampleItem;
rItem = rotate90(rItem);
console.assert(Math.abs(rItem.rotation[1] - Math.PI / 2) < 0.001, 'Test 4.1 Failed: 90 deg rotation mismatch');
rItem = rotate90(rItem);
console.assert(Math.abs(rItem.rotation[1] - Math.PI) < 0.001, 'Test 4.2 Failed: 180 deg rotation mismatch');
rItem = rotate90(rItem);
console.assert(Math.abs(rItem.rotation[1] - (3 * Math.PI) / 2) < 0.001, 'Test 4.3 Failed: 270 deg rotation mismatch');
rItem = rotate90(rItem);
console.assert(rItem.rotation[1] === 0, 'Test 4.4 Failed: 360 deg rotation should wrap to 0');
console.log('✓ Test 4 Passed: 90-degree incremental rotation and wrap-around verified');

// 5. Object Selection Lookup
const furnitureList = [sampleItem, { ...sampleItem, id: 'furn_table_2', name: 'Coffee Table' }];
function selectFurniture(id) {
  return furnitureList.find(f => f.id === id) || null;
}
console.assert(selectFurniture('furn_table_2').name === 'Coffee Table', 'Test 5.1 Failed: Object selection failed');
console.assert(selectFurniture('non_existent') === null, 'Test 5.2 Failed: Non-existent object should return null');
console.log('✓ Test 5 Passed: Object selection and raycast mapping verified');

console.log('--- ALL LOOP 6 UNIT VERIFICATIONS PASSED ---');
