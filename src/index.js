const Promise = require('bluebird');
const express = require('express');
const http = require('http');
const { MongoClient } = require('mongodb');
const { ParseServer } = require('parse-server');


async function connectDB(databaseURI) {
    return MongoClient.connect(databaseURI, { useUnifiedTopology: true });
}

let parseServerState = {};

const dropDB = () => {
    const { mongoConnection } = parseServerState;
    return new Promise((resolve, reject) => {
        mongoConnection.db().dropDatabase((err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

/**
 * Starts the ParseServer instance
 * @param {Object} parseServerOptions Used for creating the `ParseServer`
 * @return {Promise} Runner state
 */
async function startParseServer(parseServerOptions = {}) {
    const mongodbPort = process.env.MONGODB_PORT || 27017;
    const {
        databaseName = 'parse-test',
        databaseURI = `mongodb://localhost:${mongodbPort}/${databaseName}`,
        masterKey = 'test',
        javascriptKey = 'test',
        appId = 'test',

        port = 30001,
        mountPath = '/1',
        serverURL = `http://localhost:${port}${mountPath}`,
    } = parseServerOptions;

    mongoConnection = await connectDB(databaseURI);

    parseServerOptions = Object.assign({
        masterKey, javascriptKey, appId,
        serverURL,
        databaseURI,
        silent: process.env.VERBOSE !== '1',
    }, parseServerOptions);
    const app = express();
    const parseServer = new ParseServer(parseServerOptions);

    app.use(mountPath, parseServer);

    const httpServer = http.createServer(app);

    Promise.promisifyAll(httpServer);

    await httpServer.listenAsync(port)
    Object.assign(parseServerState, {
        parseServer,
        httpServer,
        mongoConnection,
        expressApp: app,
        parseServerOptions,
    });
}

/**
 * Stops the ParseServer instance
 * @return {Promise}
 */
function stopParseServer() {
    const { httpServer } = parseServerState;
    return httpServer.closeAsync()
        .then(() => parseServerState = {});
}

module.exports = {
    dropDB,
    startParseServer,
    stopParseServer,
    parseServerState,
};

