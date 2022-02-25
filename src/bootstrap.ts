import 'reflect-metadata';
import { Env, getEnv } from './utils';
import { main as dev } from './script';
import { main as cli } from './cli';
// import { main as server } from './server';
import { main as background } from './background';
import { START_UP_MESSAGE } from './constants';
import { logger } from './container';
import { CollectionQueueMonitor } from './models/CollectionQueueMonitor';

async function bootstrap(): Promise<void> {
  const env = getEnv();

  logger.log(START_UP_MESSAGE);

  background();

  switch (env) {
    case Env.Cli:
      await cli();
      return;
    case Env.Script:
      await dev();
      return;
    case Env.Serve:
      // await server();
      return;
    case Env.Queue:
      // start a collection queue monitor
      new CollectionQueueMonitor().start();
      return;
    default:
      throw new Error(`Env not bootstrapped ${env}`);
  }
}

void bootstrap();
