/* eslint-disable @typescript-eslint/no-unused-vars */
import { logger } from './container';
import path from 'path';
import fs, { read } from 'fs';
import { readFile } from 'fs/promises';
import got from 'got/dist/source';

// eslint-disable-next-line @typescript-eslint/require-await
export async function main(): Promise<void> {
  try {
    const address = '0xce25e60a89f200b1fa40f6c313047ffe386992c3';
    const chainId = '1';

    const file = path.resolve('./results.json');
    const data = await readFile(file, 'utf8');
    const collections = JSON.parse(data);
    for (const collection of collections) {
      logger.log(collection);
      await got.post({
        url: 'https://nft-collection-service-dot-nftc-dev.ue.r.appspot.com/collection',
        json: collection
      });
    }
  } catch (err) {
    logger.error(err);
  }
}

export function flattener(): void {
  const file = path.join(__dirname, '../resultsbak.json');
  const data = fs.readFileSync(file, 'utf-8');
  const parsed = JSON.parse(data);
  const onlyObj = parsed[0];
  fs.appendFileSync('results.json', '[');
  for (const obj in onlyObj) {
    const val = onlyObj[obj];
    const datum = {
      address: val.address,
      chainId: val.chainId,
      hasBlueCheck: val.hasBlueCheck
    };
    if (datum.address && datum.chainId === '1' && String(datum.hasBlueCheck)) {
      fs.appendFileSync('results.json', JSON.stringify(datum) + ',');
    }
  }
  fs.appendFileSync('results.json', ']');
}
