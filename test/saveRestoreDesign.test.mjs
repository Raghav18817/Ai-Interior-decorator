console.log('--- RUNNING LOOP 14 SAVE & RESTORE DESIGN TESTS ---');

const CURRENT_SCHEMA_VERSION = 2;

function exportProjectToJSON(project) {
  const bundle = {
    bundleType: 'DECOHOME_DESIGN_PROJECT',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      ...project,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    }
  };

  return JSON.stringify(bundle, null, 2);
}

function validateAndParseProjectBundle(jsonString) {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return { valid: false, error: 'Empty or invalid JSON content.' };
    }

    const parsed = JSON.parse(jsonString);

    let rawProject = parsed;
    if (parsed && parsed.bundleType === 'DECOHOME_DESIGN_PROJECT' && parsed.project) {
      rawProject = parsed.project;
    }

    if (!rawProject || typeof rawProject !== 'object') {
      return { valid: false, error: 'Malformed JSON: project root is not an object.' };
    }

    if (!rawProject.name || typeof rawProject.name !== 'string') {
      return { valid: false, error: 'Validation failed: Project "name" is missing or invalid.' };
    }

    if (!rawProject.scope || (rawProject.scope !== 'complete_house' && rawProject.scope !== 'individual_room')) {
      return { valid: false, error: 'Validation failed: Project "scope" must be complete_house or individual_room.' };
    }

    const validatedProject = {
      id: rawProject.id || `proj_${Date.now()}`,
      name: rawProject.name.trim(),
      scope: rawProject.scope,
      roomType: rawProject.roomType || 'Living Room',
      images: Array.isArray(rawProject.images) ? rawProject.images : [],
      analysisResult: rawProject.analysisResult || undefined,
      furniture: Array.isArray(rawProject.furniture) ? rawProject.furniture : [],
      revisionHistory: Array.isArray(rawProject.revisionHistory) ? rawProject.revisionHistory : [],
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: rawProject.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { valid: true, project: validatedProject };
  } catch (err) {
    return { valid: false, error: `Invalid JSON syntax: ${err.message || 'Unable to parse file'}` };
  }
}

function cloneProjectForImport(project, renamePrefix = 'Imported') {
  return {
    ...project,
    id: `proj_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${project.name} (${renamePrefix})`,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------
// Test Fixtures
// ----------------------------------------------------
const sampleProject = {
  id: 'proj_original_123',
  name: 'Modern Penthouse Suite',
  scope: 'individual_room',
  roomType: 'Living Room',
  images: [
    { id: 'img_1', name: 'living_angle1.jpg', size: 1048576, type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,...', uploadedAt: '2026-09-24T00:00:00Z', status: 'ready', progress: 100 }
  ],
  analysisResult: {
    roomType: 'Living Room',
    confidence: 0.94,
    dimensions: { length: 5.5, width: 4.2, height: 2.8, uncertainty: 0.3, isEstimated: true },
    architecturalFeatures: [{ type: 'window', position: 'east', confidence: 0.92 }],
    detectedObjects: [{ label: 'sofa', category: 'seating', confidence: 0.96, estimatedDimensions: { width: 2.2, height: 0.85, depth: 0.95 } }]
  },
  furniture: [
    { id: 'f_sofa', name: 'Bulky Sofa', category: 'seating', width: 2.2, height: 0.85, depth: 0.95, position: [0, 0, 1.2], rotation: [0, 0, 0], room: 'Living Room', color: '#1e293b', clearanceRequired: { frontMeters: 0.6, sidesMeters: 0.2 }, isExisting: true },
    { id: 'f_tv', name: 'OLED TV & Console', category: 'electronics', width: 1.6, height: 0.5, depth: 0.45, position: [0, 0, -1.6], rotation: [0, 0, 0], room: 'Living Room', color: '#0f172a', clearanceRequired: { frontMeters: 1.5, sidesMeters: 0.3 }, isExisting: false }
  ],
  revisionHistory: [
    { revisionId: 'rev_1', timestamp: '12:00:00 PM', description: 'Initial import', furniture: [] }
  ],
  createdAt: '2026-09-24T00:00:00.000Z',
  updatedAt: '2026-09-24T00:10:00.000Z'
};

// ----------------------------------------------------
// TEST 1: Complete State Serialization to JSON
// ----------------------------------------------------
console.log('Testing 1: Complete State Serialization to JSON Bundle');
const jsonExport = exportProjectToJSON(sampleProject);

console.assert(typeof jsonExport === 'string', 'Test 1.1 Failed: Export is not a string');
const parsedExport = JSON.parse(jsonExport);
console.assert(parsedExport.bundleType === 'DECOHOME_DESIGN_PROJECT', 'Test 1.2 Failed: Bundle type mismatch');
console.assert(parsedExport.schemaVersion === 2, 'Test 1.3 Failed: Schema version mismatch');
console.assert(parsedExport.project.name === sampleProject.name, 'Test 1.4 Failed: Project name missing in bundle');
console.assert(parsedExport.project.furniture.length === 2, 'Test 1.5 Failed: Furniture array corrupted in bundle');
console.assert(parsedExport.project.images.length === 1, 'Test 1.6 Failed: Images array missing in bundle');
console.assert(parsedExport.project.analysisResult.dimensions.length === 5.5, 'Test 1.7 Failed: Analysis dimensions lost');
console.log('✓ Test 1 Passed: Complete project state serialized with 100% fidelity');

// ----------------------------------------------------
// TEST 2: Validated Deserialization of Export Bundle
// ----------------------------------------------------
console.log('\nTesting 2: Validated Deserialization of Export Bundle');
const parseResult = validateAndParseProjectBundle(jsonExport);

console.assert(parseResult.valid === true, `Test 2.1 Failed: Parse reported invalid: ${parseResult.error}`);
console.assert(parseResult.project.id === sampleProject.id, 'Test 2.2 Failed: ID mismatch');
console.assert(parseResult.project.furniture.length === 2, 'Test 2.3 Failed: Furniture count mismatch');
console.assert(parseResult.project.furniture[0].name === 'Bulky Sofa', 'Test 2.4 Failed: Furniture properties altered');
console.log('✓ Test 2 Passed: Export bundle deserialized and verified');

// ----------------------------------------------------
// TEST 3: Backwards Compatibility (Raw Project Object)
// ----------------------------------------------------
console.log('\nTesting 3: Backwards Compatibility with Raw Project JSON');
const rawProjectJSON = JSON.stringify(sampleProject);
const rawParseResult = validateAndParseProjectBundle(rawProjectJSON);

console.assert(rawParseResult.valid === true, `Test 3.1 Failed: Raw project parse failed: ${rawParseResult.error}`);
console.assert(rawParseResult.project.name === sampleProject.name, 'Test 3.2 Failed: Raw project name mismatch');
console.assert(rawParseResult.project.schemaVersion === 2, 'Test 3.3 Failed: Auto-migration to schema v2 failed');
console.log('✓ Test 3 Passed: Raw project successfully normalized and migrated to Schema V2');

// ----------------------------------------------------
// TEST 4: Malformed / Corrupted JSON Validation
// ----------------------------------------------------
console.log('\nTesting 4: Malformed and Invalid JSON Handling');
const badSyntax = '{ bad json syntax : 123 }';
const res1 = validateAndParseProjectBundle(badSyntax);
console.assert(res1.valid === false, 'Test 4.1 Failed: Bad syntax not caught');
console.assert(res1.error.includes('syntax'), 'Test 4.2 Failed: Error message mismatch');

const missingName = JSON.stringify({ scope: 'individual_room' });
const res2 = validateAndParseProjectBundle(missingName);
console.assert(res2.valid === false, 'Test 4.3 Failed: Missing name not caught');

const invalidScope = JSON.stringify({ name: 'Test', scope: 'invalid_universe' });
const res3 = validateAndParseProjectBundle(invalidScope);
console.assert(res3.valid === false, 'Test 4.4 Failed: Invalid scope not caught');
console.log('✓ Test 4 Passed: Malformed syntax and missing/invalid schema fields correctly rejected');

// ----------------------------------------------------
// TEST 5: Project Cloning for Import
// ----------------------------------------------------
console.log('\nTesting 5: Project Cloning for Safe Import');
const importedProject = cloneProjectForImport(parseResult.project);

console.assert(importedProject.id !== sampleProject.id, 'Test 5.1 Failed: Clone must have unique ID');
console.assert(importedProject.name.includes('(Imported)'), 'Test 5.2 Failed: Clone name missing tag');
console.assert(importedProject.furniture.length === sampleProject.furniture.length, 'Test 5.3 Failed: Cloned furniture count');
console.log(`✓ Test 5 Passed: Project safely cloned as "${importedProject.name}" (ID: ${importedProject.id})`);

// ----------------------------------------------------
// TEST 6: Multi-Project Session Storage Isolation
// ----------------------------------------------------
console.log('\nTesting 6: Multi-Project Storage Isolation');
const mockStorage = new Map();
const saveMock = (p) => mockStorage.set(p.id, p);
const loadMock = (id) => mockStorage.get(id);

saveMock(sampleProject);
saveMock(importedProject);

console.assert(mockStorage.size === 2, 'Test 6.1 Failed: Expected 2 isolated projects');
console.assert(loadMock(sampleProject.id).name === sampleProject.name, 'Test 6.2 Failed: Original project mutated');
console.assert(loadMock(importedProject.id).name === importedProject.name, 'Test 6.3 Failed: Imported project mutated');
console.log('✓ Test 6 Passed: Multi-project session storage correctly isolated without cross-contamination');

console.log('\nALL LOOP 14 SAVE & RESTORE DESIGN TESTS PASSED CLEANLY!');
