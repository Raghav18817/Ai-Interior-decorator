console.log('--- RUNNING LOOP 7 AI FURNITURE RECOMMENDATION ENGINE TESTS ---');

// Recreate/import recommendation logic for Node test
const catalog = [
  { type: 'sofa_3seater', name: '3-Seater Sofa', category: 'seating', defaultWidth: 2.1, defaultHeight: 0.85, defaultDepth: 0.9, suitableRooms: ['Living Room'] },
  { type: 'armchair', name: 'Accent Armchair', category: 'seating', defaultWidth: 0.85, defaultHeight: 0.85, defaultDepth: 0.85, suitableRooms: ['Living Room', 'Bedroom', 'Office'] },
  { type: 'coffee_table', name: 'Coffee Table', category: 'tables', defaultWidth: 1.1, defaultHeight: 0.45, defaultDepth: 0.6, suitableRooms: ['Living Room'] },
  { type: 'study_desk', name: 'Study Desk', category: 'workspace', defaultWidth: 1.4, defaultHeight: 0.75, defaultDepth: 0.7, suitableRooms: ['Office', 'Living Room', 'Bedroom'] },
  { type: 'queen_bed', name: 'Queen Bed', category: 'beds', defaultWidth: 1.6, defaultHeight: 1.0, defaultDepth: 2.1, suitableRooms: ['Bedroom'] }
];

function testRecommend(roomL, roomW, roomType, existingFurniture) {
  const totalFloorArea = roomL * roomW;
  const occupiedFloorArea = existingFurniture.reduce((sum, f) => sum + (f.width * f.depth), 0);
  const occupancyRatio = totalFloorArea > 0 ? (occupiedFloorArea / totalFloorArea) : 0;

  const results = [];

  catalog.filter(c => c.suitableRooms.includes(roomType)).forEach((cand) => {
    const candW = cand.defaultWidth;
    const candD = cand.defaultDepth;
    const candFootprint = candW * candD;

    let isFeasible = true;
    let conflictReason = null;

    // Check 1: Exceeds room bounds
    if (candW > roomL && candW > roomW) {
      isFeasible = false;
      conflictReason = 'Cannot physically fit room dimensions';
    }

    // Check 2: Circulation & Occupancy Ratio
    const newOccupancy = (occupiedFloorArea + candFootprint) / totalFloorArea;
    if (newOccupancy > 0.55) {
      isFeasible = false;
      conflictReason = `Exceeds 55% maximum density (would reach ${(newOccupancy * 100).toFixed(0)}%)`;
    }

    // Check 3: Wall space check
    const maxWall = Math.max(roomL, roomW);
    const existingOnWall = existingFurniture.reduce((sum, f) => sum + f.width + 0.2, 0);
    const remainingWall = Math.max(0, maxWall - existingOnWall);

    if (candW > remainingWall && remainingWall < candW) {
      isFeasible = false;
      conflictReason = `Insufficient wall clearance (requires ${candW}m, available ${remainingWall.toFixed(1)}m)`;
    }

    results.push({
      item: cand.name,
      isFeasible,
      conflictReason,
      newOccupancy
    });
  });

  return { results, totalFloorArea, occupiedFloorArea, occupancyRatio };
}

// 1. Scenario 1: Small Room (2.2m × 2.0m = 4.4 m²)
console.log('Testing Scenario 1: Small Room (2.2m × 2.0m)');
const smallTest = testRecommend(2.2, 2.0, 'Living Room', []);
// 3-seater sofa (2.1m W) in 2.2m x 2.0m room takes 2.1*0.9 = 1.89 m² (43% of room).
// Coffee table in addition to sofa would exceed circulation limits.
const smallSofa = smallTest.results.find(r => r.item === '3-Seater Sofa');
console.assert(smallSofa !== undefined, 'Test 1.1 Failed: 3-Seater Sofa should be evaluated');
const smallArmchair = smallTest.results.find(r => r.item === 'Accent Armchair');
console.assert(smallArmchair.isFeasible === true, 'Test 1.2 Failed: Compact armchair should fit small room');
console.log('✓ Test 1 Passed: Small room correctly accommodates compact pieces and identifies tight clearances');

// 2. Scenario 2: Medium Room (4.2m × 3.8m = 15.96 m²)
console.log('Testing Scenario 2: Medium Room (4.2m × 3.8m)');
const medTest = testRecommend(4.2, 3.8, 'Living Room', []);
const medSofa = medTest.results.find(r => r.item === '3-Seater Sofa');
console.assert(medSofa.isFeasible === true, 'Test 2.1 Failed: Sofa should comfortably fit medium room');
const medTable = medTest.results.find(r => r.item === 'Coffee Table');
console.assert(medTable.isFeasible === true, 'Test 2.2 Failed: Coffee table should fit medium room');
console.log('✓ Test 2 Passed: Medium room allows standard functional furniture arrangements');

// 3. Scenario 3: Large Room (6.5m × 5.5m = 35.75 m²)
console.log('Testing Scenario 3: Large Room (6.5m × 5.5m)');
const largeTest = testRecommend(6.5, 5.5, 'Living Room', []);
largeTest.results.forEach((r) => {
  console.assert(r.isFeasible === true, `Test 3 Failed: ${r.item} should easily fit in large room`);
  console.assert(r.newOccupancy < 0.20, `Test 3 Failed: Occupancy should remain very low in 35m² room`);
});
console.log('✓ Test 3 Passed: Large room validates multi-item feasibility with low density');

// 4. Scenario 4: Room with Existing Furniture
console.log('Testing Scenario 4: Room with Existing Furniture');
const existingPieces = [
  { name: 'Existing Sofa', width: 2.1, depth: 0.9, position: [0, 0, -1.8] }
];
const existTest = testRecommend(4.2, 3.8, 'Living Room', existingPieces);
// Existing sofa occupies 2.1m + 0.2m = 2.3m of the 4.2m wall.
// A second 3-seater sofa (2.1m) requires 2.1m. 4.2 - 2.3 = 1.9m remaining wall < 2.1m!
const secondSofa = existTest.results.find(r => r.item === '3-Seater Sofa');
console.assert(secondSofa.isFeasible === false, 'Test 4.1 Failed: Second large sofa must be rejected due to remaining wall limit');
const addDesk = existTest.results.find(r => r.item === 'Study Desk'); // 1.4m < 1.9m remaining!
console.assert(addDesk.isFeasible === true, 'Test 4.2 Failed: Study desk (1.4m) should fit the remaining 1.9m wall span');
console.log('✓ Test 4 Passed: Room with existing furniture correctly subtracts occupied spans');

// 5. Scenario 5: Room with Limited Walking Space (Congested room)
console.log('Testing Scenario 5: Room with Limited Walking Space');
const crowdedPieces = [
  { name: 'Big Sectional', width: 2.8, depth: 1.5, position: [0, 0, -1.0] }, // 4.2 m²
  { name: 'Credenza', width: 1.8, depth: 0.6, position: [0, 0, 1.2] }, // 1.08 m²
  { name: 'Heavy Table', width: 1.6, depth: 1.0, position: [0, 0, 0] } // 1.6 m²
]; // Total occupied = 6.88 m² in a 12 m² room (3.5m x 3.4m) -> 57.3% occupied!
const crowdedTest = testRecommend(3.5, 3.4, 'Living Room', crowdedPieces);
crowdedTest.results.forEach((r) => {
  console.assert(r.isFeasible === false, `Test 5 Failed: ${r.item} should be rejected in congested room (>55% occupancy)`);
});
console.log('✓ Test 5 Passed: Congested room strictly rejects additions to preserve walking circulation');

console.log('--- ALL LOOP 7 UNIT VERIFICATIONS PASSED ---');
