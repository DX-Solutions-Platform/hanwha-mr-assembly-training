import type { ModelSpec } from '@/types/model';
import { PUMP_MODEL } from './pumpModel';
import { VEHICLE_MODEL } from './vehicleModel';
import { DRONE_MODEL } from './droneModel';
import { STOOL_MODEL } from './stoolModel';
import { AIRLINER_MODEL } from './airlinerModel';
import { SMARTPHONE_MODEL } from './smartphoneModel';

const MODEL_LIST: ModelSpec[] = [PUMP_MODEL, VEHICLE_MODEL, DRONE_MODEL, STOOL_MODEL, AIRLINER_MODEL, SMARTPHONE_MODEL];

/** 모델이 없는 교육(도면 신규)은 스텝 스툴 모델로 표시 */
export function getModelSpec(modelId: string): ModelSpec {
  return MODEL_LIST.find((model) => model.id === modelId) ?? STOOL_MODEL;
}
