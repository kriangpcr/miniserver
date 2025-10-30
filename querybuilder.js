// =====================================================
// TRANSACTION QUERY BUILDERS
// =====================================================
export const pullTransactionQueryBuilder = (checkpoint, limit) => {
  if (!checkpoint) {
    checkpoint = {
      id: "",
      server_updated_at: "0",
    };
  }
  const query = `
    query PullTransaction($checkpoint: CheckPointInput!, $limit: Float!) {
      pullTransaction(input: { checkpoint: $checkpoint, limit: $limit }) {
        documents {
          client_created_at
          client_updated_at
          deleted
          diff_time_create
          diff_time_update
          door_permission
          id
          id_card_base64
          name
          register_type
          server_created_at
          server_updated_at
          status
          student_number
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return {
    query,
    operationName: "PullTransaction",
    variables: { checkpoint, limit },
  };
};

export const pushTransactionQueryBuilder = (rows) => {
  const query = `
    mutation PushTransaction($writeRows: [Transaction2InputPushRow!]!) {
      pushTransaction(input: $writeRows) {
        client_created_at
        client_updated_at
        deleted
        diff_time_create
        diff_time_update
        door_permission
        id
        id_card_base64
        name
        register_type
        server_created_at
        server_updated_at
        status
        student_number
      }
    }
  `;
  return {
    query,
    operationName: "PushTransaction",
    variables: { writeRows: rows },
  };
};

export const pullStreamTransactionQueryBuilder = () => {
  const query = `
    subscription StreamTransaction2 {
      streamTransaction2 {
        documents {
          client_created_at
          client_updated_at
          deleted
          diff_time_create
          diff_time_update
          door_permission
          id
          id_card_base64
          name
          register_type
          server_created_at
          server_updated_at
          status
          student_number
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return { query };
};

// =====================================================
// DOOR QUERY BUILDERS
// =====================================================
export const pullDoorQueryBuilder = (checkpoint, limit) => {
  if (!checkpoint) {
    checkpoint = {
      id: "",
      server_updated_at: "0",
    };
  }
  const query = `
    query PullDoors($checkpoint: CheckPointInput!, $limit: Float!) {
      pullDoors(input: { checkpoint: $checkpoint, limit: $limit }) {
        documents {
          client_created_at
          client_updated_at
          current_persons
          deleted
          diff_time_create
          diff_time_update
          id
          max_persons
          name
          server_created_at
          server_updated_at
          status
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return {
    query,
    operationName: "PullDoors",
    variables: { checkpoint, limit },
  };
};

export const pushDoorQueryBuilder = (rows) => {
  const query = `
    mutation PushDoors($writeRows: [DoorInputPushRow!]!) {
      pushDoors(input: $writeRows) {
        client_created_at
        client_updated_at
        current_persons
        deleted
        diff_time_create
        diff_time_update
        id
        max_persons
        name
        server_created_at
        server_updated_at
        status
      }
    }
  `;
  return {
    query,
    operationName: "PushDoors",
    variables: { writeRows: rows },
  };
};

export const pullStreamDoorQueryBuilder = () => {
  const query = `
    subscription StreamDoor {
      streamDoor {
        documents {
          client_created_at
          client_updated_at
          current_persons
          deleted
          diff_time_create
          diff_time_update
          id
          max_persons
          name
          server_created_at
          server_updated_at
          status
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return { query };
};

// =====================================================
// HANDSHAKE QUERY BUILDERS
// =====================================================
export const pullHandshakeQueryBuilder = (checkpoint, limit) => {
  if (!checkpoint) {
    checkpoint = {
      id: "",
      server_updated_at: "0",
    };
  }
  const query = `
    query PullHandshake($checkpoint: CheckPointInput!, $limit: Float!) {
      pullHandshake(input: { checkpoint: $checkpoint, limit: $limit }) {
        documents {
          client_created_at
          client_updated_at
          deleted
          diff_time_create
          diff_time_update
          events
          handshake
          id
          server_created_at
          server_updated_at
          transaction_id
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return {
    query,
    operationName: "PullHandshake",
    variables: { checkpoint, limit },
  };
};

export const pushHandshakeQueryBuilder = (rows) => {
  const query = `
    mutation PushHandshake($writeRows: [HandshakeInputPushRow!]!) {
      pushHandshake(input: $writeRows) {
        client_created_at
        client_updated_at
        deleted
        diff_time_create
        diff_time_update
        events
        handshake
        id
        server_created_at
        server_updated_at
        transaction_id
      }
    }
  `;
  return {
    query,
    operationName: "PushHandshake",
    variables: { writeRows: rows },
  };
};

export const pullStreamHandshakeQueryBuilder = () => {
  const query = `
    subscription StreamHandshake {
      streamHandshake {
        documents {
          client_created_at
          client_updated_at
          deleted
          diff_time_create
          diff_time_update
          events
          handshake
          id
          server_created_at
          server_updated_at
          transaction_id
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return { query };
};

// =====================================================
// LOG CLIENT QUERY BUILDERS
// =====================================================
export const pullLogClientQueryBuilder = (checkpoint, limit) => {
  if (!checkpoint) {
    checkpoint = {
      id: "",
      server_updated_at: "0",
    };
  }
  const query = `
    query PullLogClients($checkpoint: CheckPointInput!, $limit: Float!) {
      pullLogClients(input: { checkpoint: $checkpoint, limit: $limit }) {
        documents {
          client_created_at
          client_id
          deleted
          diff_time_create
          id
          meta_data
          server_created_at
          status
          type
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return {
    query,
    operationName: "PullLogClients",
    variables: { checkpoint, limit },
  };
};

export const pushLogClientQueryBuilder = (rows) => {
  const query = `
    mutation PushLogClients($writeRows: [LogClientInputPushRow!]!) {
      pushLogClients(input: $writeRows) {
        client_created_at
        client_id
        deleted
        diff_time_create
        id
        meta_data
        server_created_at
        status
        type
      }
    }
  `;
  return {
    query,
    operationName: "PushLogClients",
    variables: { writeRows: rows },
  };
};

export const pullStreamLogClientQueryBuilder = () => {
  const query = `
    subscription StreamLogClients {
      streamLogClients {
        documents {
          client_created_at
          client_id
          deleted
          diff_time_create
          id
          meta_data
          server_created_at
          status
          type
        }
        checkpoint {
          id
          server_updated_at
        }
      }
    }
  `;
  return { query };
};