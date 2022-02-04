import { INFURA_IPFS_PROJECT_SECRET, INFURA_IPFS_PROJECT_ID } from '../constants';
import got, { Got, Options, Response } from 'got/dist/source';
import PQueue from 'p-queue';

enum Protocol {
  HTTPS = 'https:',
  HTTP = 'http:',
  IPFS = 'ipfs:'
}

const infuraApiKey = Buffer.from(`${INFURA_IPFS_PROJECT_ID}:${INFURA_IPFS_PROJECT_SECRET}`).toString('base64');
const infuraAuth = `Basic ${infuraApiKey}`;

type RequestTransformer = ((options: Options) => void) | null;
interface MetadataClientOptions {
  concurrency: number;
  protocols: Record<Protocol, RequestTransformer>;
}

export const config: MetadataClientOptions = {
  concurrency: 30,
  protocols: {
    [Protocol.IPFS]: (options: Options) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const url = new URL(options.url!);
      options.method = 'post';
      const cid = url.host;
      const id = url.pathname;
      const domain = 'https://ipfs.infura.io:5001/api/v0/cat?arg=';
      options.url = new URL(`${domain}${cid}${id}`);
      options.headers = {
        Authorization: infuraAuth
      };
    },
    [Protocol.HTTP]: null,
    [Protocol.HTTPS]:  null
  }
};

/**
 * TODO we should handle concurrency separately for http/https urls
 */
export default class MetadataClient {
  private readonly client: Got;

  /**
   * we only use one 
   */
  private readonly queue: PQueue;

  constructor() {
    this.queue = new PQueue({
      concurrency: config.concurrency
    });

    this.client = got.extend({
      timeout: 10_000,
      throwHttpErrors: false,
      cache: false,
      hooks: {
        init: [
          (options) => {
            if (!options.url) {
              throw new Error('Url must be set in options object to use this client');
            }
            const url = new URL(options.url);
            const protocol = url.protocol.toLowerCase();
            const transform = config.protocols[protocol as Protocol];
            if(typeof transform === 'function') {
              transform(options);
            }else if (transform !== null) {
              throw new Error(`Invalid protocol: ${protocol}`)
            }
          }
        ]
      }
    });
  }

  async getMetadata(url: string | URL, attempts = 0): Promise<unknown> {
    attempts += 1;
    try {
      const response: Response = await this.queue.add(async () => {
        /**
         * you have to set the url in options for it to be defined in the init hook 
         */
        return await this.client({ url }); 
      });

      switch (response.statusCode) {
        case 200:
          return response.body;

        case 429:
          throw new Error('Rate limited');

        default:
          throw new Error(`Unknown error. Status code: ${response.statusCode}`);
      }
    } catch (err) {
      if (attempts > 3) {
        throw err;
      }
      return await this.getMetadata(url, attempts);
    }
  }
}
