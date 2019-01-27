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
const getServiceNames = source =>
    getDirectories(source).map(name => name.split('/')[1])


function sendQuery(query, params) {

    var session = driver.session();

    return new Promise((resolve, reject) => {

        const resultPromise = session.run(
            query,
            params
        );

        resultPromise.then(result => {
            session.close();

            console.log("query successful");
            resolve(result);

        }).catch(error => {
            session.close()
            console.log("error running query: " + error);
            reject(result);
        })

    })
}

function createNode(nodeName, nodeType, nodeData) {

        sendQuery(
            `CREATE (${nodeName}:${nodeType} {name: $name}) RETURN ${nodeName}`,
            {name: nodeName}
        );
}

async function nodeExists(nodeName){
    let result = await sendQuery(
        `MATCH (n) WHERE n.name = "${nodeName}" RETURN count(n) > 0 as n`
    );
    console.log(Boolean(result.records[0]._fields[0]));

    return result.records[0]._fields[0] ? false : true;
}

function parseAllServices() {

    const serviceNames = getServiceNames('./' + STDLIB_USER);
    serviceNames.forEach( (service) => {
        if (nodeExists(service))
            createNode(service, "service", "");
    })
}

function main() {
    parseAllServices();
}

main();
