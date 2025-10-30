import { initDB } from "./db.js";
import { replicateGraphQL } from "rxdb/plugins/replication-graphql";

const GRAPHQL_HTTP_URL = "http://localhost:3001/graphql";
const GRAPHQL_WS_URL = "ws://localhost:3001/graphql";

// ฟังก์ชันตรวจสอบการเชื่อมต่อ
async function checkConnection() {
  try {
    console.log("🔍 Checking connection to GraphQL server...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout 5 วินาที
    
    const response = await fetch(GRAPHQL_HTTP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __typename }' // Simple introspection query
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log("✅ Connection to GraphQL server successful!");
      return true;
    } else {
      console.warn("⚠️ GraphQL server responded with error:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Cannot connect to GraphQL server:", error.message);
    return false;
  }
}

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

export async function retryConnection() {
  const isConnected = await checkConnection();
  
  if (isConnected) {
    console.log("🔄 Connection restored! Starting replication...");
    return await startReplication();
  } else {
    console.log("❌ Still cannot connect to server.");
    return null;
  }
}

export async function startReplication() {
  const db = await initDB();

  // ตรวจสอบการเชื่อมต่อก่อน
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    console.warn("⚠️ Cannot connect to GraphQL server. Skipping replication setup.");
    console.log("📱 Running in offline mode - data will be stored locally only.");
    return {
      db,
      replications: null,
      isOfflineMode: true
    };
  }

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
  console.log("🔄 Setting up replication for all collections...");
  const replications = replicationConfigs.map((config) =>
    setupCollectionReplication(config.collection, config)
  );

  try {
    await Promise.all(
      replications.map((replication) => replication.awaitInitialReplication())
    );
    
    console.log("✅ All replications ready!");
  } catch (error) {
    console.error("❌ Error during initial replication:", error);
  }

  return {
    db,
    replications: {
      transaction: replications[0],
      door: replications[1],
      handshake: replications[2],
      logclient: replications[3],
    },
    isOfflineMode: false
  };
}