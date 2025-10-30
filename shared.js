export const GRAPHQL_PORT = 10102;
export const GRAPHQL_PATH = "/graphql";
export const GRAPHQL_SUBSCRIPTION_PORT = 10103;
export const GRAPHQL_SUBSCRIPTION_PATH = "/subscriptions";

export const transactionSchema = {
  title: "transaction schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string" },
    student_number: { type: "string" },
    id_card_base64: { type: "string" },
    register_type: { type: "string" },
    status: { type: "string" },
    door_permission: { type: "string" },
    server_created_at: { type: "string" },
    server_updated_at: { type: "string" },
    client_created_at: { type: "string" },
    client_updated_at: { type: "string" },
    diff_time_create: { type: "string" },
    diff_time_update: { type: "string" },
  },
  required: [
    "id",
    "name",
    "student_number",
    "id_card_base64",
    "register_type",
    "status",
    "door_permission",
    "client_created_at",
  ],
};

export const doorSchema = {
  title: "door schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string" },
    server_created_at: { type: "string" },
    server_updated_at: { type: "string" },
    client_created_at: { type: "string" },
    client_updated_at: { type: "string" },
    diff_time_create: { type: "string" },
    diff_time_update: { type: "string" },
    status: { type: "string" },
    max_persons: { type: "integer" },
    current_persons: { type: "integer" },
  },
  required: [
    "id",
    "name",
    "client_created_at",
    "status",
    "max_persons",
  ],
};

export const handshakeSchema = {
  title: "handshake schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    transaction_id: { type: "string" },
    handshake: { type: "string" },
    events: { type: "string" },
    server_created_at: { type: "string" },
    server_updated_at: { type: "string" },
    client_created_at: { type: "string" },
    client_updated_at: { type: "string" },
    diff_time_create: { type: "string" },
    diff_time_update: { type: "string" },
  },
  required: [
    "id",
    "transaction_id",
    "handshake",
    "events",
    "client_created_at",
  ],
};

export const logClientSchema = {
  title: "log client schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    client_id: { type: "string" },
    type: { type: "string" },
    status: { type: "string" },
    meta_data: { type: "string" },
    server_created_at: { type: "string" },
    server_updated_at: { type: "string" },
    client_created_at: { type: "string" },
    diff_time_create: { type: "string" },
  },
  required: ["id", "client_created_at", "client_id", "type", "status"],
};


export const graphQLSchema = `type CheckPoint {
  id: String!
  server_updated_at: String!
}

input CheckPointInput {
  id: String!
  server_updated_at: String!
}

type Door {
  client_created_at: String!
  client_updated_at: String
  current_persons: Float
  deleted: Boolean!
  diff_time_create: String!
  diff_time_update: String
  id: String!
  max_persons: Float!
  name: String!
  server_created_at: String!
  server_updated_at: String
  status: String!
}

input DoorInput {
  client_created_at: String!
  client_updated_at: String
  current_persons: Float
  deleted: Boolean!
  diff_time_create: String
  diff_time_update: String
  id: String!
  max_persons: Float!
  name: String!
  server_created_at: String
  server_updated_at: String
  status: String!
}

input DoorInputPushRow {
  assumedMasterState: DoorInput
  newDocumentState: DoorInput!
}

input DoorPull {
  checkpoint: CheckPointInput!
  limit: Float!
}

type DoorPullBulk {
  checkpoint: CheckPoint!
  documents: [Door!]!
}

type Handshake {
  client_created_at: String!
  client_updated_at: String
  deleted: Boolean!
  diff_time_create: String!
  diff_time_update: String
  events: String!
  handshake: String!
  id: String!
  server_created_at: String!
  server_updated_at: String
  transaction_id: String!
}

input HandshakeInput {
  client_created_at: String!
  client_updated_at: String
  deleted: Boolean!
  diff_time_create: String
  diff_time_update: String
  events: String!
  handshake: String!
  id: String!
  server_created_at: String
  server_updated_at: String
  transaction_id: String!
}

input HandshakeInputPushRow {
  assumedMasterState: HandshakeInput
  newDocumentState: HandshakeInput!
}

input HandshakePull {
  checkpoint: CheckPointInput!
  limit: Float!
}

type HandshakePullBulk {
  checkpoint: CheckPoint!
  documents: [Handshake!]!
}

type LogClient {
  client_created_at: String!
  client_id: String!
  deleted: Boolean!
  diff_time_create: String!
  id: String!
  meta_data: String
  server_created_at: String!
  server_updated_at: String!
  status: String!
  type: String!
}

input LogClientInput {
  client_created_at: String!
  client_id: String!
  deleted: Boolean!
  diff_time_create: String
  id: String!
  meta_data: String
  server_created_at: String
  server_updated_at: String
  status: String!
  type: String!
}

input LogClientInputPushRow {
  assumedMasterState: LogClientInput
  newDocumentState: LogClientInput!
}

input LogClientPull {
  checkpoint: CheckPointInput!
  limit: Float!
}

type LogClientPullBulk {
  checkpoint: CheckPoint!
  documents: [LogClient!]!
}

type Mutation {
  pushDoors(input: [DoorInputPushRow!]!): [Door!]!
  pushHandshake(input: [HandshakeInputPushRow!]!): [Handshake!]!
  pushLogClients(input: [LogClientInputPushRow!]!): [LogClient!]!
  pushTransaction(input: [Transaction2InputPushRow!]!): [Transaction2!]!
}

type Query {
  pullDoors(input: DoorPull!): DoorPullBulk!
  pullHandshake(input: HandshakePull!): HandshakePullBulk!
  pullLogClients(input: LogClientPull!): LogClientPullBulk!
  pullTransaction(input: Transaction2Pull!): Transaction2PullBulk!
}

type Subscription {
  streamDoor: DoorPullBulk!
  streamHandshake: HandshakePullBulk!
  streamLogClients: LogClientPullBulk!
  streamTransaction2: Transaction2PullBulk!
}

type Transaction2 {
  client_created_at: String!
  client_updated_at: String
  deleted: Boolean!
  diff_time_create: String!
  diff_time_update: String
  door_permission: String!
  id: String!
  id_card_base64: String!
  name: String!
  register_type: String!
  server_created_at: String!
  server_updated_at: String
  status: String!
  student_number: String!
}

input Transaction2Input {
  client_created_at: String!
  client_updated_at: String
  deleted: Boolean!
  diff_time_create: String
  diff_time_update: String
  door_permission: String!
  id: String!
  id_card_base64: String!
  name: String!
  register_type: String!
  server_created_at: String
  server_updated_at: String
  status: String!
  student_number: String!
}

input Transaction2InputPushRow {
  assumedMasterState: Transaction2Input
  newDocumentState: Transaction2Input!
}

input Transaction2Pull {
  checkpoint: CheckPointInput!
  limit: Float!
  where: Transaction2PullWhere
}

type Transaction2PullBulk {
  checkpoint: CheckPoint!
  documents: [Transaction2!]!
}

input Transaction2PullWhere {
  door_id: String
  status: String
}
`;
