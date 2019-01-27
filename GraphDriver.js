require('dotenv').config()

const NEO4J_USER= process.env.NEO4J_USER;
const NEO4J_PASS = process.env.NEO4J_PASS;
const NEO4J_URI = process.env.NEO4J_URI;

const neo4j = require('neo4j-driver').v1;

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));


class GraphDriver {

    constructor() {}

    sendQuery(query, params) {

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

    createNode(nodeName, nodeType, nodeData) {
        return new Promise(resolve => {
            this.sendQuery(
                `CREATE (:${nodeType} {name: $name}) RETURN "${nodeName}"`,
                {name: nodeName}
            ).then(() => resolve());
        });
    }

    createRelation(fromNode, toNode, relation) {

        return new Promise(resolve => {
            this.sendQuery(
                `MATCH (a),(b)
        WHERE a.name = "${fromNode}" AND NOT (a)-->() AND b.name = "${toNode}"
        CREATE (a)-[:${relation}]->(b)`
            ).then(() => resolve());
        });
    }

    createFunction(fn, type, data) {
        return new Promise(resolve => {
            this.createNode(fn, type, "").then(() => {
                this.createRelation(fn, data.service, "IN").then(() => {
                    resolve();
                })
            })
        })
    }
}

module.exports = GraphDriver;
