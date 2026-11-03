import type { SyncMessage } from '@actual-app/sync-server/src/storage/types';
import { messagesSql, syncGroup } from '@actual-app/sync-server/src/sync-core';
import { DurableObject } from 'cloudflare:workers';

import { WrappedDatabase } from './db';

/**
 * One sync group's CRDT messages and merkle trie: the Durable Object
 * equivalent of a `group-<id>.sqlite` file. Requests to a group are handled
 * one at a time, so the read-modify-write of the merkle trie can't race.
 */
export class SyncGroup extends DurableObject<Env> {
  #db: WrappedDatabase;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.#db = new WrappedDatabase(() => ctx.storage);
  }

  #ensureSchema() {
    const table = this.#db.first(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'messages_binary'",
    );
    if (!table) {
      this.#db.exec(messagesSql);
    }
  }

  sync(messages: SyncMessage[], since: string) {
    this.#ensureSchema();
    return syncGroup(this.#db, messages, since);
  }

  async deleteAll() {
    await this.ctx.storage.deleteAll();
  }
}
