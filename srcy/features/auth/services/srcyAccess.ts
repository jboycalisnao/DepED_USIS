import {
  clearStoredCoordinatorAccess,
  getStoredCoordinatorAccess,
  storeCoordinatorAccess,
  type CoordinatorAccessRecord,
} from '../../../../coordinator/features/auth/utils/coordinatorAccess';

export type SrcyAccessRecord = CoordinatorAccessRecord;

export const getStoredSrcyAccess = () => getStoredCoordinatorAccess();

export const storeSrcyAccess = (record: SrcyAccessRecord) => {
  storeCoordinatorAccess(record);
};

export const clearStoredSrcyAccess = () => {
  clearStoredCoordinatorAccess();
};
