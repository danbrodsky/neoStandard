require('dotenv').config()
const STDLIB_TOKEN = process.env.STDLIB_TOKEN;
const STDLIB_USER= process.env.STDLIB_USER;

const NEO4J_USER= process.env.NEO4J_USER;
const NEO4J_PASS = process.env.NEO4J_PASS;
const NEO4J_URI = process.env.NEO4J_URI;

const neo4j = require('neo4j-driver').v1;

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));


const lib = require('lib')({token: STDLIB_TOKEN});
const fs = require('fs');

const { lstatSync, readdirSync  } = require('fs')
const { join  } = require('path')

const isDirectory = source => lstatSync(source).isDirectory()

const getDirectories = source =>
    readdirSync(source).map(name => join(source, name)).filter(isDirectory)

const getFilesInDir = source =>
    readdirSync(source).map(name => join(source, name))

const getServiceNames = source =>
    getDirectories(source).map(name => name.split('/')[1])

const getFunctionPaths = (source, services) => {
    var functionPaths = [];
    services.forEach((s) => {
        functionPaths = functionPaths.concat(getFilesInDir(`${source}/${s}/functions/`));
    })
    return functionPaths;
}

function sendQuery(query, params) {

    var session = driver.session();

    return new Promise((resolve, reject) => {

        const resultPromise = session.run(
            query,
            params
        );

        resultPromise.then(result => {
            session.close();

            resolve(result);

        }).catch(error => {
            session.close()
            console.log("error running query: " + error);
            reject(result);
        })

    })
}

function createNode(nodeName, nodeType, nodeData) {
    return new Promise(resolve => {
        sendQuery(
            `CREATE (:${nodeType} {name: $name}) RETURN "${nodeName}"`,
            {name: nodeName}
        ).then(() => resolve());
    });
}

function createRelation(fromNode, toNode, relation) {

    return new Promise(resolve => {
        sendQuery(
            `MATCH (a),(b)
        WHERE a.name = "${fromNode}" AND NOT (a)-->() AND b.name = "${toNode}"
        CREATE (a)-[:${relation}]->(b)`
        ).then(() => resolve());
    });
}


function createFunction(fn, type, data) {
    return new Promise(resolve => {
        createNode(fn, type, "").then(() => {
            createRelation(fn, data.service, "IN").then(() => {
                resolve();
            })
        })
    })
}

async function serviceExists(nodeName) {
    let result = await sendQuery(
        `MATCH (n) WHERE n.name = "${nodeName}" RETURN count(n) > 0 as n`
    );
    return new Promise((resolve) => {
        resolve(result.records[0]._fields[0]);
    })
}

async function functionExists(fn, srv) {

    let result = await sendQuery(
        `MATCH (n:function)-[:IN]->(s:service) WHERE n.name = "${fn}"
         AND s.name = "${srv}"
        RETURN count(n) > 0 as n`
    );
    return new Promise((resolve) => {
        resolve(result.records[0]._fields[0]);
    })
}

async function parseAllServices() {

    // create service nodes if they don't already exist
    const serviceNames = getServiceNames('./' + STDLIB_USER);
    for (const service of serviceNames){
        let exists = await serviceExists(service);
        if (!exists){
            console.log("adding service");
            createNode(service, "service", "");
        }
    }

    // create function nodes found in services
    const functionNames = getFunctionPaths('./' + STDLIB_USER, serviceNames);
    console.log(functionNames);
    for (const fnPath of functionNames){
        console.log(fnPath);
        let fn = fnPath.split('/')[3];
        let srv = fnPath.split('/')[1];
        let exists = await functionExists(fn, srv);
        if (!exists){
            console.log(fn + "doesn't exist");
            console.log("adding function");
            await createFunction(fn, "function", {service: srv});
        }
    }
}

function main() {
    parseAllServices();
}

main();
