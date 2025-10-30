import { createRxDatabase, addRxPlugin } from "rxdb/plugins/core";
import {
  getRxStorageSQLiteTrial,
  getSQLiteBasicsNode,
} from "rxdb/plugins/storage-sqlite";
import sqlite3 from "sqlite3";
import { RxDBCleanupPlugin } from "rxdb/plugins/cleanup";
import {
  transactionSchema,
  doorSchema,
  handshakeSchema,
  logClientSchema,
} from "./shared.js";
addRxPlugin(RxDBCleanupPlugin);
export async function initDB() {
  const db = await createRxDatabase({
    name: "humansdb.sqlite",
    storage: getRxStorageSQLiteTrial({
      sqliteBasics: getSQLiteBasicsNode(sqlite3),
    }),
    multiInstance: false, // Node.js
  });
  await db.addCollections({
    transaction: { schema: transactionSchema },
    door: { schema: doorSchema },
    handshake: { schema: handshakeSchema },
    logclient: { schema: logClientSchema },
  });
  return db;
}
