const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { loadModule, analyze, tableTokens, makePdfFixture } = require('./verify-drawing-upload-dev.cjs');
const { createStepModel, sameStepModel } = loadModule('model/stepModel');
const { getStepAssemblyParts } = loadModule('model/stepAssemblyParts');
const { isPracticeReady } = loadModule('../drawing-upload/practice/stepPracticeConfig');
const { createManualPracticeSequence, createProductPracticeSequence, getPracticeInstalledParts, getProductPlacementCaption, moveProductPracticeStage } = loadModule('../drawing-upload/practice/stepPracticeSequence');
const { getFastenerEnds, getFastenerHead, matchFastenerHead } = loadModule('../drawing-upload/practice/fastenerHead');
const { getPracticeToolKind, getPracticeToolShape, getPracticeToolView } = loadModule('../drawing-upload/practice/practiceToolGeometry');
const { advancePracticeTurn, canPlacePracticeTraySlot, clampPracticeTraySlot, getPracticeFasteningFocus, getPracticePartSurface, getPracticeResistance, getPracticeTrayHomeX, getPracticeTrayPlacementIssue, getPracticeTraySurface, getPracticeWorkbench, getPreparationOffset, getSeatingClearance, layoutPracticeTray, PREPARATION_CENTER } = loadModule('../drawing-upload/practice/stepPracticeMotion');
const { clampPracticeCardSize, readPracticeCaption, readPracticeCardChange, readPracticeSceneCard, readPracticeTrayLayout, readPracticeTraySettings, trayTravel } = loadModule('../drawing-upload/practice/practiceTrayLayout');
const { getPracticeCardImageRequests } = loadModule('../drawing-upload/practice/practiceCardFigures');
const { PRACTICE_CARD_THEMES } = loadModule('../drawing-upload/practice/practiceCardThemes');
const { getPracticePartCorners, getPracticePickupPose, isPracticePartVisible } = loadModule('../drawing-upload/practice/practicePartPickup');
const { createInstructionDrafts, getInstructionDrawingTargets, moveInstruction, reorderInstruction, nextUnconfirmedInstruction, paginateInstructions } = loadModule('../drawing-upload/instructions/assemblyInstructions');
const { bindStepShape, unbindStepShape } = loadModule('model/modelBindings');
const { buildStepGeometry, buildStepStructureGeometry, findShapeAtFace } = loadModule('model/buildStepGeometry');
const { createStepStructureEdges } = loadModule('model/stepStructureEdges');
const { fitStepViewDistance } = loadModule('model/stepCameraFraming');
const { groupParts, createPartReview, revisePart } = loadModule('review/reviewModel');
const { createReviewPackage, decodeReview } = loadModule('review/reviewPersistence');
const fixtures = path.join(path.dirname(require.resolve('occt-import-js/package.json')), 'test/testfiles');
const cubeFile = path.join(fixtures, 'simple-basic-cube/cube.stp');
const assemblyFile = path.join(fixtures, 'cax-if/as1-oc-214.stp');
async function checkModel() {
  const occt = await require('occt-import-js')({ print: () => {}, printErr: () => {} });
  const parse = async (filename) => {
    const bytes = fs.readFileSync(filename), messages = [];
    const context = vm.createContext({
      self: { location: { href: 'http://localhost:3000/step-import-worker.js' }, postMessage: (message) => messages.push(message) },
      URL, occtimportjs: async () => occt, importScripts: () => {},
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/step-import-worker.js'), 'utf8'), context);
    await context.self.onmessage({ data: { buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) } });
    const result = messages.at(-1);
    assert.equal(result.type, 'complete', result.message);
    assert.equal(messages.filter((message) => message.type === 'progress').length, 3);
    return createStepModel({ name: path.basename(filename), size: bytes.length }, createHash('sha256').update(bytes).digest('hex'), result.root, result.meshes);
  };
  const cube = await parse(cubeFile), assembly = await parse(assemblyFile);
  assert.equal(cube.manifest.shapeList.length, 1);
  assert.equal(assembly.manifest.shapeList.length, 18, 'Repeated nuts and bolts remain separate selectable solids');
  const nuts = assembly.manifest.shapeList.filter((shape) => shape.name === 'nut');
  assert.ok(nuts.length > 1); assert.notEqual(JSON.stringify(nuts[0].bounds), JSON.stringify(nuts[1].bounds), 'Assembly placement must be retained');
  assert.ok(assembly.manifest.shapeList.some((shape) => shape.path.includes('assembly')));
  const grouped = getStepAssemblyParts({
    ...assembly,
    root: { name: 'assembly', meshes: [], children: [
      { name: 'Repeated part', meshes: [0, 2], children: [] },
      { name: 'Repeated part', meshes: [1], children: [] },
    ] },
  });
  assert.deepEqual(Array.from(grouped[0].shapeIds), ['shape-0', 'shape-2'], 'A multi-body part is selected as a unit');
  assert.deepEqual(Array.from(grouped[1].shapeIds), ['shape-1'], 'Equal names do not merge separate occurrences');
  assert.equal(grouped.flatMap((part) => part.shapeIds).length, assembly.manifest.shapeList.length, 'Unlisted bodies are still selectable');
  const [basePart, mountingPart] = grouped;
  const practicePick = { point: [0.5, 0, 0], normal: [0, 0, 1] };
  const firstMount = {
    placement: { partNumber: basePart.number, pick: practicePick },
    support: { partNumber: grouped[2].number, pick: practicePick },
    purpose: '다음 단계에서 고정할 두 구멍을 맞춥니다.',
  };
  const secondMount = {
    placement: { partNumber: grouped[3].number, pick: practicePick },
    support: firstMount.placement,
    purpose: '먼저 장착한 부품에 맞춥니다.',
  };
  const practiceConfig = {
    mounts: [firstMount, secondMount],
    fastening: { partNumber: mountingPart.number, pick: practicePick },
    tool: 'Torx 비트', torque: '1.0', exampleTorque: true,
  };
  assert.equal(isPracticeReady(practiceConfig, grouped.length), true);
  const manualSequence = createManualPracticeSequence(practiceConfig, practicePick);
  assert.deepEqual(Array.from(getPracticeInstalledParts(manualSequence, 0)), [grouped[2].number]);
  assert.deepEqual(Array.from(getPracticeInstalledParts(manualSequence, 1)), [grouped[2].number, basePart.number]);
  assert.deepEqual(Array.from(getPracticeInstalledParts(manualSequence, 2)), [grouped[2].number, basePart.number, grouped[3].number]);
  assert.equal(manualSequence.stages[2].kind, 'fasten');
  assert.equal(isPracticeReady({ ...practiceConfig, mounts: [{ ...firstMount, support: undefined }] }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, mounts: [{ ...firstMount, purpose: ' ' }] }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, mounts: [{ ...firstMount, support: { ...firstMount.support, pick: { ...practicePick, point: [-0.5, 0, 0] } } }] }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, mounts: [firstMount, { ...secondMount, support: practiceConfig.fastening }] }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, mounts: [firstMount, firstMount] }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, fastening: firstMount.placement }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, torque: '작업지시서 확인' }, grouped.length), false);
  assert.equal(isPracticeReady({ ...practiceConfig, fastening: { partNumber: mountingPart.number } }, grouped.length), false);
  const modelBounds = { min: [-10, -10, -10], max: [10, 10, 10] };
  const [stagingX] = getPreparationOffset(modelBounds, modelBounds, 0.1);
  assert.equal(stagingX, PREPARATION_CENTER);
  assert.ok(stagingX - 1 > 1, 'Even the widest part starts clear of the assembly area');
  assert.equal(getSeatingClearance(modelBounds, 0.1), 0.234);
  const trayBounds = Array.from({ length: 30 }, (_, index) => ({ min: [-2, -1, 0], max: [1 + index % 4, 2 + index % 3, 3] }));
  const bench = getPracticeWorkbench(modelBounds, modelBounds, 0.1);
  const trayHomeX = getPracticeTrayHomeX(bench);
  const tray = layoutPracticeTray(modelBounds, trayBounds, 0.1, [], { homeX: trayHomeX });
  assert.ok(Math.abs(bench.width - 2.96 * 1.6) < 1e-8, 'The table is exactly 1.6 times as wide');
  assert.equal(bench.depth, 3.2);
  assert.equal(bench.x, 0);
  assert.ok(bench.x + bench.width / 2 < tray.limits.left + trayHomeX + trayTravel.minX, 'The entire tray stays to the right of the table at its closest position');
  const oldMapWidth = Math.max(12, (tray.frame.right + 1.2) * 1.55, tray.frame.halfDepth * 3);
  assert.equal(tray.map.width, oldMapWidth * 1.5, 'The floor is exactly 1.5 times as wide');
  assert.equal(tray.map.depth, oldMapWidth, 'The floor keeps its original depth');
  assert.ok(tray.frame.editRight <= tray.map.x + tray.map.width / 2);
  assert.ok(Math.abs(tray.limits.right + trayHomeX + trayTravel.maxX - tray.frame.editRight) < 1e-8, 'The full tray stays on the floor when shifted right');
  assert.equal(tray.slots.length, 30);
  assert.ok(tray.slots.every(({ x, y, width }, index) => x - width / 2 > 1 && canPlacePracticeTraySlot(tray, index, [x, y])));
  assert.equal(canPlacePracticeTraySlot(tray, 0, [tray.slots[1].x, tray.slots[1].y]), false);
  assert.equal(getPracticeTrayPlacementIssue(tray, 0, [tray.slots[1].x, tray.slots[1].y]), 'occupied');
  const customPosition = Array.from(clampPracticeTraySlot(tray, 0, [100, -100]));
  assert.equal(getPracticeTrayPlacementIssue(tray, 0, [customPosition[0] + 0.05, customPosition[1]]), 'outside');
  assert.equal(getPracticeTrayPlacementIssue(tray, 0, customPosition), null, 'Dropping at the actual boundary remains valid');
  assert.equal(canPlacePracticeTraySlot(tray, 0, customPosition), true);
  const savedLayout = readPracticeTrayLayout(JSON.parse(JSON.stringify({ 'part-1': customPosition, 'group-2-3': [3, 0] })));
  const restoredTray = layoutPracticeTray(modelBounds, trayBounds, 0.1, [savedLayout['part-1']], { homeX: trayHomeX });
  assert.equal(restoredTray.slots[0].y, customPosition[1]);
  assert.equal(restoredTray.slots[0].x, customPosition[0]);
  assert.equal(restoredTray.slots[1].y, tray.slots[1].y, 'Older arrangements keep their slot positions');
  assert.deepEqual(restoredTray.slots[1].offset, tray.slots[1].offset, 'Moving a part leaves the other parts in place');
  const defaultSurface = getPracticeTraySurface(tray.slots);
  const resizedSurface = getPracticeTraySurface(restoredTray.slots);
  assert.ok(resizedSurface.width > defaultSurface.width && resizedSurface.depth > defaultSurface.depth, 'Dragging beyond the box grows the surface');
  assert.deepEqual(resizedSurface, getPracticeTraySurface(tray.slots, { index: 0, point: customPosition }), 'The drag preview and saved bounds match');
  assert.deepEqual(defaultSurface, getPracticeTraySurface(restoredTray.slots, { index: 0, point: [tray.slots[0].x, tray.slots[0].y] }),
    'Moving the farthest part inward shrinks the box');
  const rowBounds = trayBounds.slice(0, 13);
  const compactTray = layoutPracticeTray(modelBounds, rowBounds, 0.1, [], { homeX: trayHomeX });
  let nextSlotLeft = compactTray.limits.left;
  const rowPositions = Array.from(compactTray.slots, ({ width }) => {
    const x = nextSlotLeft + width / 2;
    nextSlotLeft += width;
    return [x, 0];
  });
  const rowTray = layoutPracticeTray(modelBounds, rowBounds, 0.1, rowPositions, { homeX: trayHomeX });
  assert.deepEqual(Array.from(rowTray.slots, ({ x, y }) => [x, y]), rowPositions, 'The positions of all 13 parts in a long row restore');
  const rowSurface = getPracticeTraySurface(rowTray.slots);
  const compactSurface = getPracticeTraySurface(compactTray.slots);
  assert.ok(rowSurface.width > compactSurface.width * 2 && rowSurface.depth < compactSurface.depth, 'A long row grows in width independently of depth');
  assert.equal(Object.keys(readPracticeTraySettings({ positions: savedLayout }).trayOffsets).length, 0);
  const cardId = 'a'.repeat(32);
  assert.equal(readPracticeCaption({ key: 'part-1', text: '  위치를 맞추세요.  ' }).text, '위치를 맞추세요.');
  assert.equal(readPracticeCardChange({ key: 'part-1', id: cardId, card: { text: '설명', position: [0, 0, Infinity] } }), null);
  const spatialSettings = readPracticeTraySettings({ positions: savedLayout,
    cards: { 'part-1': { [cardId]: { text: '설명', position: [1, -0.3, 0.5] } } } });
  assert.deepEqual(Array.from(spatialSettings.cards['part-1'][cardId].position), [1, -0.3, 0.5]);
  assert.equal(spatialSettings.cards['part-1'][cardId].layout, 'text', 'Legacy text cards retain their content and position');
  assert.equal(spatialSettings.cards['part-1'][cardId].theme, 'orange', 'Legacy cards receive the original warm theme');
  const geometry = { position: [1, 0, 0.5], size: { width: 380, height: 240 } };
  assert.equal(readPracticeSceneCard({ ...geometry, layout: 'text', title: '방향', text: '' }).title, '방향');
  assert.equal(readPracticeSceneCard({ ...geometry, layout: 'image', image: { kind: 'during' }, title: '숨김' }).title, '');
  const combinedCard = readPracticeSceneCard({ ...geometry, layout: 'combined', image: { kind: 'after' }, imageShare: 68, text: '체결 확인' });
  assert.equal(combinedCard.image.kind, 'after');
  assert.equal(combinedCard.imageShare, 68, 'Combined cards restore the image share from saved settings');
  assert.equal(PRACTICE_CARD_THEMES.length, 10);
  assert.ok(PRACTICE_CARD_THEMES.every(({ id }) => readPracticeSceneCard({ ...combinedCard, theme: id })?.theme === id));
  assert.equal(readPracticeSceneCard({ ...combinedCard, theme: 'custom' }), null);
  assert.equal(readPracticeSceneCard({ ...combinedCard, imageShare: 90 }), null);
  assert.equal(readPracticeSceneCard({ ...geometry, layout: 'combined', text: '이미지 없음' }), null);
  assert.equal(readPracticeSceneCard({ ...geometry, layout: 'image', image: { kind: 'upload', src: 'data:image/svg+xml;base64,AAAA' } }), null);
  assert.equal(clampPracticeCardSize({ width: 900, height: 10 }).height, 124);
  assert.equal(readPracticeCardChange({ key: 'part-1', id: cardId, geometry }).geometry.size.width, 380);
  const settings = readPracticeTraySettings(JSON.parse(JSON.stringify({ positions: savedLayout, trayOffsets: { product: [0.4, -0.8], 'area-2-3': [0, 1] } })));
  assert.deepEqual(Array.from(settings.trayOffsets.product), [0.4, -0.8]);
  assert.deepEqual(Array.from(settings.positions['part-1']), customPosition);
  assert.equal(readPracticeTraySettings({ positions: {}, trayOffsets: { product: [trayTravel.minX - 0.1, 0] } }), null);
  assert.equal(readPracticeTraySettings({ positions: {}, trayOffsets: { product: [0, trayTravel.maxY + 0.1] } }), null);
  assert.equal(readPracticeTraySettings({ positions: {}, trayOffsets: { 'part-1': [0.4, 0] } }), null);
  assert.equal(readPracticeTrayLayout({ 'part-1': [Infinity, 0] }), null);
  assert.equal(readPracticeTrayLayout({ '../file': [3, 0] }), null);
  assert.notEqual(getPracticePartSurface(1).color, getPracticePartSurface(2).color);
  assert.ok(getPracticePartSurface(1, 'Torx Bolt').metalness > getPracticePartSurface(1, 'Wire').metalness);
  assert.ok(getPracticePartSurface(1, 'Wire').roughness > getPracticePartSurface(1, 'Torx Bolt').roughness);
  const looseTurn = advancePracticeTurn(0.35, Math.PI / 12);
  const loadedTurn = advancePracticeTurn(0.96, Math.PI / 12);
  assert.ok(loadedTurn.rotation < looseTurn.rotation / 3, 'The same input moves the tool less as the fastener seats');
  assert.ok(getPracticeResistance(0.96) > getPracticeResistance(0.35));
  assert.equal(advancePracticeTurn(0.96, -0.5).progress, 0.96);
  const { before, after } = getInstructionDrawingTargets(mountingPart, basePart);
  assert.equal(before.shapeIds, basePart.shapeIds);
  assert.deepEqual(Array.from(after.shapeIds), [...basePart.shapeIds, ...mountingPart.shapeIds]);
  assert.equal(after.highlightShapeIds, mountingPart.shapeIds);
  assert.equal(before.bounds, after.bounds, 'Both views use the same framing');
  for (let axis = 0; axis < 3; axis++) {
    assert.equal(after.bounds.min[axis], Math.min(basePart.bounds.min[axis], mountingPart.bounds.min[axis]));
    assert.equal(after.bounds.max[axis], Math.max(basePart.bounds.max[axis], mountingPart.bounds.max[axis]));
  }
  assert.equal(createInstructionDrafts([mountingPart])[0].basePartNumber, undefined);
  const { CylinderGeometry, PerspectiveCamera, Vector3 } = require('three');
  const target = new Vector3(), direction = new Vector3(0, -1, 0.9).normalize();
  const frameHalfDepth = Math.max(bench.depth / 2, tray.frame.halfDepth) + 0.1;
  const frameMin = [bench.x - bench.width / 2 - 0.12, -frameHalfDepth, -1.05];
  const frameMax = [tray.frame.editRight + 0.12, frameHalfDepth, 1];
  const aspect = 1600 / 760, fov = 37;
  const camera = new PerspectiveCamera(fov, aspect, 0.001, 1000);
  camera.position.copy(direction).multiplyScalar(fitStepViewDistance(frameMin, frameMax, target, direction, fov * Math.PI / 180, aspect));
  camera.up.set(0, 0, 1); camera.lookAt(target); camera.updateMatrixWorld();
  assert.ok(Math.abs(target.clone().project(camera).x) < 1e-8, 'The assembly stays horizontally centered');
  for (const y of [frameMin[1], frameMax[1]]) for (const z of [frameMin[2], frameMax[2]]) {
    const corner = new Vector3(frameMax[0], y, z).project(camera);
    assert.ok(corner.x > 0 && corner.x < 1 && Math.abs(corner.y) < 1, 'The rightmost tray corners fit without shifting the assembly');
  }
  const benchDistance = camera.position.length();
  const focusPoint = [0.64, -0.18, 0.33], boltTarget = new Vector3(...focusPoint);
  const boltFocus = getPracticeFasteningFocus(modelBounds, focusPoint, 0.1, 0.16);
  const boltDirection = direction.clone().add(new Vector3(0, 0, 2)).normalize();
  const focusDistance = fitStepViewDistance(boltFocus.min.map((value) => value * 0.1),
    boltFocus.max.map((value) => value * 0.1), boltTarget, boltDirection, fov * Math.PI / 180, aspect);
  assert.ok(focusDistance < benchDistance / 3, 'Fastening brings the actual camera closer');
  camera.position.copy(boltTarget).addScaledVector(boltDirection, focusDistance);
  camera.lookAt(boltTarget); camera.updateMatrixWorld();
  const boltScreenPoint = boltTarget.clone().project(camera);
  assert.ok(Math.hypot(boltScreenPoint.x, boltScreenPoint.y) < 1e-8, 'The rotation overlay aligns with an off-center bolt after zooming');
  const pickupModel = { min: [-10, -10, -4], max: [10, 10, 4] };
  const pickupPart = { min: [-7, -5, -3], max: [8, 5, 0] };
  const pickupCorners = getPracticePartCorners(pickupModel, pickupPart, 0.1);
  const smallPartCorners = getPracticePartCorners(pickupModel, { min: [-2, -2, -1], max: [-1.7, -1.6, -0.6] }, 0.1);
  for (const viewAspect of [2.1, 1.35, 0.8]) {
    camera.aspect = viewAspect;
    camera.updateProjectionMatrix();
    const closeDistance = fitStepViewDistance([-1, -1, -0.4], [1, 1, 0.4], target, direction, fov * Math.PI / 180, viewAspect);
    camera.position.copy(direction).multiplyScalar(closeDistance);
    camera.lookAt(target); camera.updateMatrixWorld();
    assert.equal(isPracticePartVisible(camera, pickupCorners, [trayHomeX + 4, 0, 0], new Vector3()), false,
      'An out-of-view preparation part is available through the pickup list');
    assert.equal(isPracticePartVisible(camera, pickupCorners, [0, 0, 0], new Vector3()), true);
    for (const angle of [direction, new Vector3(-0.84, 0.45, 0.24).normalize()]) {
      camera.position.copy(angle).multiplyScalar(closeDistance);
      camera.lookAt(target); camera.updateMatrixWorld();
      for (const corners of [pickupCorners, smallPartCorners]) {
        const pose = getPracticePickupPose(camera, corners, target);
        const aimX = viewAspect < 1.25 ? -0.3 : 0;
        const projectedCorners = Array.from(corners, (corner) => {
          const point = corner.clone().multiplyScalar(pose.scale).add(new Vector3(...pose.offset));
          const localDepth = -point.clone().applyMatrix4(camera.matrixWorldInverse).z;
          assert.ok(localDepth > camera.near && localDepth < closeDistance * 0.4, 'Retrieved parts are in the foreground');
          const screen = point.project(camera);
          assert.ok(Math.abs(screen.x - aimX) <= 0.42 + 1e-8 && screen.y >= 0.35 - 1e-8 && screen.y <= 0.88 + 1e-8,
            'The retrieved part fits the upper view after orbiting or resizing');
          return screen;
        });
        const spans = ['x', 'y'].map((axis) => {
          const values = projectedCorners.map((point) => point[axis]);
          return Math.max(...values) - Math.min(...values);
        });
        assert.ok(Math.max(...spans) > 0.33, 'Long and small retrieved parts remain large enough to pick up');
      }
    }
  }
  const tilt = Math.PI / 4;
  const fastenerGeometry = new CylinderGeometry(1, 0.55, 3, 48).rotateX(tilt);
  fastenerGeometry.computeBoundingBox();
  const fastenerBounds = { min: fastenerGeometry.boundingBox.min.toArray(), max: fastenerGeometry.boundingBox.max.toArray() };
  const fastenerMesh = {
    name: 'tilted fastener', color: null, position: fastenerGeometry.getAttribute('position').array,
    index: new Uint32Array(fastenerGeometry.index.array), origin: [0, 0, 0], bounds: fastenerBounds, normal: null,
  };
  const fastenerModel = createStepModel({ name: 'fastener.stp', size: 1 }, 'test', { name: '', meshes: [0], children: [] }, [fastenerMesh]);
  const [tiltedPart] = getStepAssemblyParts(fastenerModel);
  const expectedAxis = new Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const boltHead = getFastenerHead(fastenerModel, tiltedPart, { point: [0.12, 0.5, 0.5], normal: [1, 0, 0] });
  assert.ok(expectedAxis.distanceTo(new Vector3(...boltHead.normal)) < 0.001, 'A side-wall click must preserve the tilted shaft axis');
  assert.ok(new Vector3(...boltHead.point).cross(expectedAxis).length() < 0.001, 'The tool pivots at the center of the head');
  const ends = getFastenerEnds(fastenerModel, tiltedPart);
  assert.equal(ends.length, 1, 'A wider head distinguishes the working end from the tip');
  assert.ok(matchFastenerHead(ends, boltHead));
  assert.equal(matchFastenerHead(ends, { ...boltHead, point: boltHead.point.map((value) => -value) }), undefined, 'The tip cannot confirm tool placement');
  const side = new Vector3(...boltHead.point).add(new Vector3(ends[0].radius, 0, 0));
  assert.equal(matchFastenerHead(ends, { point: side.toArray(), normal: [1, 0, 0] }), undefined, 'The side cannot confirm tool placement');
  assert.equal(getPracticeToolKind('5 mm 육각 렌치', 'Torx bolt'), 'hex-key', 'The configured tool takes precedence');
  assert.equal(getPracticeToolKind('규격 확인', 'Phillips Flat Head Screw'), 'phillips');
  assert.equal(getPracticeToolKind('Torx 비트', 'Screw'), 'torx');
  assert.equal(getPracticeToolKind('일자 드라이버', 'Screw'), 'slotted');
  assert.equal(getPracticeToolKind('래칫 소켓', 'Hex bolt'), 'socket');
  const recessedHead = { ...boltHead, driveDepth: ends[0].radius * 0.2 };
  const hexTool = getPracticeToolShape('hex-key', recessedHead, 0.16);
  const driverTool = getPracticeToolShape('torx', recessedHead, 0.16);
  assert.ok(hexTool.depth > 0 && hexTool.depth < recessedHead.driveDepth, 'The bit enters the recess without passing its floor');
  assert.equal(getPracticeToolShape('torx', { ...recessedHead, driveDepth: 0 }, 0.16).depth, 0);
  assert.ok(driverTool.axial > hexTool.axial && hexTool.radial > driverTool.radial);
  for (const shape of [hexTool, driverTool]) {
    const view = getPracticeToolView(modelBounds, recessedHead, 0.1, 0.16, shape, [0, -1, 0.9]);
    const axis = new Vector3(...recessedHead.normal);
    const angle = new Vector3(...view.direction).dot(axis);
    assert.ok(angle > 0.65 && angle < 0.85);
    const approachEnd = new Vector3(...recessedHead.point).addScaledVector(axis, shape.axial + shape.standoff).toArray();
    for (let index = 0; index < 3; index++) {
      const value = approachEnd[index] / 0.1 + (modelBounds.min[index] + modelBounds.max[index]) / 2;
      assert.ok(view.bounds.min[index] <= value + 1e-8 && view.bounds.max[index] >= value - 1e-8, 'The close-up includes the tool before it seats');
    }
  }
  const thirtyParts = Array.from({ length: 30 }, (_, index) => ({ ...tiltedPart, number: index + 1,
    name: index === 1 || index === 14 ? 'Torx bolt' : `Part ${index + 1}` }));
  const thirtyInstructions = createInstructionDrafts(thirtyParts);
  const defaultSequence = createProductPracticeSequence(fastenerModel, thirtyParts, thirtyInstructions);
  assert.equal(getProductPlacementCaption(defaultSequence.stages[0], '하우징'),
    '오른쪽 부품(하우징)을 집어 중앙의 주황색 윤곽에 맞춰 놓으세요.');
  assert.match(getProductPlacementCaption(defaultSequence.stages[0], '하우징', true), /^화면 위쪽의 부품/);
  assert.deepEqual(Array.from(defaultSequence.stages, ({ target }) => target.partNumber), thirtyParts.map(({ number }) => number));
  assert.deepEqual(Array.from(getPracticeInstalledParts(defaultSequence, 0)), [], 'The first part belongs to the product practice');
  assert.equal(defaultSequence.stages[1].kind, 'mount', 'An unconfirmed tool specification does not set a torque target');
  const confirmedOrder = [thirtyInstructions[2], ...thirtyInstructions.slice(0, 2), ...thirtyInstructions.slice(3)];
  for (const step of confirmedOrder) step.isConfirmed = true;
  confirmedOrder.find(({ partNumber }) => partNumber === 2).torque = '1.2 N·m';
  confirmedOrder.find(({ partNumber }) => partNumber === 15).torque = '1.5 Nm';
  const productSequence = createProductPracticeSequence(fastenerModel, thirtyParts, confirmedOrder);
  assert.deepEqual(Array.from(productSequence.stages, ({ target }) => target.partNumber), confirmedOrder.map(({ partNumber }) => partNumber));
  assert.deepEqual(Array.from(productSequence.stages.filter(({ kind }) => kind === 'fasten'), ({ torque }) => torque), [1.2, 1.5]);
  assert.deepEqual(Array.from(getPracticeInstalledParts(productSequence, 15)), confirmedOrder.slice(0, 15).map(({ partNumber }) => partNumber));
  assert.equal(getPracticeInstalledParts(productSequence, 30).length, 30);
  const movedInPractice = moveProductPracticeStage(productSequence, 4, 2, 2);
  assert.equal(movedInPractice.stages[2], productSequence.stages[4]);
  assert.equal(movedInPractice.stages[3], productSequence.stages[2]);
  assert.deepEqual(getPracticeInstalledParts(movedInPractice, 2), getPracticeInstalledParts(productSequence, 2));
  assert.equal(moveProductPracticeStage(productSequence, 4, 1, 2), null, 'Completed or engaged steps cannot be displaced');
  assert.equal(moveProductPracticeStage(productSequence, 2, 0, 0), null, 'A fastener cannot come before any mounted part');
  const dependent = { stages: [defaultSequence.stages[0], { ...defaultSequence.stages[1], support: defaultSequence.stages[0].target }] };
  assert.equal(moveProductPracticeStage(dependent, 1, 0, 0), null, 'A part cannot be moved ahead of its mounting support');
  const enclosureParts = [
    ['Panel-7', [0, 0, 4], [10, 10, 6]], ['Housing', [0, 0, 0], [10, 10, 5]],
    ['Board', [1, 1, 1], [8, 7, 2]], ['Connector', [2, 2, 2], [4, 3, 3]],
    ['Internal bolt', [4, 4, 1], [5, 5, 4]], ['Lid bolt', [5, 5, 4], [6, 6, 6.1]],
  ].map(([name, min, max], index) => ({ name, number: index + 1, shapeIds: ['shape-' + index], path: '', bounds: { min, max } }));
  const leaf = (index) => ({ name: enclosureParts[index].name, meshes: [index], children: [] });
  const housingModel = { ...fastenerModel, bounds: { min: [0, 0, 0], max: [10, 10, 6.1] },
    manifest: { ...fastenerModel.manifest, shapeList: enclosureParts.map((part, index) => ({ id: part.shapeIds[0], meshIndex: index })) },
    root: { name: 'Product', meshes: [], children: [leaf(0), leaf(1), { name: 'Board assembly', meshes: [], children: [leaf(2), leaf(3)] }, leaf(4), leaf(5)] } };
  const nested = createProductPracticeSequence(housingModel, enclosureParts, createInstructionDrafts(enclosureParts));
  const [duringFigure, afterFigure] = getPracticeCardImageRequests('step', [enclosureParts[2], enclosureParts[3]], [enclosureParts[1]]);
  assert.deepEqual(Array.from(duringFigure.target.shapeIds), ['shape-2', 'shape-3']);
  assert.deepEqual(Array.from(afterFigure.target.shapeIds), ['shape-1', 'shape-2', 'shape-3']);
  assert.deepEqual(Array.from(afterFigure.target.highlightShapeIds), ['shape-2', 'shape-3']);
  assert.deepEqual(Array.from(nested.stages, ({ target }) => target.partNumber), [3, 4, 2, 3, 5, 1, 6], 'Build the board first and close the lid after internal assembly');
  assert.equal(nested.stages[3].kind, 'join');
  assert.equal(nested.stages[5].closesEnclosure, true);
  assert.equal(nested.stages[6].closesEnclosure, false, 'The lid screw follows closure without acting as a cover');
  assert.deepEqual(Array.from(nested.stages[3].members), [3, 4]);
  const boardArea = nested.stages[0].workArea.id;
  assert.deepEqual(Array.from(getPracticeInstalledParts(nested, 3, boardArea)), [3, 4]);
  assert.deepEqual(Array.from(getPracticeInstalledParts(nested, 3, null)), [2]);
  assert.deepEqual(Array.from(getPracticeInstalledParts(nested, 4, boardArea)), []);
  assert.deepEqual(Array.from(getPracticeInstalledParts(nested, 4, null)), [2, 3, 4]);
  assert.equal(getPracticeInstalledParts(nested, nested.stages.length, null).length, 6, 'The completed product contains every physical part once');
  assert.equal(moveProductPracticeStage(nested, 3, 1, 0), null, 'A subassembly must be built before it can be joined');
  assert.equal(moveProductPracticeStage(nested, 5, 4, 0), null, 'Internal parts stay before the cover');
  assert.equal(moveProductPracticeStage(nested, 6, 5, 0), null, 'Cover screws stay after the cover');
  const flatModel = { ...housingModel, root: { ...housingModel.root, children: enclosureParts.map((_, index) => leaf(index)) } };
  const flatInstructions = createInstructionDrafts(enclosureParts).map((step) => ({ ...step, isConfirmed: true,
    section: [3, 4].includes(step.partNumber) ? '기판 소조립' : step.section }));
  const flatSequence = createProductPracticeSequence(flatModel, enclosureParts, flatInstructions);
  assert.deepEqual(Array.from(flatSequence.stages.find(({ kind }) => kind === 'join').members), [3, 4]);
  assert.equal(flatSequence.stages.find(({ closesEnclosure }) => closesEnclosure).target.partNumber, 1);
  fastenerGeometry.dispose();
  const drafts = createInstructionDrafts([
    { ...grouped[0], name: 'Torx bolt' }, { ...grouped[1], name: 'Torx bolt' }, { ...grouped[2], name: 'Wire' },
  ]);
  assert.equal(drafts.length, 3);
  assert.notEqual(drafts[0].id, drafts[1].id, 'Repeated parts must be confirmed individually');
  assert.match(drafts[0].tool, /Torx/);
  assert.equal(drafts[0].torque, '작업지시서 확인 (N·m)');
  assert.match(drafts[0].description, /Torx 비트로 체결하세요/);
  assert.match(drafts[2].description, /경로로 배치하고.*연결하세요/);
  const mountingDrafts = createInstructionDrafts([
    { ...grouped[0], name: 'Washer' }, { ...grouped[1], name: 'PCB' }, { ...grouped[2], name: 'SP-RHM-003' },
  ]);
  assert.match(mountingDrafts[0].description, /와셔.*끼우세요/);
  assert.match(mountingDrafts[1].description, /기판.*고정하세요/);
  assert.match(mountingDrafts[2].description, /위치와 방향에 맞춰.*장착하세요/);
  assert.equal(mountingDrafts[0].torque, '해당 없음 (와셔 배치)');
  assert.equal(mountingDrafts[1].torque, '기판 체결부 규격 확인');
  assert.equal(mountingDrafts[2].torque, '체결 여부 확인');
  assert.ok(drafts.every((step) => step.section && step.description && step.tool && step.torque && !step.isConfirmed && step.basePartNumber === undefined));
  const [namedTorx] = createInstructionDrafts([{ ...mountingPart, name: 'Low profile torx, M2x5 v2' }]);
  assert.match(namedTorx.tool, /Torx/);
  assert.equal(namedTorx.torque, '작업지시서 확인 (N·m)', 'Thread dimensions alone do not specify installation torque');
  assert.equal(nextUnconfirmedInstruction(drafts, drafts[1].id).id, drafts[2].id);
  drafts[2].isConfirmed = true;
  assert.equal(nextUnconfirmedInstruction(drafts, drafts[1].id).id, drafts[0].id, 'Review wraps to earlier unconfirmed parts');
  drafts[0].isConfirmed = true;
  assert.equal(nextUnconfirmedInstruction(drafts, drafts[1].id), undefined, 'Review completes after the last outstanding part');
  const instructions = Array.from({ length: 8 }, (_, index) => ({
    id: String(index), section: index < 7 ? '조립' : '검사', partNumber: 1, description: '확인',
  }));
  const reordered = moveInstruction(instructions, '1', -1);
  assert.equal(reordered[0].id, '1');
  assert.equal(moveInstruction(reordered, '7', -1), reordered, 'A step cannot be reordered into a different section');
  const dragged = reorderInstruction(instructions, '0', '4', true);
  assert.deepEqual(Array.from(dragged.slice(0, 6), ({ id }) => id), ['1', '2', '3', '4', '0', '5']);
  assert.deepEqual(Array.from(reorderInstruction(dragged, '0', '1', false), ({ id }) => id), instructions.map(({ id }) => id));
  assert.equal(reorderInstruction(instructions, '0', '7', false), instructions, 'Dragging preserves the assembly section');
  const sheets = paginateInstructions(reordered);
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0][0].steps.length, 6);
  assert.equal(sheets[1][0].offset, 6, 'Step numbering continues on the next sheet');
  assert.equal(sheets[1][1].number, 2);
  const millimeter = await parse(path.join(fixtures, 'cube-units/cube-mm.step'));
  const inch = await parse(path.join(fixtures, 'cube-units/cube-in.step'));
  for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(millimeter.bounds.max[axis] - inch.bounds.max[axis]) < 1e-6, 'Inch STEP must be converted to millimeters');
    assert.equal(millimeter.bounds.max[axis], 1000);
  }
  const built = buildStepGeometry(assembly, '#808080');
  assert.equal(built.rangeList.length, 18);
  assert.equal(built.geometry.index.count / 3, 5040);
  for (const range of built.rangeList) {
    assert.equal(findShapeAtFace(built.rangeList, range.firstTriangle), range.id);
    assert.equal(findShapeAtFace(built.rangeList, range.firstTriangle + range.triangleCount - 1), range.id);
  }
  assert.equal(findShapeAtFace(built.rangeList, 5040), null); built.geometry.dispose();
  const cubeStructure = buildStepStructureGeometry(cube);
  assert.equal(cubeStructure.geometry.getAttribute('position').count / 2, 12, 'Only the twelve cube edges are visible');
  cubeStructure.geometry.dispose();
  const cylinder = new CylinderGeometry(1, 1, 3, 48);
  const cylinderStructure = createStepStructureEdges(cylinder);
  const points = cylinderStructure.getAttribute('position');
  const faceA = cylinderStructure.getAttribute('faceA'), faceB = cylinderStructure.getAttribute('faceB');
  const sideLines = (view) => {
    const visible = [];
    const a = new Vector3(), b = new Vector3();
    for (let index = 0; index < points.count; index += 2) {
      if (Math.abs(points.getY(index) - points.getY(index + 1)) < 2) continue;
      if (a.fromBufferAttribute(faceA, index).dot(view) * b.fromBufferAttribute(faceB, index).dot(view) <= 0) visible.push(index);
    }
    return visible;
  };
  const front = sideLines(new Vector3(1, 0, 0.24));
  const rotated = sideLines(new Vector3(0.24, 0, 1));
  assert.equal(front.length, 2, 'The round body shows two vertical silhouettes without tessellation lines');
  assert.equal(rotated.length, 2);
  assert.notDeepEqual(front, rotated, 'The silhouette follows the viewing angle');
  cylinderStructure.dispose(); cylinder.dispose();
  const assemblyStructure = buildStepStructureGeometry(assembly);
  assert.deepEqual(Array.from(assemblyStructure.rangeList, (range) => range.id), Array.from(built.rangeList, (range) => range.id));
  const assemblyNormals = assemblyStructure.geometry.getAttribute('faceA');
  let fixedEdges = 0;
  for (let index = 0; index < assemblyNormals.count; index += 2) {
    if (assemblyNormals.getX(index) === 0 && assemblyNormals.getY(index) === 0 && assemblyNormals.getZ(index) === 0) fixedEdges++;
  }
  assert.ok(fixedEdges < 5040, 'The assembly has fewer always-visible structure segments than mesh triangles');
  assemblyStructure.geometry.dispose();
  assert.equal(sameStepModel(assembly.manifest, { ...assembly.manifest, name: 'renamed.stp' }), true);
  assert.equal(sameStepModel(assembly.manifest, { ...assembly.manifest, sha256: '0'.repeat(64) }), false);
  const result = analyze(tableTokens());
  const pages = [{ ...result, pageNumber: 1, width: 600, height: 800, imageUrl: '', textCount: 200, warningList: [] }];
  const groups = groupParts(pages), parts = groups.map(createPartReview);
  const confirmed = parts.map((part) => ({ ...part, quantity: '2', hasNoDimensions: true, status: 'confirmed', confirmedAt: new Date().toISOString() }));
  const empty = { model: null, modelLinks: [] }, manifest = assembly.manifest;
  assert.throws(() => bindStepShape(empty, parts, parts[0].key, 'shape-0', manifest), /확정/);
  let bound = bindStepShape(empty, confirmed, parts[0].key, 'shape-0', manifest);
  bound = bindStepShape(bound, confirmed, parts[0].key, 'shape-1', manifest);
  assert.equal(bound.modelLinks.length, 2);
  assert.throws(() => bindStepShape(bound, confirmed, parts[1].key, 'shape-0', manifest), /이미/);
  assert.throws(() => bindStepShape(bound, confirmed, parts[0].key, 'shape-0', cube.manifest), /다른 STEP/);
  assert.equal(unbindStepShape(bound, manifest, 'shape-0').modelLinks.length, 1);
  const document = { sha256: 'a'.repeat(64), name: 'review.pdf', size: 10, pageCount: 1 };
  const payload = createReviewPackage(document, groups, confirmed, pages, bound);
  const decode = (value) => decodeReview(JSON.stringify(value), document, groups, pages[0].dimensionList);
  const restored = decode(payload);
  assert.equal(restored.modelLinks.length, 2); assert.equal(restored.model.sha256, manifest.sha256);
  const legacy = { ...payload, schemaVersion: 1 }; delete legacy.model; delete legacy.modelLinks;
  assert.equal(decode(legacy).model, null);
  assert.throws(() => decode({ ...payload, modelLinks: [bound.modelLinks[0], bound.modelLinks[0]] }), /중복/);
  assert.throws(() => decode({ ...payload, modelLinks: [{ partKey: 'unknown', shapeId: 'shape-0' }] }), /일치/);
  assert.throws(() => decode({ ...payload, modelLinks: [{ partKey: parts[0].key, shapeId: 'unknown' }] }), /일치/);
  const edited = { ...payload, parts: payload.parts.map((part, index) => index ? part : { ...part, ...revisePart(confirmed[0], { name: 'Changed' }) }) };
  assert.equal(decode(edited).modelLinks.length, 2, 'Editing a part retains the mapping while requiring reconfirmation');
  console.log('PASS STEP: real worker conversion, mm/inch units, assembly placement, repeated solids, picking ranges, confirmed-only links, ownership, model identity, v1/v2 persistence');
}
async function checkBrowser() {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const output = path.join(require('node:os').tmpdir(), 'hanwha-step-upload-qa'); fs.mkdirSync(output, { recursive: true });
  let page;
  try {
    page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
    const client = await page.createCDPSession(); await client.send('Page.setDownloadBehavior', { behavior: 'deny' });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const external = []; page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://localhost:3000')) external.push(request.url()); });
    const click = require('./browser-ui-helpers.cjs').makeClick(page);
    const upload = (bytes, name, label) => page.$eval('input[aria-label="' + label + '"]', (input, data, fileName) => {
      const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(data)], fileName));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, [...bytes], name);
    const stepUpload = (filename, name = path.basename(filename)) => upload(fs.readFileSync(filename), name, '미리볼 STEP 선택');
    const complete = () => page.waitForSelector('[data-step-status=complete]', { timeout: 45000 });
    const shape = (id) => page.click('[data-step-shape="shape-' + id + '"]');
    const exportData = async () => { await click('JSON 내보내기'); return page.evaluate(async () => JSON.parse(await window.__reviewExport.text())); };
    await page.goto('http://localhost:3000/training/upload', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[aria-label="STEP 조립품 업로드"]');
    const [chooser] = await Promise.all([page.waitForFileChooser(), click('STEP 파일 선택')]);
    await chooser.accept([cubeFile]);
    await complete();
    const drawing = '[aria-label="교육용 조립 도면"]';
    await click('교육용 도면 보기');
    await page.waitForFunction((selector) => {
      const figure = document.querySelector(selector + ' img');
      return figure?.complete && figure.naturalWidth > 0;
    }, { timeout: 20000 }, drawing);
    assert.equal(await page.$$eval(drawing + ' img', (nodes) => nodes.length), 1, 'An assembly drawing is available without selected parts or steps');
    await click('닫기');
    const part = '[aria-label="STEP 부품 목록"] button[aria-pressed]';
    await page.click(part);
    await page.waitForSelector(part + '[aria-pressed=true]');
    await click('교육용 도면 보기');
    await page.waitForSelector(drawing + ' img[alt$="부품 상세도"]', { timeout: 20000 });
    await click('닫기');
    await click('선택 부품만 보기'); await click('전체 보기');
    await page.type('input[aria-label="부품 검색"]', 'no-match');
    await page.waitForSelector(part, { hidden: true });
    const standaloneCanvas = await page.waitForSelector('[aria-label="3D 형상 표시 영역"] canvas');
    const standaloneBox = await standaloneCanvas.boundingBox();
    await page.mouse.click(standaloneBox.x + standaloneBox.width / 2, standaloneBox.y + standaloneBox.height / 2);
    await page.waitForSelector(part + '[aria-pressed=true]');
    await click('작업 단계 등록');
    const draftDescription = await page.$eval('dialog[open] textarea', (input) => input.value);
    assert.match(draftDescription, /위치와 방향에 맞춰.*장착하세요/);
    assert.equal(await page.$eval('dialog[open] button', (button) => button.disabled), true);
    const confirm = 'dialog[open] input[name="part-confirmed"]';
    assert.equal(await page.$eval(confirm, (input) => input.disabled), false, 'Registration can be confirmed without a comparison part');
    await page.click(confirm);
    await page.waitForSelector('[aria-label="조립 상세 3D"] canvas');
    await click('시트 미리보기');
    const sheet = '[aria-label="조립 순서 시트 1"]';
    await page.waitForFunction((selector) => {
      const drawings = document.querySelectorAll(selector + ' img');
      return drawings.length === 1 && drawings[0].complete && drawings[0].naturalWidth > 0;
    }, { timeout: 20000 }, sheet);
    assert.ok(await page.$eval(sheet, (node, description) => node.textContent.includes(description), draftDescription));
    assert.match(await page.$eval(sheet, (node) => node.textContent), /조립 위치.*주황색 장착 부품/);
    await click('조립 상세로');
    await click('단계 편집');
    assert.equal(await page.$eval(confirm, (input) => input.checked), true);
    await page.type('dialog[open] textarea', ' 확인');
    assert.equal(await page.$eval(confirm, (input) => input.checked), false, 'Editing a confirmed part requires reconfirmation');
    await click('닫기');
    await upload(Buffer.from('invalid STEP'), 'invalid.step', '가져올 STEP 선택');
    await page.waitForSelector('[data-step-status=error]');
    assert.match(await page.$eval('[role=alert]', (node) => node.textContent), /유효한 STEP/);
    assert.ok(await page.$(part), 'An invalid replacement preserves the current assembly');

    await page.goto('http://localhost:3000/training/upload-dev', { waitUntil: 'networkidle0' });
    await page.evaluate(() => { const original = URL.createObjectURL; URL.createObjectURL = function(blob) { if (blob.type === 'application/json') window.__reviewExport = blob; return original.call(this, blob); }; });
    await click('STEP · 3D 연결'); await stepUpload(cubeFile); await complete();
    await page.waitForSelector('[aria-label="3D 형상 표시 영역"] canvas');
    // A raycast on the visible cube must select the same solid as the list.
    await page.waitForFunction(() => document.querySelector('canvas')?.width > 0);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const canvas = await page.$('[aria-label="3D 형상 표시 영역"] canvas'), box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForSelector('[data-step-shape="shape-0"][aria-pressed=true]');
    for (const [width, height] of [[1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height });
      await new Promise((resolve) => setTimeout(resolve, 300));
      const rect = await canvas.boundingBox();
      await page.mouse.click(rect.x + 5, rect.y + 5);
      await page.waitForSelector('[data-step-shape="shape-0"][aria-pressed=false]');
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.waitForSelector('[data-step-shape="shape-0"][aria-pressed=true]', { timeout: 3000 });
    }
    await page.setViewport({ width: 1920, height: 1080 });
    await stepUpload(assemblyFile); await complete();
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 18);
    await click('도면 분석으로');
    const pdf = makePdfFixture(1);
    const pdfReady = () => page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent === '부품 검토·보정' && !button.disabled), { timeout: 30000 });
    await upload(pdf, 'assembly-review.pdf', '분석할 PDF 선택'); await pdfReady(); await click('부품 검토·보정');
    await click('치수 0'); await page.click('input[aria-label="원문에 치수 없음 확인"]'); await click('이 부품 검토 확정');
    await page.waitForSelector('[data-review-status=confirmed]'); await click('STEP · 3D 연결');
    await shape(0); await click('선택 형상 연결'); await shape(1); await click('선택 형상 연결');
    await page.waitForFunction(() => document.querySelector('[aria-label="3D 부품번호 연결"]').textContent.includes('이 부품에 연결된 형상 2개'));
    await page.click('[data-review-part="number:BL-008"]');
    assert.equal(await page.$$eval('button', (nodes) => nodes.find((node) => node.textContent === '선택 형상 연결').disabled), true);
    await page.click('[data-review-part="number:BR-001"]');
    await click('선택 맞춤'); await click('선택만 표시');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent === '전체 표시' && button.getAttribute('aria-pressed') === 'true'));
    await click('전체 표시'); await click('전체 맞춤'); await click('검토 결과 저장');
    await shape(10); await click('선택만 표시'); await click('선택 맞춤');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await page.screenshot({ path: path.join(output, 'step-isolated-1920.png') });
    await click('전체 표시'); await click('전체 맞춤'); await shape(1);
    const exported = await exportData();
    assert.equal(exported.schemaVersion, 2); assert.equal(exported.modelLinks.length, 2);
    assert.equal(exported.model.shapeList.length, 18); assert.equal(exported.parts[0].status, 'confirmed');
    assert.equal(JSON.stringify(exported).includes('blob:'), false);
    await page.screenshot({ path: path.join(output, 'step-links-1920.png') });
    for (const [width, height] of [[1280, 720], [2560, 1440]]) {
      await page.setViewport({ width, height }); await page.waitForFunction(() => document.documentElement.scrollWidth === innerWidth);
      await page.screenshot({ path: path.join(output, 'step-links-' + width + '.png') });
    }
    await page.setViewport({ width: 1920, height: 1080 });
    await click('부품 검토·보정'); await click('품명·수량·재질');
    await page.$eval('input[aria-label="검토 품명"]', (input) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Revised base plate'); input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('STEP · 3D 연결');
    await page.waitForFunction(() => document.querySelector('[aria-label="STEP 형상 목록"]').textContent.includes('부품 재확정 필요'));
    await click('검토 결과 저장');
    await page.reload({ waitUntil: 'networkidle0' }); await upload(pdf, 'renamed.pdf', '분석할 PDF 선택'); await pdfReady();
    await click('STEP · 3D 연결');
    assert.match(await page.$eval('[aria-label="3D 부품번호 연결"]', (node) => node.textContent), /원본 STEP/);
    await stepUpload(assemblyFile, 'renamed.stp'); await complete();
    assert.match(await page.$eval('[data-step-shape="shape-0"]', (node) => node.textContent), /BR-001.*재확정/);
    await upload(Buffer.from(JSON.stringify(exported)), 'review.json', '검토 JSON 선택');
    await page.waitForFunction(() => document.querySelector('[aria-label="3D 부품번호 연결"]').textContent.includes('검토 확정 · 연결 가능'));
    await stepUpload(cubeFile); await complete();
    assert.match(await page.$eval('[aria-label="3D 부품번호 연결"]', (node) => node.textContent), /다른 STEP 기준/);
    assert.equal(await page.$eval('[data-step-shape="shape-0"]', (node) => node.textContent.includes('BR-001')), false);
    await click('현재 STEP으로 다시 시작 · 기존 2건 연결 해제');
    await shape(0); await click('선택 형상 연결'); await click('검토 결과 저장');
    await upload(Buffer.from('not a STEP'), 'broken.step', '미리볼 STEP 선택');
    await page.waitForSelector('[data-step-status=error]');
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 1, 'Failed replacement must preserve the last successful model');
    assert.match(await page.$eval('[role=alert]', (node) => node.textContent), /유효한 STEP/);
    // Delay worker input so cancellation and replacement are deterministic.
    await page.evaluate(() => { const NativeWorker = Worker; window.Worker = class extends NativeWorker {
      postMessage(...args) { this.pending = setTimeout(() => super.postMessage(...args), 600); }
      terminate() { clearTimeout(this.pending); super.terminate(); }
    }; });
    await stepUpload(assemblyFile); await page.waitForSelector('[data-step-status=running]'); await click('중지');
    await page.waitForSelector('[data-step-status=cancelled]');
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 1);
    await stepUpload(assemblyFile); await page.waitForSelector('[data-step-status=running]');
    await stepUpload(cubeFile); await complete();
    assert.equal(await page.$$eval('[data-step-shape]', (nodes) => nodes.length), 1, 'Replaced conversion must not append stale geometry');
    assert.deepEqual(errors, []);
    assert.equal(external.some((url) => /anthropic|openai|occt|\\.wasm|\\.step|\\.stp/i.test(url)), false, 'STEP/PDF processing must remain local');
    console.log('PASS browser STEP: actual WASM upload, 3D click selection, preview controls, confirmed part binding, repeated links, save/export/reload/import, model mismatch, draft invalidation, errors, cancellation/replacement, HD/FHD/QHD');
    console.log('Screenshots: ' + output);
  } catch (error) { await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error; }
  finally { await browser.close(); }
}
if (require.main === module) (async () => { await checkModel(); if (process.argv.includes('--browser')) await checkBrowser(); })().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { checkModel };
