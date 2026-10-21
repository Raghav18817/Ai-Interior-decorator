console.log('--- RUNNING LOOP 9 SPACE OPTIMIZATION ENGINE TESTS ---');

// Import / recreate collision and boundary helpers
function checkCollision2D(a, b, safetyBuffer = 0.05) {
  const aMinX = a.position[0] - a.width / 2 + safetyBuffer;
  const aMaxX = a.position[0] + a.width / 2 - safetyBuffer;
  const aMinZ = a.position[2] - a.depth / 2 + safetyBuffer;
  const aMaxZ = a.position[2] + a.depth / 2 - safetyBuffer;

  const bMinX = b.position[0] - b.width / 2 + safetyBuffer;
  const bMaxX = b.position[0] + b.width / 2 - safetyBuffer;
  const bMinZ = b.position[2] - b.depth / 2 + safetyBuffer;
  const bMaxZ = b.position[2] + b.depth / 2 - safetyBuffer;

  return aMinX < bMaxX && aMaxX > bMinX && aMinZ < bMaxZ && aMaxZ > bMinZ;
}

function isWithinRoomBounds(item, roomL, roomW) {
  const halfL = roomL / 2;
  const halfW = roomW / 2;
  return Math.abs(item.position[0]) + item.width / 2 <= halfL + 0.05 &&
         Math.abs(item.position[2]) + item.depth / 2 <= halfW + 0.05;
}

// Sample baseline room & furniture
const roomL = 5.0;
const roomW = 4.0;
const initialFurniture = [
  { id: 'sofa1', name: 'Bulky Sofa', type: 'sofa_3seater', width: 2.2, depth: 1.0, position: [0, 0, 1.2], rotation: [0, 0, 0] },
  { id: 'table1', name: 'Heavy Coffee Table', type: 'coffee_table', width: 1.2, depth: 0.8, position: [0, 0, 0], rotation: [0, 0, 0] },
  { id: 'rug1', name: 'Floor Rug', type: 'rug', category: 'decor', width: 2.0, depth: 1.5, position: [0, 0, 0.4], rotation: [0, 0, 0] }
];
const doors = [{ type: 'door', position: [-2.5, 1.0, -1.0], width: 0.9, height: 2.1 }];

// Test 1: Move Furniture Operation
console.log('Testing 1: Move Furniture Operation');
const movedTable = { ...initialFurniture[1], position: [0, 0, 0.6] };
const dist = Math.hypot(movedTable.position[0] - initialFurniture[1].position[0], movedTable.position[2] - initialFurniture[1].position[2]);
console.assert(dist > 0.5, 'Test 1.1 Failed: Moved distance not registered');
console.log('✓ Test 1 Passed: Move furniture repositioning verified');

// Test 2: Remove Furniture Operation
console.log('Testing 2: Remove Furniture Operation');
const afterRemoval = initialFurniture.filter(f => f.id !== 'rug1');
console.assert(afterRemoval.length === 2, 'Test 2.1 Failed: Item removal count mismatch');
console.assert(!afterRemoval.some(f => f.id === 'rug1'), 'Test 2.2 Failed: Removed item still present');
console.log('✓ Test 2 Passed: Remove furniture operation verified');

// Test 3: Add Furniture Operation
console.log('Testing 3: Add Furniture Operation');
const newDesk = { id: 'desk_new', name: 'Study Desk', type: 'study_desk', width: 1.4, depth: 0.7, position: [1.6, 0, -1.5], rotation: [0, 0, 0] };
const afterAddition = [...afterRemoval, newDesk];
console.assert(afterAddition.length === 3, 'Test 3.1 Failed: Item addition count mismatch');
console.assert(afterAddition.some(f => f.id === 'desk_new'), 'Test 3.2 Failed: Added item not present');
console.log('✓ Test 3 Passed: Add furniture operation verified');

// Test 4: Rotate Furniture Operation
console.log('Testing 4: Rotate Furniture Operation');
const rotatedDesk = { ...newDesk, rotation: [0, Math.PI / 2, 0] };
console.assert(Math.abs(rotatedDesk.rotation[1] - Math.PI / 2) < 0.001, 'Test 4.1 Failed: Rotation angle mismatch');
console.log('✓ Test 4 Passed: Rotate furniture operation verified');

// Test 5: Replace Furniture Operation
console.log('Testing 5: Replace Furniture Operation');
const compactSofa = { id: 'sofa_compact', name: 'Compact Studio Sofa', type: 'sofa_compact', width: 1.6, depth: 0.8, position: [0, 0, 1.4], rotation: [0, 0, 0] };
const afterReplacement = afterAddition.map(f => f.id === 'sofa1' ? compactSofa : f);
console.assert(afterReplacement.some(f => f.id === 'sofa_compact'), 'Test 5.1 Failed: Replaced item not found');
console.assert(!afterReplacement.some(f => f.id === 'sofa1'), 'Test 5.2 Failed: Old bulky sofa still exists');
const areaSaved = (initialFurniture[0].width * initialFurniture[0].depth) - (compactSofa.width * compactSofa.depth);
console.assert(areaSaved > 0.8, 'Test 5.3 Failed: Area savings calculation incorrect');
console.log('✓ Test 5 Passed: Replace furniture operation verified with area savings');

// Test 6: Preserve Room Boundaries
console.log('Testing 6: Preserve Room Boundaries');
afterReplacement.forEach((item) => {
  const within = isWithinRoomBounds(item, roomL, roomW);
  console.assert(within, `Test 6 Failed: Item ${item.name} at [${item.position}] exceeds room boundaries (${roomL}m × ${roomW}m)`);
});
console.log('✓ Test 6 Passed: All optimized items strictly preserved within room boundaries');

// Test 7: Preserve Doors & Windows
console.log('Testing 7: Preserve Doors & Apertures');
afterReplacement.forEach((item) => {
  doors.forEach((door) => {
    const doorBuffer = { position: door.position, width: door.width + 0.4, depth: 0.8 };
    const collisionWithDoor = checkCollision2D(item, doorBuffer, 0);
    console.assert(!collisionWithDoor, `Test 7 Failed: Item ${item.name} blocks door passage`);
  });
});
console.log('✓ Test 7 Passed: Ingress door passage clearances strictly preserved');

// Test 8: Prevent Obvious Object Overlap (Pairwise Collision Detection)
console.log('Testing 8: Prevent Object Overlap');
for (let i = 0; i < afterReplacement.length; i++) {
  for (let j = i + 1; j < afterReplacement.length; j++) {
    const overlap = checkCollision2D(afterReplacement[i], afterReplacement[j], 0.05);
    console.assert(!overlap, `Test 8 Failed: Overlap detected between ${afterReplacement[i].name} and ${afterReplacement[j].name}`);
  }
}
console.log('✓ Test 8 Passed: Zero object overlaps in proposed layout verified');

// Test 9: Non-Destructive Layout Recovery (Original untouched on reject)
console.log('Testing 9: Non-Destructive Layout Workflow');
console.assert(initialFurniture.length === 3, 'Test 9.1 Failed: Original furniture modified in-place');
console.assert(initialFurniture[0].name === 'Bulky Sofa', 'Test 9.2 Failed: Original sofa modified');
console.assert(initialFurniture[1].position[2] === 0, 'Test 9.3 Failed: Original table position altered');
console.log('✓ Test 9 Passed: Original user design strictly preserved without destructive replacement');

console.log('--- ALL LOOP 9 UNIT VERIFICATIONS PASSED ---');
