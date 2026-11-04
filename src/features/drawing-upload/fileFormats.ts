export const FILE_FORMAT_GROUP_LIST = [
  { name: '도면 문서', extensionList: ['pdf'] },
  { name: '도면 이미지', extensionList: ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp', 'webp', 'svg'] },
  { name: 'CAD', extensionList: ['dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'sat', 'x_t', 'sldprt', 'sldasm', 'catpart', 'catproduct', 'ipt', 'iam', 'prt'] },
  { name: '3D 모델', extensionList: ['glb', 'gltf', 'obj', 'fbx', 'stl', '3mf', 'ply', 'usdz'] },
] as const;

export const ACCEPT_ATTRIBUTE = FILE_FORMAT_GROUP_LIST.flatMap((group) => group.extensionList.map((extension) => '.' + extension)).join(',');

export function getFormatGroupName(fileName: string): string | null {
  const extension = (fileName.split('.').pop() ?? '').toLowerCase();
  return FILE_FORMAT_GROUP_LIST.find((group) => (group.extensionList as readonly string[]).includes(extension))?.name ?? null;
}

export const formatFileSize = (byteSize: number) => (byteSize > 1048576 ? (byteSize / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(byteSize / 1024)) + ' KB');
