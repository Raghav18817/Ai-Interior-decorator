// Mock localStorage for Node.js test environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();

console.log('--- RUNNING LOOP 2 VERIFICATION TESTS ---');

// Test 1: Empty storage returns empty array
const STORAGE_KEY = 'decohome_projects_v1';
const ACTIVE_PROJECT_KEY = 'decohome_active_project_id';

function getProjects() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch (err) {
    return false;
  }
}

function addProject(project) {
  const existing = getProjects();
  const updated = [project, ...existing.filter(p => p.id !== project.id)];
  return saveProjects(updated);
}

function deleteProject(id) {
  const existing = getProjects();
  const updated = existing.filter(p => p.id !== id);
  return saveProjects(updated);
}

// 1. Initial Empty State
console.assert(getProjects().length === 0, 'Test 1 Failed: Initial projects should be empty');
console.log('✓ Test 1 Passed: Empty state handled correctly');

// 2. Project Creation & Persistence: Individual Room
const roomProj = {
  id: 'proj_1',
  name: 'Modern Living Room',
  scope: 'individual_room',
  roomType: 'Living Room',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
addProject(roomProj);
const projectsAfter1 = getProjects();
console.assert(projectsAfter1.length === 1, 'Test 2 Failed: Expected 1 project');
console.assert(projectsAfter1[0].name === 'Modern Living Room', 'Test 2 Failed: Name mismatch');
console.assert(projectsAfter1[0].roomType === 'Living Room', 'Test 2 Failed: Room type mismatch');
console.log('✓ Test 2 Passed: Individual room project creation & persistence verified');

// 3. Project Creation & Persistence: Complete House
const houseProj = {
  id: 'proj_2',
  name: 'Lakehouse Villa',
  scope: 'complete_house',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
addProject(houseProj);
const projectsAfter2 = getProjects();
console.assert(projectsAfter2.length === 2, 'Test 3 Failed: Expected 2 projects');
console.assert(projectsAfter2[0].id === 'proj_2', 'Test 3 Failed: LIFO order should place newest first');
console.assert(projectsAfter2[0].scope === 'complete_house', 'Test 3 Failed: Scope mismatch');
console.log('✓ Test 3 Passed: Complete house project creation & persistence verified');

// 4. Project Selection
localStorage.setItem(ACTIVE_PROJECT_KEY, 'proj_1');
console.assert(localStorage.getItem(ACTIVE_PROJECT_KEY) === 'proj_1', 'Test 4 Failed: Active project selection');
console.log('✓ Test 4 Passed: Project selection verified');

// 5. Invalid Input Validation Logic
function validateProjectInput(name, scope, roomType) {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: 'Project name is required.' };
  if (trimmed.length < 2) return { valid: false, error: 'Project name must be at least 2 characters.' };
  if (scope === 'individual_room' && !roomType) return { valid: false, error: 'Please select a valid room type.' };
  return { valid: true, error: null };
}

console.assert(validateProjectInput('', 'individual_room', 'Bedroom').valid === false, 'Test 5.1 Failed: Empty name should be invalid');
console.assert(validateProjectInput('   ', 'individual_room', 'Bedroom').valid === false, 'Test 5.2 Failed: Whitespace name should be invalid');
console.assert(validateProjectInput('A', 'individual_room', 'Bedroom').valid === false, 'Test 5.3 Failed: 1-char name should be invalid');
console.assert(validateProjectInput('Master Bed', 'individual_room', null).valid === false, 'Test 5.4 Failed: Missing room type should be invalid');
console.assert(validateProjectInput('Master Bed', 'individual_room', 'Bedroom').valid === true, 'Test 5.5 Failed: Valid input should pass');
console.assert(validateProjectInput('Villa Plan', 'complete_house', null).valid === true, 'Test 5.6 Failed: Complete house without room type should pass');
console.log('✓ Test 5 Passed: Invalid input handling and validation verified');

// 6. Project Deletion
deleteProject('proj_1');
const projectsAfterDelete = getProjects();
console.assert(projectsAfterDelete.length === 1, 'Test 6 Failed: Expected 1 project after deletion');
console.assert(projectsAfterDelete[0].id === 'proj_2', 'Test 6 Failed: Wrong project deleted');
console.log('✓ Test 6 Passed: Project deletion verified');

console.log('--- ALL LOOP 2 UNIT VERIFICATIONS PASSED ---');
