import { singleton } from 'tsyringe';
import Firebase from '../database/Firebase';
import { Token } from '@infinityxyz/lib/types/core';
import { Transform } from 'stream';

@singleton()
export default class TokenDao {
  private readonly firebase: Firebase;

  constructor(firebase: Firebase) {
    this.firebase = firebase;
  }

  async getToken(chainId: string, address: string, tokenId: string): Promise<Token | undefined> {
    const tokenDoc = this.firebase.getTokenDocRef(chainId, address, tokenId);

    const snapshot = await tokenDoc.get();

    const data = snapshot.data();

    return data as Token | undefined;
  }

  async getAllTokens(chainId: string, address: string): Promise<Array<Partial<Token>>> {
    const tokensCollection = this.firebase.getTokensCollectionRef(chainId, address);

    const snapshot = await tokensCollection.get();

    const tokens: Array<Partial<Token>> = [];
    for (const doc of snapshot.docs) {
      tokens.push(doc.data() as Partial<Token>);
    }

    return tokens;
  }

  streamTokens(chainId: string, address: string): AsyncIterable<Partial<Token>> {
    const tokensCollection = this.firebase.getTokensCollectionRef(chainId, address);

    const stream = tokensCollection.stream();

    const tokenStream = stream.pipe(new Transform({
      transform(chunk, encoding, callback) {
        const token = (chunk as FirebaseFirestore.QueryDocumentSnapshot).data(); 
        this.push(token);
        callback();
      },
      objectMode: true
    }));
  
    return tokenStream;
  }
}
