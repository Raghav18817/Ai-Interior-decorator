# DECOHOME — AI Interior Decorator & 3D Home Design Platform

**DECOHOME** is an enterprise-grade AI interior design and 3D architectural spatial platform built with React 19, TypeScript, Vite, Tailwind CSS, and Three.js. It bridges computer vision room photography analysis, deterministic 3D spatial reconstruction, architectural standards (Neufert, IBC 1005.1, SMPTE), natural language conversational assistant commands, multi-point constraint validation, non-destructive space optimization, granular diff review, and full state persistence.

---

## 🌟 Key Capabilities & Architectural Pillars

### 1. Project Management & Multi-Room Scoping
- **Dual Scope Architecture**: Create projects scoped either to **Complete House** (multi-room synthesis) or **Individual Rooms** (focused layout optimization).
- **Persistent Storage**: Schema-versioned LocalStorage engine with automatic migration, isolated projects, and 100% fidelity export/import bundles.

### 2. Multi-Angle Computer Vision Photography Pipeline
- **Multi-Angle Ingestion**: Upload wide-angle, corner, and detailed photographs with drag-and-drop support, format verification (`.jpg`, `.png`, `.webp`), and size checks.
- **Image Metrics Extraction**: In-memory canvas analysis extracting dominant floor/wall hex palettes, brightness, aspect ratio, and structural edge density.
- **Deterministic CV Analysis**: Detects room boundaries, floor area, ceiling height, doorways, windows, detected furniture, lighting fixtures, and verified electrical outlets without hallucinations.

### 3. Interactive 3D Spatial Reconstruction (Three.js)
- **Architectural Reconstruction**: Generates code-compliant 3D scenes with 4 perimeter walls, floor plane, ceiling toggle, daylight window openings, and door ingress apertures.
- **Multiple Camera Presets**: Orbit controls, Top-Down Architectural Plan (orthographic feel), and Eye-Level First-Person inspection.
- **Adaptive Frustum**: Dynamically adjusts camera frustum and clipping planes for extreme aspect ratios (from 1.5m closets to 25m galleries).
- **Hardware-Resilient Fallback**: Automatic detection of WebGL context loss or lack of hardware acceleration, with seamless fallback to an interactive 2D SVG architectural schematic floorplan and 1-click 3D context restoration.

### 4. Dimensional Standards & Furniture Catalog
- **Code-Compliant Furniture**: Verified library adhering to Neufert Architect's Data and IBC regulations (3-seater sofas, queen beds, ergonomic desks, dining tables, lounge armchairs, media consoles).
- **Surface & Clearance Specifications**: Pre-calculated frontal legroom, side circulation aisles, and rear ventilation gaps.

### 5. AI Furniture & TV/Device Placement Engines
- **Space-Adaptive Recommendations**: Filters catalog items according to room dimensions, existing density, and functional zones.
- **SMPTE-Compliant TV Placement**: Computes perpendicular viewing sightlines, optimal 30° viewing angles, and prevents window glare apertures.
- **Peripheral Device Nesting**: Automatically resolves spatial parent-child surface relationships (e.g. streaming boxes, soundbars, game consoles on credenzas).

### 6. Non-Destructive Space Optimization
- **4 Optimization Goals**:
  - *Maximize Walking Space*: Pushes perimeter pieces flush against walls and expands central circulation.
  - *Add Workspace*: Adds executive desk and ergonomic chair with slide-out clearance.
  - *Optimize for TV & Media*: Centers seating directly opposite media elevations.
  - *Replace Bulky Furniture*: Substitutes oversized pieces with space-saving alternatives.
- **Zero Hallucination Guarantee**: Preserves the original design until the user explicitly commits changes.

### 7. Natural-Language Design Command Assistant
- **Intent Parsing**: Recognizes movement, replacement, addition, relational alignment, and circulation queries.
- **Spatial Execution**: Translates user voice/text commands (e.g. *"Move the sofa near the window"*, *"Replace the sofa with a smaller one"*, *"Add a study table"*) into clamped 3D spatial coordinate updates.

### 8. Multi-Point Feasibility & Change Validation
- **Real-Time Constraint Inspector**: Checks Axis-Aligned Bounding Box (AABB) 2D floor collisions, room boundary containment, 0.85m doorway ingress clear zones, and window daylight paths.
- **Vertical Stacking Intelligence**: Avoids false collision positives for devices resting on furniture surfaces.
- **1-Click Auto-Fix**: Automatically resolves overlapping boundaries and nudges items into legal coordinates.

### 9. User Approval & Revision Rollback History
- **Granular Diff Review**: Review layout modifications item by item (Moved, Rotated, Added, Replaced, Removed) with visual badges and coordinate diffs.
- **Selective Approval**: Cherry-pick specific items to commit while keeping the rest unchanged.
- **Timestamped Reversion Stack**: Snapshot undo/redo history enabling instant rollbacks to prior baselines.

### 10. Editable 3D Drag & Snap Environment
- **Interactive Floor Plane Drag Mode**: Drag furniture across the floor plane in real time with continuous boundary clamping.
- **Flush Wall Snapping**: 1-click snap against North, South, East, or West perimeter walls.
- **Fine-Grain Nudge**: Multi-step position nudging (0.1m, 0.25m, 0.5m) and 90° incremental rotations.
- **Item Duplication & Deletion**: Duplicate selected pieces with offset placement.

---

## 🛠 Tech Stack

- **Framework**: React 19 (React DOM, Hooks, StrictMode)
- **Language**: TypeScript 5.7+ (Strict typing, `noUnusedLocals`)
- **Build Tool**: Vite 6.4
- **3D Graphics Engine**: Three.js 0.174 + OrbitControls
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Test Framework**: Native Node.js ESM Test Runner (`node:assert/strict`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm or pnpm

### Installation
```bash
git clone <repo-url>
cd AKproject1
npm install
```

### Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Verification & Automated Test Suites
Run the complete regression suite across all 15 automated test suites:
```bash
node test/projectStorage.test.mjs
node test/imageUpload.test.mjs
node test/analysisPipeline.test.mjs
node test/reconstructionEngine.test.mjs
node test/furnitureRepresentation.test.mjs
node test/recommendationEngine.test.mjs
node test/devicePlacement.test.mjs
node test/spaceOptimization.test.mjs
node test/commandAssistant.test.mjs
node test/changeValidation.test.mjs
node test/userApproval.test.mjs
node test/editable3DEnvironment.test.mjs
node test/saveRestoreDesign.test.mjs
node test/errorHandlingEdgeCases.test.mjs
node test/e2eSystemIntegration.test.mjs
node test/e2eScenarios.test.mjs
```

---

## 📋 Platform Development Loops (0 to 18)

| Loop | Feature Area | Status | Verification Summary |
|---|---|---|---|
| **Loop 0** | Foundation & Architecture Setup | **PASSED** | Clean Vite + React 19 + TypeScript + Tailwind scaffolding |
| **Loop 1** | Project Creation & Multi-Room Scoping | **PASSED** | Complete house vs individual room schemas, localStorage engine |
| **Loop 2** | Image Upload & Multi-Angle Validation | **PASSED** | Format, file size, multi-angle tagging, metadata persistence |
| **Loop 3** | Room Photo Analysis & CV Pipeline | **PASSED** | In-memory canvas metric extraction, deterministic surface detection |
| **Loop 4** | Complete Analysis Pipeline Integration | **PASSED** | Surface detection, dimensions, apertures, anti-hallucination verification |
| **Loop 5** | 3D Spatial Reconstruction (Three.js) | **PASSED** | 3D room generation, 4 perimeter walls, floor, ceiling, openings |
| **Loop 6** | Interactive Furniture Representation | **PASSED** | Catalog dimensional standards, bounding box clamping, 90° rotation |
| **Loop 7** | AI Furniture Recommendation Engine | **PASSED** | Space-adaptive suggestions across small, medium, and large rooms |
| **Loop 8** | TV & Device Placement Engine | **PASSED** | Sightlines, viewing distance, wall clearance, socket verification |
| **Loop 9** | Space Optimization Engine | **PASSED** | Non-destructive optimization proposals, circulation calculation |
| **Loop 10** | Natural-Language Design Commands | **PASSED** | Intent parser, 5 core prompt executions, relational spatial updates |
| **Loop 11** | Change Validation & Feasibility | **PASSED** | Multi-point checks: collisions, boundaries, door corridors, daylight |
| **Loop 12** | User Approval & Revision Stack | **PASSED** | Granular diff, selective commit, timestamped rollback history |
| **Loop 13** | Editable 3D Drag Environment | **PASSED** | Real-time constraint HUD, 2D floor drag, snap-to-wall, duplication |
| **Loop 14** | Save / Restore Design System | **PASSED** | Schema v2 serialization, JSON bundle export/import, project cloning |
| **Loop 15** | Error Handling & Resilience | **PASSED** | Empty rooms, extreme aspect ratios, corrupted JSON, WebGL fallback |
| **Loop 16** | System Integration Walkthrough | **PASSED** | End-to-end full user journey simulation (upload &rarr; 3D &rarr; save) |
| **Loop 17** | Real-World Scenario Suite | **PASSED** | Studio apartment, family living room, and ergonomic home office |
| **Loop 18** | Final Quality Checklist & Polish | **PASSED** | 100% test pass rate, clean production build, zero lint/TS errors |

---

## 📄 License
MIT © 2026 DECOHOME Systems. All rights reserved.
