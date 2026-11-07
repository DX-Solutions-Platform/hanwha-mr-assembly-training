/* Browser worker: keep Open CASCADE conversion off the UI thread. */
self.onmessage = async ({ data }) => {
  let phase = 'engine';
  try {
    self.postMessage({ type: 'progress', phase });
    const base = new URL('/vendor/occt-0.0.23/', self.location.href).href;
    globalThis.importScripts(base + 'occt-import-js.js');
    const occt = await globalThis.occtimportjs({ locateFile: (name) => base + name, print: () => {}, printErr: () => {} });
    phase = 'convert'; self.postMessage({ type: 'progress', phase });
    const result = occt.ReadStepFile(new Uint8Array(data.buffer), {
      linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio',
      linearDeflection: 0.001, angularDeflection: 0.5,
    });
    if (!result.success || !result.meshes?.length) throw new Error('STEP에서 표시 가능한 형상을 찾지 못했습니다.');
    if (result.meshes.length > 1000) throw new Error('형상이 1,000개를 초과합니다. 조립품을 나누거나 단순화해 주세요.');
    const triangleCount = result.meshes.reduce((count, mesh) => count + mesh.index.array.length / 3, 0);
    if (triangleCount > 1_000_000) throw new Error('형상이 너무 복잡합니다. 100만 삼각형 이하로 단순화한 STEP을 선택해 주세요.');
    phase = 'geometry'; self.postMessage({ type: 'progress', phase });
    const transferList = [];
    const meshes = result.meshes.map((mesh) => {
      const positions = mesh.attributes.position.array, indices = mesh.index.array;
      if (!positions.length || positions.length % 3 || !indices.length || indices.length % 3) throw new Error('잘못된 STEP 형상 데이터입니다.');
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      positions.forEach((value, index) => {
        if (!Number.isFinite(value)) throw new Error('유효하지 않은 좌표입니다.');
        const axis = index % 3; min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
      });
      if (indices.some((value) => !Number.isInteger(value) || value < 0 || value >= positions.length / 3)) throw new Error('유효하지 않은 면 인덱스입니다.');
      const origin = min.map((value, index) => value + (max[index] - value) / 2);
      // Local origins retain precision for CAD files far from the global origin.
      const position = new Float32Array(positions.map((value, index) => value - origin[index % 3]));
      const index = new Uint32Array(indices);
      const normalSource = mesh.attributes.normal?.array;
      const normal = normalSource?.length === positions.length && normalSource.every(Number.isFinite) ? new Float32Array(normalSource) : null;
      transferList.push(position.buffer, index.buffer);
      if (normal) transferList.push(normal.buffer);
      return { name: mesh.name || '', color: mesh.color ?? null, position, index, normal, origin, bounds: { min, max } };
    });
    self.postMessage({ type: 'complete', root: result.root, meshes }, transferList);
  } catch (reason) {
    self.postMessage({ type: 'error', message: phase === 'engine' ? 'STEP 변환기를 불러오지 못했습니다. 다시 시도해 주세요.' : reason instanceof Error ? reason.message : 'STEP 변환에 실패했습니다.' });
  }
};
