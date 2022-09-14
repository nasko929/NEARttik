import express, {response} from 'express';
import ax from 'axios';

import pg from 'pg';
const { Client } = pg;

import nearAPI from 'near-api-js';
const { keyStores, connect, KeyPair } = nearAPI;

import {Contracts, LastReads} from './utils/fetch_contract_ids.js';

import cron from 'node-cron';

const app = express();
const axios = ax.create();
const port = 8012;

app.listen(port, () => {
    console.log("Server started at port " + port);
})

let contracts = new Contracts();
await contracts.load();

let lastReads = new LastReads();
await lastReads.load();

let transactions_to_process = {}
let logs_to_send = {}

const myKeyStore = new keyStores.InMemoryKeyStore();
const PRIVATE_KEY = "SECRET";
const keyPair = KeyPair.fromString(PRIVATE_KEY);
await myKeyStore.setKey("testnet", "dakov.testnet", keyPair);

const config = {
    keyStore: myKeyStore,
    networkId: "testnet",
    nodeUrl: "https://archival-rpc.testnet.near.org",
};

const nearConnection = await connect(config);

const account = await nearConnection.account("dakov.testnet");

const checkContract = () =>  {

    contracts.allContracts.forEach(contractId => {
        const query = `
        select * from public.transactions
        where receiver_account_id = '${contractId}'
        and block_timestamp > ${lastReads.lastReads[contractId]}
        `;
        console.log(query)
        client.query(query, (err, res) => {
            if (err) {
                console.error(err);
                return;
            }
            res.rows.forEach(row => {
                if (!(contractId in transactions_to_process)) {
                    transactions_to_process[contractId] = [];
                }
                transactions_to_process[contractId].push(row.transaction_hash)
                if (row.block_timestamp > lastReads.lastReads[contractId]) {
                    lastReads.lastReads[contractId] = row.block_timestamp;
                }
            })
            fetchLogs(contractId)
        });
    })
}

const fetchLogs = (contractId) => {
    if (contractId in transactions_to_process) {
        let transaction_hashes = [...transactions_to_process[contractId]]
        transactions_to_process[contractId] = []

        console.log("Transaction hashes to process: " + transaction_hashes)

        fetch_all_transactions(transaction_hashes, contractId).then((res, err) => {
            if (err) {
                console.log(err);
            }

            if (!(contractId in logs_to_send)) {
                logs_to_send[contractId] = []
            }

            logs_to_send[contractId] = [logs_to_send[contractId], res].flat(1);
            sendLogs(contractId)
        });
    }
}

const sendLogs = (contractId) => {
    if (contractId in logs_to_send) {
        let logs = [...logs_to_send[contractId]]
        logs_to_send[contractId] = []

        console.log("Logs to process: " + logs)

        for (const transaction of logs) {
            let newLogs = [];
            transaction.forEach((log) => {
                if (log.startsWith("QUERY:")) {
                    newLogs.push(JSON.parse(log.substring(6)))
                }
            })
            if (newLogs.length >= 1) {
                axios.post("http://localhost:8000/", newLogs)
                    .then((response) => {
                        response.data.forEach((queryResponse) => {
                            if ('callback' in queryResponse && queryResponse['callback']) {
                                console.log("OK: " + JSON.stringify(queryResponse.data) + " " + queryResponse.callback)
                                account.functionCall({
                                    contractId: contractId,
                                    methodName: queryResponse.callback,
                                    args: {
                                        response: queryResponse.data
                                    },
                                    gas: '300000000000000',
                                }).then((res) => {

                                }).catch((err) => console.log(err));
                            }
                        })
                    })
                    .catch((err) => {
                        if ('response' in err && 'data' in err['response'] &&
                            'callback' in err['response']['data'] && err['response']['data']['callback']) {
                            let callback_response = {
                                error: err['response']['data']['error']
                            }
                            console.log("Callback:" + callback_response + " " + err['response']['data']['callback'])
                            account.functionCall({
                                contractId: contractId,
                                methodName: err['response']['data']['callback'],
                                args: {
                                    response: callback_response
                                },
                                gas: '300000000000000',
                            }).then((res) => {

                            }).catch((err) => console.log(err));
                        }
                    })
            }
        }
    }
}

const client = new Client({
    host: 'testnet.db.explorer.indexer.near.dev',
    database: 'testnet_explorer',
    user: 'public_readonly',
    password: 'nearprotocol',
    port: 5432,
})

client.connect().then(function(err) {
    if (err) throw err;
    console.log("Connected to db!");
    const checkContractJob = cron.schedule('*/2 * * * * *', checkContract);
    checkContractJob.start();
});

async function fetch_all_transactions(transaction_hashes, contractId) {
    const txsStatusReceipts = await Promise.all(
        transaction_hashes.map(hash => nearConnection.connection.provider.txStatus(hash, contractId))
    );

    let logs = []

    txsStatusReceipts.forEach((receipt) => {
        receipt.receipts_outcome.forEach((outcome) => {
            if (outcome.outcome.logs.length >= 1) {
                let local_logs = [];
                outcome.outcome.logs.forEach((log) => {
                    local_logs.push(log);
                })
                logs.push(local_logs);
            }
        })
    })

    return logs
}
