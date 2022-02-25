/* eslint-disable @typescript-eslint/no-unused-vars */
import BatchHandler from './models/BatchHandler';
import { CreationFlow } from './models/Collection';
import { Collection } from 'types/Collection.interface';
import { collectionDao, firebase, logger } from './container';

import { buildCollections } from './scripts/buildCollections';
import { CollectionQueueMonitor } from './models/CollectionQueueMonitor';

// eslint-disable-next-line @typescript-eslint/require-await
export async function main(): Promise<void> {
  try {
    /**
     * must be run to add numOwnersUpdatedAtAndDataExported fields to existing collections
     * that don't yet have these fields
     */
    // await addNumOwnersUpdatedAtAndDataExportedFields();
    // await buildCollections();
    // await collectionDao.getCollectionsSummary();
    
    // await addQueuePropertiesToCollections();

    const queue = new CollectionQueueMonitor();

    await queue.logCollectionErrors();

  } catch (err) {
    logger.error(err);
  }
}
