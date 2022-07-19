/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import 'reflect-metadata';
import { Erc721Token } from '@infinityxyz/lib/types/core';
import { firestoreConstants, getCollectionDocId } from '@infinityxyz/lib/utils';
import { firebase } from 'container';
import { firestore } from 'firebase-admin';
import { QuerySnapshot } from 'firebase-admin/firestore';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import BatchHandler from 'models/BatchHandler';
import path from 'path';

const db = firebase.db;

const errorFile = path.join(__dirname, 'errors.txt');

let totalColls = 0;
let totalNfts = 0;

export async function deleteExtraAttrFields() {
  // fetch collections from firestore
  console.log('============================== Fetching collections from firestore =================================');
  let startAfter = '';
  const offsetFile = path.join(__dirname, 'offset.txt');
  if (existsSync(offsetFile)) {
    startAfter = readFileSync(offsetFile, 'utf8');
  }
  const limit = 10;
  let done = false;
  while (!done) {
    const colls = await db
      .collection(firestoreConstants.COLLECTIONS_COLL)
      .orderBy('address', 'asc')
      .startAfter(startAfter)
      .limit(limit)
      .get();
    console.log('================ START AFTER ===============', startAfter, colls.size);
    writeFileSync(offsetFile, `${startAfter}`);

    // update cursor
    startAfter = colls.docs[colls.size - 1].get('address');

    // break condition
    if (colls.size < limit) {
      done = true;
    }
    await runAFew(colls);
  }
}

async function runAFew(colls: QuerySnapshot) {
  try {
    for (const coll of colls.docs) {
      const data = coll.data();
      if (!data.address) {
        console.error('Address is null for collection', coll);
        continue;
      }
      const collectionDocId = getCollectionDocId({ chainId: data.chainId, collectionAddress: data.address });
      const nftCollRef = db
        .collection(firestoreConstants.COLLECTIONS_COLL)
        .doc(collectionDocId)
        .collection(firestoreConstants.COLLECTION_NFTS_COLL);
      await run(data.address, nftCollRef);
    }
  } catch (e) {
    console.error('Error running a few', e);
  }
}

async function run(collection: string, nftCollRef: firestore.CollectionReference) {
  try {
    totalColls++;
    console.log('Updating nfts for', collection, '....');
    const fsBatchHandler = new BatchHandler();
    const limit = 500;
    let cursor = '';
    let done = false;
    let totalFetchedSoFar = 0;
    while (!done) {
      try {
        const nfts = await nftCollRef.orderBy('tokenId', 'asc').limit(limit).startAfter(cursor).get();
        totalFetchedSoFar += nfts.size;
        totalNfts += nfts.size;
        console.log('Total fetched so far', totalFetchedSoFar);

        // update cursor
        cursor = nfts.docs[nfts.size - 1].get('tokenId');

        // write to firestore
        updateDataInFirestore(nftCollRef, nfts, fsBatchHandler);
        done = nfts.size < limit;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }

    // write batch
    fsBatchHandler
      .flush()
      .then(() => {
        console.log(`===================== Finished removing zora images for collection ${collection} ========================`);
        console.log(`Total colls so far: ${totalColls}`);
        console.log(`Total nfts so far: ${totalNfts}`);
      })
      .catch((e) => {
        console.error('Error removing zora images for collection', collection, e);
        appendFileSync(errorFile, `${collection}\n`);
      });
  } catch (e) {
    console.error('Error in running collection', collection, e);
    appendFileSync(errorFile, `${collection}\n`);
  }
}

function updateDataInFirestore(nftsCollRef: firestore.CollectionReference, nfts: QuerySnapshot, fsBatchHandler: BatchHandler) {
  for (const nft of nfts.docs) {
    // update asset in collection/nfts collection
    const data = nft.data() as Erc721Token;
    const tokenId = data?.tokenId;
    if (data && tokenId) {
      const tokenRef = nftsCollRef.doc(tokenId);
      const newAttrs = (data.metadata?.attributes ?? []).map((attr) => ({
        trait_type: attr.trait_type ?? (attr as any).traitType,
        value: attr.value
      }));
      fsBatchHandler.add(tokenRef, { metadata: { attributes: newAttrs } }, { merge: true });
    }
  }
}

void deleteExtraAttrFields();
