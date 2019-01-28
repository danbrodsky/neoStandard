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

    async createNode(nodeName, nodeType, nodeData) {
        let exists = await this.serviceExists(nodeName);
        if (!exists){
            this.sendQuery(
                `CREATE (:${nodeType} {name: $name}) RETURN "${nodeName}"`,
                {name: nodeName}
            ).then(() => {return;})
        }
    }

    createCommonRelation(fromNode, toNode, relation) {

        return new Promise(resolve => {
            this.sendQuery(
                `MATCH (a),(b)
        WHERE a.name = "${fromNode}" AND b.name = "${toNode}"
        CREATE (a)-[:${relation}]->(b)`
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

    async createFunction(fn, type, data) {
        let exists = await this.functionExists(fn, data.service);
        if (!exists){
            this.createNode(fn, type, "").then(() => {
                this.createRelation(fn, data.service, "IN").then(() => {
                    return
                })
            })
        }
        return
    }

    async serviceExists(nodeName) {
        let result = await this.sendQuery(
            `MATCH (n) WHERE n.name = "${nodeName}" RETURN count(n) > 0 as n`
        );
        return new Promise((resolve) => {
            resolve(result.records[0]._fields[0]);
        })
    }

    async functionExists(fn, srv) {

        let result = await this.sendQuery(
            `MATCH (n:function)-[:IN]->(s:service) WHERE n.name = "${fn}"
         AND s.name = "${srv}"
        RETURN count(n) > 0 as n`
        );
        return new Promise((resolve) => {
            resolve(result.records[0]._fields[0]);
        })
    }
}

module.exports = GraphDriver;
