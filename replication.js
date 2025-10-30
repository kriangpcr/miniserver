import { initDB } from "./db.js";
import { replicateGraphQL } from "rxdb/plugins/replication-graphql";

const GRAPHQL_HTTP_URL = "http://localhost:3001/graphql";
const GRAPHQL_WS_URL = "ws://localhost:3001/graphql";

import {
  pullTransactionQueryBuilder,
  pushTransactionQueryBuilder,
  pullStreamTransactionQueryBuilder,
  pullDoorQueryBuilder,
  pushDoorQueryBuilder,
  pullStreamDoorQueryBuilder,
  pullHandshakeQueryBuilder,
  pushHandshakeQueryBuilder,
  pullStreamHandshakeQueryBuilder,
  pullLogClientQueryBuilder,
  pushLogClientQueryBuilder,
  pullStreamLogClientQueryBuilder,
} from "./querybuilder.js";

// ฟังก์ชันสำหรับสร้าง replication ของแต่ละ collection
function setupCollectionReplication(collection, config) {
  const replication = replicateGraphQL({
    collection,
    url: {
      http: GRAPHQL_HTTP_URL,
      ws: GRAPHQL_WS_URL,
    },
    pull: {
      queryBuilder: config.pullQueryBuilder,
      batchSize: 50,
      modifier: (doc) => {
        Object.entries(doc).forEach(([key, value]) => {
          if (value === null && key !== "deleted") {
            delete doc[key];
          }
        });
        doc["deleted"] = doc["_deleted"];
        return doc;
      },
      streamQueryBuilder: config.pullStreamQueryBuilder,
      includeWsHeaders: true,
      wsOptions: {
        retryAttempts: 10,
        connectionParams: () => ({
          doorId: "123",
          deviceName: "ประตู 1",
        }),
      },
    },
    push: {
      queryBuilder: config.pushQueryBuilder,
      batchSize: 50,
      modifier: (doc) => doc,
    },
    deletedField: "deleted",
    live: true,
    retryTime: 1000 * 5,
    waitForLeadership: true,
    autoStart: true,
  });

  // Subscribe to events
  replication.error$.subscribe((err) => {
    console.error(`[${config.name} Replication Error]`, err);
  });
  replication.active$.subscribe((active) => {
    console.log(`[${config.name} Replication Active]`, active);
  });
  replication.received$.subscribe((doc) => {
    console.log(`[${config.name} Document Received]`, doc);
  });
  replication.sent$.subscribe((doc) => {
    console.log(`[${config.name} Document Sent]`, doc);
  });

  return replication;
}

export async function startReplication() {
  const db = await initDB();

  // กำหนด config สำหรับแต่ละตาราง
  const replicationConfigs = [
    {
      name: "transaction",
      collection: db.transaction,
      pullQueryBuilder: pullTransactionQueryBuilder,
      pushQueryBuilder: pushTransactionQueryBuilder,
      pullStreamQueryBuilder: pullStreamTransactionQueryBuilder,
    },
    {
      name: "door",
      collection: db.door,
      pullQueryBuilder: pullDoorQueryBuilder,
      pushQueryBuilder: pushDoorQueryBuilder,
      pullStreamQueryBuilder: pullStreamDoorQueryBuilder,
    },
    {
      name: "handshake",
      collection: db.handshake,
      pullQueryBuilder: pullHandshakeQueryBuilder,
      pushQueryBuilder: pushHandshakeQueryBuilder,
      pullStreamQueryBuilder: pullStreamHandshakeQueryBuilder,
    },
    {
      name: "logclient",
      collection: db.logclient,
      pullQueryBuilder: pullLogClientQueryBuilder,
      pushQueryBuilder: pushLogClientQueryBuilder,
      pullStreamQueryBuilder: pullStreamLogClientQueryBuilder,
    },
  ];

  const replications = replicationConfigs.map((config) =>
    setupCollectionReplication(config.collection, config)
  );

  await Promise.all(
    replications.map((replication) => replication.awaitInitialReplication())
  );

  console.log("✅ All replications ready!");

  return {
    db,
    replications: {
      transaction: replications[0],
      user: replications[1],
      product: replications[2],
      // เพิ่มตาม config ที่กำหนด
    },
  };
}