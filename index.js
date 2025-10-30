import express from "express";
import { graphqlHTTP } from "express-graphql";
import cors from "cors";
import { PubSub } from "graphql-subscriptions";
import { buildSchema, execute, subscribe } from "graphql";
import { WebSocketServer } from "ws";
import { initDB } from "./db.js";
import { useServer } from "graphql-ws/use/ws";
import { createServer } from "http";
import { startReplication } from "./replication.js";
import { GRAPHQL_PORT, GRAPHQL_PATH, graphQLSchema } from "./shared.js";

import { lastOfArray } from "rxdb";

function log(msg) {
  const prefix = "# GraphQL Server: ";
  if (typeof msg === "string") {
    console.log(prefix + msg);
  } else {
    console.log(prefix + JSON.stringify(msg, null, 2));
  }
}

function sortByUpdateAndPrimary(a, b) {
  if (Number(a.server_updated_at) > Number(b.server_updated_at)) return 1;
  if (Number(a.server_updated_at) < Number(b.server_updated_at)) return -1;

  if (Number(a.server_updated_at) === Number(b.server_updated_at)) {
    if (a.id > b.id) return 1;
    if (a.id < b.id) return -1;
    else return 0;
  }
}

export async function run() {
  const result = await startReplication();
  const db = result.db;
  const app = express();
  app.use(cors());

  console.log("Server side GraphQL Schema:");

  const schema = buildSchema(graphQLSchema);
  const pubsub = new PubSub();

  const root = {
    pullTransaction: async (args, request) => {
      const lastId = args.input.checkpoint ? args.input.checkpoint.id : "";
      const minUpdated = args.input.checkpoint
        ? args.input.checkpoint.server_updated_at
        : 0;
      let allDocs = [];
      if (!args.input.where) {
        allDocs = await db.transaction.find().exec();
      } else {
        let status = args.input.where.status ? args.input.where.status : "";
        let doorPermission = args.input.where.door_id
          ? args.input.where.door_id
          : "";
        allDocs = await db.transaction
          .find({
            selector: {
              door_permission: { $regex: doorPermission },
              status: { $regex: status },
            },
          })
          .exec();
      }
      const sortedDocs = allDocs
        .map((d) => d.toJSON())
        .sort((a, b) => sortByUpdateAndPrimary(a, b));
      const filtered = sortedDocs.filter((doc) => {
        if (!args.input.checkpoint) return true;
        if (Number(doc.server_updated_at) < Number(minUpdated)) return false;
        if (Number(doc.server_updated_at) > Number(minUpdated)) return true;
        if (Number(doc.server_updated_at) === Number(minUpdated)) {
          return doc.id > lastId;
        }
      });
      const limitedDocs = filtered.slice(0, args.input.limit);
      const last = lastOfArray(limitedDocs);
      const ret = {
        documents: limitedDocs,
        checkpoint: last
          ? {
              id: last.id,
              server_updated_at: last.server_updated_at,
            }
          : {
              id: lastId,
              server_updated_at: minUpdated,
            },
      };
      return ret;
    },
    pushTransaction: async (args, request) => {
      const rows = args.input;
      const writtenDocs = [];
      let lastCheckpoint = { id: "", server_updated_at: "0" };
      for (const row of rows) {
        const newDocs = row.newDocumentState;
        let newDoc;
        const existing = await db.transaction
          .findOne({ selector: { id: newDocs.id } })
          .exec();
        if (existing) {
          newDoc = {
            ...existing.toJSON(),
            status: newDocs.status,
            server_updated_at: Date.now().toString(),
            client_updated_at: row.newDocumentState.client_updated_at,
            diff_time_update: (
              Date.now() - Number(row.newDocumentState.client_updated_at)
            ).toString(),
          };
          await existing.patch(newDoc);
          writtenDocs.push(newDoc);
        } else {
          const studentIsExist = await db.transaction
            .find({
              selector: {
                student_number: newDocs.student_number,
                status: "IN",
              },
            })
            .exec();
          if (studentIsExist.length > 0) {
            throw new Error(
              `Student with student number ${newDocs.student_number} is already checked IN.`
            );
          }
          newDoc = {
            ...newDocs,
            server_created_at: Date.now().toString(),
            server_updated_at: Date.now().toString(),
            diff_time_create: (
              Date.now() - Number(row.newDocumentState.client_created_at)
            ).toString(),
          };
          await db.transaction.upsert(newDoc);
          writtenDocs.push(newDoc);
        }
        lastCheckpoint = {
          id: newDoc.id,
          server_updated_at: newDoc.server_updated_at,
        };
      }
      await pubsub.publish("streamTransaction2", {
        streamTransaction2: {
          documents: writtenDocs,
          checkpoint: lastCheckpoint,
        },
      });
      return writtenDocs;
    },
    streamTransaction2: async (args) => {
      return pubsub.asyncIterableIterator("streamTransaction2");
    },
    pullDoors: async (args, request) => {
      const lastId = args.input.checkpoint ? args.input.checkpoint.id : "";
      const minUpdated = args.input.checkpoint
        ? args.input.checkpoint.server_updated_at
        : 0;
      let allDocs = [];
      allDocs = await db.door.find().exec();
      const sortedDocs = allDocs
        .map((d) => d.toJSON())
        .sort((a, b) => sortByUpdateAndPrimary(a, b));
      const filtered = sortedDocs.filter((doc) => {
        if (!args.input.checkpoint) return true;
        if (Number(doc.server_updated_at) < Number(minUpdated)) return false;
        if (Number(doc.server_updated_at) > Number(minUpdated)) return true;
        if (Number(doc.server_updated_at) === Number(minUpdated)) {
          return doc.id > lastId;
        }
      });
      const limitedDocs = filtered.slice(0, args.input.limit);
      const last = lastOfArray(limitedDocs);
      const ret = {
        documents: limitedDocs,
        checkpoint: last
          ? {
              id: last.id,
              server_updated_at: last.server_updated_at,
            }
          : {
              id: lastId,
              server_updated_at: minUpdated,
            },
      };
      return ret;
    },
    pushDoors: async (args, request) => {
      const rows = args.input;
      const writtenDocs = [];
      let lastCheckpoint = { id: "", server_updated_at: "0" };
      for (const row of rows) {
        const newDocs = row.newDocumentState;
        let newDoc;
        const existing = await db.door
          .findOne({ selector: { id: newDocs.id } })
          .exec();

        if (existing) {
          newDoc = {
            ...existing.toJSON(),
            client_updated_at: row.newDocumentState.client_updated_at,
            server_updated_at: Date.now().toString(),
            diff_time_update: (
              Date.now() - Number(row.newDocumentState.client_updated_at)
            ).toString(),
          };
          await existing.patch(newDoc);
          writtenDocs.push(newDoc);
        } else {
          newDoc = {
            ...newDocs,
            server_created_at: Date.now().toString(),
            server_updated_at: Date.now().toString(),
            diff_time_create: (
              Date.now() - Number(row.newDocumentState.client_created_at)
            ).toString(),
          };
          await db.door.upsert(newDoc);
          writtenDocs.push(newDoc);
        }
        lastCheckpoint = {
          id: newDoc.id,
          server_updated_at: newDoc.server_updated_at,
        };
      }
      await pubsub.publish("streamDoor", {
        streamDoor: {
          documents: writtenDocs,
          checkpoint: lastCheckpoint,
        },
      });
      return writtenDocs;
    },
    streamDoor: async (args) => {
      return pubsub.asyncIterableIterator("streamDoor");
    },
    pullHandshake: async (args, request) => {
      const lastId = args.input.checkpoint ? args.input.checkpoint.id : "";
      const minUpdated = args.input.checkpoint
        ? args.input.checkpoint.server_updated_at
        : 0;
      let allDocs = [];
      allDocs = await db.handshake.find().exec();
      const sortedDocs = allDocs
        .map((d) => d.toJSON())
        .sort((a, b) => sortByUpdateAndPrimary(a, b));
      const filtered = sortedDocs.filter((doc) => {
        if (!args.input.checkpoint) return true;
        if (Number(doc.server_updated_at) < Number(minUpdated)) return false;
        if (Number(doc.server_updated_at) > Number(minUpdated)) return true;
        if (Number(doc.server_updated_at) === Number(minUpdated)) {
          return doc.id > lastId;
        }
      });
      const limitedDocs = filtered.slice(0, args.input.limit);
      const last = lastOfArray(limitedDocs);
      const ret = {
        documents: limitedDocs,
        checkpoint: last
          ? {
              id: last.id,
              server_updated_at: last.server_updated_at,
            }
          : {
              id: lastId,
              server_updated_at: minUpdated,
            },
      };
      return ret;
    },
    pushHandshake: async (args, request) => {
      const rows = args.input;
      const writtenDocs = [];
      let lastCheckpoint = { id: "", server_updated_at: "0" };
      for (const row of rows) {
        const newDocs = row.newDocumentState;
        let newDoc;
        const existing = await db.handshake
          .findOne({ selector: { id: newDocs.id } })
          .exec();
        if (existing) {
          let array = JSON.parse(existing.events);
          array.push(row.newDocumentState.events);
          newDoc = {
            ...existing.toJSON(),
            handshake:
              existing.handshake + `,${row.newDocumentState.handshake}`,
            events: JSON.stringify(array),
            client_updated_at: row.newDocumentState.client_updated_at,
            server_updated_at: Date.now().toString(),
            diff_time_update: (
              Date.now() - Number(row.newDocumentState.client_updated_at)
            ).toString(),
          };
          await existing.patch(newDoc);
          writtenDocs.push(newDoc);
        } else {
          let array = [];
          array.push(row.newDocumentState.events);
          array.push(
            JSON.stringify({
              type: "RECEIVE",
              at: Date.now().toString(),
              actor: "SERVER",
            })
          );
          console.log(array);
          console.log(JSON.stringify(array));
          newDoc = {
            ...newDocs,
            handshake: newDocs.handshake + `{"server": "ok"}`,
            events: array.toString(),
            server_created_at: Date.now().toString(),
            server_updated_at: Date.now().toString(),
            diff_time_create: (
              Date.now() - Number(row.newDocumentState.client_created_at)
            ).toString(),
          };
          await db.handshake.upsert(newDoc);
          writtenDocs.push(newDoc);
        }
        lastCheckpoint = {
          id: newDoc.id,
          server_updated_at: newDoc.server_updated_at,
        };
      }
      await pubsub.publish("streamHandshake", {
        streamHandshake: {
          documents: writtenDocs,
          checkpoint: lastCheckpoint,
        },
      });
      return writtenDocs;
    },
    streamHandshake: async (args) => {
      return pubsub.asyncIterableIterator("streamHandshake");
    },
    pullLogClients: async (args, request) => {
      const lastId = args.input.checkpoint ? args.input.checkpoint.id : "";
      const minUpdated = args.input.checkpoint
        ? args.input.checkpoint.server_updated_at
        : 0;
      let allDocs = [];
      allDocs = await db.logclient.find().exec();
      const sortedDocs = allDocs
        .map((d) => d.toJSON())
        .sort((a, b) => sortByUpdateAndPrimary(a, b));
      const filtered = sortedDocs.filter((doc) => {
        if (!args.input.checkpoint) return true;
        if (Number(doc.server_updated_at) < Number(minUpdated)) return false;
        if (Number(doc.server_updated_at) > Number(minUpdated)) return true;
        if (Number(doc.server_updated_at) === Number(minUpdated)) {
          return doc.id > lastId;
        }
      });
      const limitedDocs = filtered.slice(0, args.input.limit);
      const last = lastOfArray(limitedDocs);
      const ret = {
        documents: limitedDocs,
        checkpoint: last
          ? {
              id: last.id,
              server_updated_at: last.server_updated_at,
            }
          : {
              id: lastId,
              server_updated_at: minUpdated,
            },
      };
      return ret;
    },
    pushLogClients: async (args, request) => {
      const rows = args.input;
      const writtenDocs = [];
      let lastCheckpoint = { id: "", server_updated_at: "0" };
      for (const row of rows) {
        const newDocs = row.newDocumentState;
        let newDoc;
        const existing = await db.logclient
          .findOne({ selector: { id: newDocs.id } })
          .exec();

        if (existing) {
          throw new Error(`LogClient with id ${newDocs.id} already exists.`);
        } else {
          newDoc = {
            ...newDocs,
            server_created_at: Date.now().toString(),
            server_updated_at: Date.now().toString(),
            diff_time_create: (
              Date.now() - Number(row.newDocumentState.client_created_at)
            ).toString(),
          };
          await db.logclient.upsert(newDoc);
          writtenDocs.push(newDoc);
        }
        lastCheckpoint = {
          id: newDoc.id,
          server_updated_at: newDoc.server_updated_at,
        };
      }
      await pubsub.publish("streamLogClients", {
        streamLogClients: {
          documents: writtenDocs,
          checkpoint: lastCheckpoint,
        },
      });
      console.log(writtenDocs);
      return writtenDocs;
    },
    streamLogClients: async (args) => {
      return pubsub.asyncIterableIterator("streamLogClients");
    },
  };
  const httpServer = createServer(app);
  app.use(
    GRAPHQL_PATH,
    graphqlHTTP({
      schema: schema,
      rootValue: root,
      graphiql: true,
    })
  );
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: GRAPHQL_PATH,
  });

  useServer(
    {
      schema,
      execute,
      subscribe,
      roots: {
        subscription: {
          streamTransaction2: root.streamTransaction2,
          streamDoor: root.streamDoor,
          streamHandshake: root.streamHandshake,
          streamLogClients: root.streamLogClients,
        },
      },
      onConnect: async (ctx) => {
        let door_id = ctx.connectionParams.door_id;
        const existing = await db.door
          .findOne({ selector: { id: door_id } })
          .exec();
        if (existing) {
          existing.status = "ONLINE";
          existing.patch(existing);
        }
        console.log(door_id," door online");
      },
      onDisconnect: async (ctx, code, reason) => {
        let door_id = ctx.connectionParams.door_id;
        const existing = await db.door
          .findOne({ selector: { id: door_id } })
          .exec();
        if (existing) {
          existing.status = "OFFLINE";
          existing.patch(existing);
        }
        console.log(door_id," door offline");
      },
    },
    wsServer
  );

  // Start server
  httpServer.listen(GRAPHQL_PORT, () => {
    log(
      "Started GraphQL HTTP endpoint at http://localhost:" +
        GRAPHQL_PORT +
        GRAPHQL_PATH
    );
    log(
      "Started GraphQL WebSocket endpoint at ws://localhost:" +
        GRAPHQL_PORT +
        GRAPHQL_PATH
    );
  });
}

run();
