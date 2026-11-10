export const LIBRARY_URL = '/api/part-library';
export const CATEGORY_LABEL = { custom: '맞춤 부품', standard: '표준품', purchased: '구매품' } as const;
export const ROLE_LIST = ['제작 담당', '설계·품질 검수', '공정 검수', '배포 담당', '교육생'] as const;
export type PartCategory = keyof typeof CATEGORY_LABEL;
export type LibraryRole = typeof ROLE_LIST[number];
export type LibraryDimension = { value: string; unit: string };
export type LibraryAsset = { key: string; name: string };
export type AssemblyAction = 'place' | 'fasten';
export interface LibraryPartInput {
  partNumber: string;
  name: string;
  material: string;
  specification: string;
  category: PartCategory;
  revision: string;
  status: 'approved' | 'pending';
  usage: string;
  source: string;
  dimensionList: LibraryDimension[];
  assemblyAction?: AssemblyAction | null;
  appearance?: ModelAppearance;
}
export interface LibraryPart extends LibraryPartInput {
  model?: LibraryAsset;
  photo?: LibraryAsset;
  history: { date: string; revision: string; role: LibraryRole; action: string }[];
}
export type LibraryMatch = Pick<LibraryPart, 'partNumber' | 'name' | 'material' | 'specification' | 'revision' | 'dimensionList' | 'model' | 'appearance' | 'assemblyAction'>;
export function toLibraryMatch({ partNumber, name, material, specification, revision, dimensionList, model, appearance, assemblyAction }: LibraryPart): LibraryMatch {
  return { partNumber, name, material, specification, revision, dimensionList, ...(model ? { model } : {}), ...(appearance ? { appearance } : {}), ...(assemblyAction ? { assemblyAction } : {}) };
}

export const normalizeLibraryNumber = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
export const libraryAssetUrl = (asset: LibraryAsset) => LIBRARY_URL + '/asset/' + encodeURIComponent(asset.key);
export const LIBRARY_MODEL_KEY = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}\.glb$/;
import type { ModelAppearance } from './modelAppearance';

