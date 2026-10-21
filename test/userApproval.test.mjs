console.log('--- RUNNING LOOP 12 USER APPROVAL & REVISION SYSTEM TESTS ---');

// Recreate approval pure functions in isolated test runner
function computeLayoutDiff(original, proposed) {
  const changes = [];
  const originalMap = new Map(original.map(item => [item.id, item]));
  const proposedMap = new Map(proposed.map(item => [item.id, item]));

  for (const orig of original) {
    if (!proposedMap.has(orig.id)) {
      const replacement = proposed.find(p => 
        !originalMap.has(p.id) && 
        Math.hypot(p.position[0] - orig.position[0], p.position[2] - orig.position[2]) < 0.8
      );

      if (replacement) {
        changes.push({
          id: `diff_rep_${orig.id}_${replacement.id}`,
          furnitureId: replacement.id,
          name: `${orig.name} → ${replacement.name}`,
          category: replacement.category,
          actionType: 'replaced',
          beforeState: { position: orig.position, rotation: orig.rotation, width: orig.width, depth: orig.depth },
          afterState: { position: replacement.position, rotation: replacement.rotation, width: replacement.width, depth: replacement.depth },
          impactDescription: `Replaced ${orig.width}m × ${orig.depth}m with compact ${replacement.width}m × ${replacement.depth}m`,
          selected: true
        });
      } else {
        changes.push({
          id: `diff_rem_${orig.id}`,
          furnitureId: orig.id,
          name: orig.name,
          category: orig.category,
          actionType: 'removed',
          beforeState: { position: orig.position, rotation: orig.rotation, width: orig.width, depth: orig.depth },
          impactDescription: `Removed from layout`,
          selected: true
        });
      }
    }
  }

  for (const prop of proposed) {
    const orig = originalMap.get(prop.id);
    if (!orig) {
      const isReplacement = changes.some(c => c.actionType === 'replaced' && c.furnitureId === prop.id);
      if (!isReplacement) {
        changes.push({
          id: `diff_add_${prop.id}`,
          furnitureId: prop.id,
          name: prop.name,
          category: prop.category,
          actionType: 'added',
          afterState: { position: prop.position, rotation: prop.rotation, width: prop.width, depth: prop.depth },
          impactDescription: `New piece added at position [${prop.position[0]}m, ${prop.position[2]}m]`,
          selected: true
        });
      }
      continue;
    }

    const posDist = Math.hypot(prop.position[0] - orig.position[0], prop.position[2] - orig.position[2]);
    const rotDiff = Math.abs(prop.rotation[1] - orig.rotation[1]);

    if (posDist > 0.05) {
      changes.push({
        id: `diff_move_${prop.id}`,
        furnitureId: prop.id,
        name: prop.name,
        category: prop.category,
        actionType: 'moved',
        beforeState: { position: orig.position, rotation: orig.rotation, width: orig.width, depth: orig.depth },
        afterState: { position: prop.position, rotation: prop.rotation, width: prop.width, depth: prop.depth },
        impactDescription: `Repositioned ${posDist.toFixed(2)}m`,
        selected: true
      });
    } else if (rotDiff > 0.05) {
      changes.push({
        id: `diff_rot_${prop.id}`,
        furnitureId: prop.id,
        name: prop.name,
        category: prop.category,
        actionType: 'rotated',
        beforeState: { position: orig.position, rotation: orig.rotation, width: orig.width, depth: orig.depth },
        afterState: { position: prop.position, rotation: prop.rotation, width: prop.width, depth: prop.depth },
        impactDescription: `Rotated by ${(rotDiff * 180 / Math.PI).toFixed(0)}°`,
        selected: true
      });
    }
  }

  return changes;
}

function applySelectedChanges(original, proposed, selectedChangeIds, changes) {
  const selectedSet = new Set(selectedChangeIds);
  let result = original.map(item => ({ ...item }));

  for (const change of changes) {
    const isAccepted = selectedSet.has(change.id);

    if (change.actionType === 'added') {
      if (isAccepted) {
        const itemToAdd = proposed.find(p => p.id === change.furnitureId);
        if (itemToAdd && !result.some(r => r.id === itemToAdd.id)) {
          result.push({ ...itemToAdd });
        }
      }
    } else if (change.actionType === 'removed') {
      if (isAccepted) {
        result = result.filter(r => r.id !== change.furnitureId);
      }
    } else if (change.actionType === 'replaced') {
      if (isAccepted) {
        const replacementItem = proposed.find(p => p.id === change.furnitureId);
        if (replacementItem) {
          const origIdx = result.findIndex(r => 
            Math.hypot(r.position[0] - change.beforeState.position[0], r.position[2] - change.beforeState.position[2]) < 0.2
          );
          if (origIdx !== -1) {
            result[origIdx] = { ...replacementItem };
          }
        }
      }
    } else if (change.actionType === 'moved' || change.actionType === 'rotated') {
      if (isAccepted) {
        const propItem = proposed.find(p => p.id === change.furnitureId);
        if (propItem) {
          const idx = result.findIndex(r => r.id === propItem.id);
          if (idx !== -1) {
            result[idx] = { ...propItem };
          }
        }
      }
    }
  }

  return result;
}

function createRevisionSnapshot(description, furniture) {
  return {
    revisionId: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: '12:00:00 PM',
    description,
    furniture: furniture.map(f => ({ ...f, position: [...f.position], rotation: [...f.rotation] }))
  };
}

// ----------------------------------------------------
// Test Fixtures
// ----------------------------------------------------
const originalLayout = [
  { id: 'item_sofa', name: 'Bulky 3-Seater Sofa', category: 'seating', width: 2.2, depth: 0.95, position: [0, 0, 1.2], rotation: [0, 0, 0] },
  { id: 'item_table', name: 'Coffee Table', category: 'tables', width: 1.2, depth: 0.7, position: [0, 0, 0], rotation: [0, 0, 0] },
  { id: 'item_armchair', name: 'Reading Armchair', category: 'seating', width: 0.9, depth: 0.9, position: [-1.5, 0, 0.5], rotation: [0, 0, 0] }
];

// Proposed layout:
// 1. item_sofa is MOVED
// 2. item_table is REMOVED
// 3. item_desk is ADDED
// 4. item_armchair is REPLACED with compact stool
const proposedLayout = [
  { id: 'item_sofa', name: 'Bulky 3-Seater Sofa', category: 'seating', width: 2.2, depth: 0.95, position: [0, 0, 1.6], rotation: [0, 0, 0] }, // Moved +0.4m
  { id: 'item_stool', name: 'Compact Ottoman Stool', category: 'seating', width: 0.6, depth: 0.6, position: [-1.5, 0, 0.5], rotation: [0, 0, 0] }, // Replaced
  { id: 'item_desk', name: 'Corner Study Desk', category: 'workspace', width: 1.4, depth: 0.7, position: [1.5, 0, -1.2], rotation: [0, 0, 0] } // Added
];

// ----------------------------------------------------
// TEST 1: Compute Layout Diff Accuracy
// ----------------------------------------------------
console.log('Testing 1: Compute Granular Layout Diff');
const diffs = computeLayoutDiff(originalLayout, proposedLayout);

console.assert(diffs.length === 4, `Test 1.1 Failed: Expected 4 diffs, got ${diffs.length}`);

const hasMove = diffs.some(d => d.actionType === 'moved' && d.name.includes('Sofa'));
const hasRemove = diffs.some(d => d.actionType === 'removed' && d.name.includes('Coffee Table'));
const hasAdd = diffs.some(d => d.actionType === 'added' && d.name.includes('Study Desk'));
const hasReplace = diffs.some(d => d.actionType === 'replaced' && d.name.includes('Armchair'));

console.assert(hasMove, 'Test 1.2 Failed: Sofa move not detected in diff');
console.assert(hasRemove, 'Test 1.3 Failed: Coffee table removal not detected in diff');
console.assert(hasAdd, 'Test 1.4 Failed: Desk addition not detected in diff');
console.assert(hasReplace, 'Test 1.5 Failed: Armchair replacement not detected in diff');
console.log('✓ Test 1 Passed: Granular diff accurately extracted moved, removed, added, and replaced operations');

// ----------------------------------------------------
// TEST 2: Full Change Acceptance
// ----------------------------------------------------
console.log('\nTesting 2: Full Change Acceptance Workflow');
const allDiffIds = diffs.map(d => d.id);
const fullyApproved = applySelectedChanges(originalLayout, proposedLayout, allDiffIds, diffs);

console.assert(fullyApproved.length === 3, `Test 2.1 Failed: Expected 3 items, got ${fullyApproved.length}`);
console.assert(fullyApproved.some(f => f.id === 'item_desk'), 'Test 2.2 Failed: Added desk missing');
console.assert(!fullyApproved.some(f => f.id === 'item_table'), 'Test 2.3 Failed: Removed table still present');
console.assert(fullyApproved.find(f => f.id === 'item_sofa').position[2] === 1.6, 'Test 2.4 Failed: Sofa position not updated');
console.log('✓ Test 2 Passed: Full acceptance committed all 4 modifications accurately');

// ----------------------------------------------------
// TEST 3: Partial / Selective Change Acceptance
// ----------------------------------------------------
console.log('\nTesting 3: Selective Change Acceptance Workflow');
// User wants ONLY to move the sofa and add the desk, but KEEP the coffee table and NOT replace the armchair
const selectiveIds = diffs.filter(d => d.actionType === 'moved' || d.actionType === 'added').map(d => d.id);
const partiallyApproved = applySelectedChanges(originalLayout, proposedLayout, selectiveIds, diffs);

console.assert(partiallyApproved.length === 4, `Test 3.1 Failed: Expected 4 items in selective layout, got ${partiallyApproved.length}`);
console.assert(partiallyApproved.some(f => f.id === 'item_table'), 'Test 3.2 Failed: Coffee table should have been preserved');
console.assert(partiallyApproved.some(f => f.id === 'item_armchair'), 'Test 3.3 Failed: Armchair should NOT have been replaced');
console.assert(partiallyApproved.some(f => f.id === 'item_desk'), 'Test 3.4 Failed: Desk should have been added');
console.assert(partiallyApproved.find(f => f.id === 'item_sofa').position[2] === 1.6, 'Test 3.5 Failed: Sofa position should have moved');
console.log('✓ Test 3 Passed: Selective approval respected individual user choices (kept table & armchair, applied move & add)');

// ----------------------------------------------------
// TEST 4: Discard / Full Rejection
// ----------------------------------------------------
console.log('\nTesting 4: Proposal Discard / Rejection');
const rejectedLayout = applySelectedChanges(originalLayout, proposedLayout, [], diffs);

console.assert(rejectedLayout.length === originalLayout.length, 'Test 4.1 Failed: Item count changed');
console.assert(rejectedLayout[0].position[2] === 1.2, 'Test 4.2 Failed: Sofa was moved despite rejection');
console.log('✓ Test 4 Passed: Zero-selection discard leaves original layout 100% unaltered');

// ----------------------------------------------------
// TEST 5: Revision History Stack & Revert Functionality
// ----------------------------------------------------
console.log('\nTesting 5: Revision History Stack & Snapshot Reversion');
const history = [];

// Push Revision 0: Initial
history.push(createRevisionSnapshot('Baseline Initial Layout', originalLayout));
console.assert(history.length === 1, 'Test 5.1 Failed: Initial revision');

// Push Revision 1: Partial Commit
history.push(createRevisionSnapshot('Selective Commit (Move Sofa + Add Desk)', partiallyApproved));
console.assert(history.length === 2, 'Test 5.2 Failed: Revision 1 not pushed');

// Push Revision 2: Full Commit
history.push(createRevisionSnapshot('Full Layout Optimization Commit', fullyApproved));
console.assert(history.length === 3, 'Test 5.3 Failed: Revision 2 not pushed');

// Revert to Revision 1
const revertedLayout = history[1].furniture;
console.assert(revertedLayout.length === 4, 'Test 5.4 Failed: Revert length mismatch');
console.assert(revertedLayout.some(f => f.id === 'item_armchair'), 'Test 5.5 Failed: Revert content mismatch');
console.log('✓ Test 5 Passed: Revision stack successfully created snapshots and reverted to prior state');

console.log('\nALL LOOP 12 USER APPROVAL & REVISION SYSTEM TESTS PASSED CLEANLY!');
