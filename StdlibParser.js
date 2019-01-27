require('dotenv').config()
const STDLIB_TOKEN = process.env.STDLIB_TOKEN;
const STDLIB_USER= process.env.STDLIB_USER;

const lib = require('lib')({token: STDLIB_TOKEN});
const fs = require('fs');

const { lstatSync, readdirSync  } = require('fs')
const { join  } = require('path')

import GraphDriver from './GraphDriver.js';

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

class StdlibParser {

    constructor() {
        this.graph = new GraphDriver();
    }

    async serviceExists(nodeName) {
        let result = await this.graph.sendQuery(
            `MATCH (n) WHERE n.name = "${nodeName}" RETURN count(n) > 0 as n`
        );
        return new Promise((resolve) => {
            resolve(result.records[0]._fields[0]);
        })
    }

    async functionExists(fn, srv) {

        let result = await this.graph.sendQuery(
            `MATCH (n:function)-[:IN]->(s:service) WHERE n.name = "${fn}"
         AND s.name = "${srv}"
        RETURN count(n) > 0 as n`
        );
        return new Promise((resolve) => {
            resolve(result.records[0]._fields[0]);
        })
    }

    async parseServices() {

        // create service nodes if they don't already exist
        const serviceNames = getServiceNames('./' + STDLIB_USER);
        for (const service of serviceNames){
            let exists = await this.serviceExists(service);
            if (!exists){
                console.log("adding service");
                this.graph.createNode(service, "service", "");
            }
        }
        return serviceNames;
    }

    async parseFunctions(serviceNames) {

        // create function nodes found in services
        const functionNames = getFunctionPaths('./' + STDLIB_USER, serviceNames);
        console.log(functionNames);
        for (const fnPath of functionNames){
            let fn = fnPath.split('/')[3];
            let srv = fnPath.split('/')[1];
            let exists = await this.functionExists(fn, srv);
            if (!exists){
                console.log(fn + " doesn't exist");
                console.log("adding function");
                await this.graph.createFunction(fn, "function", {service: srv});
            }
        }
        return
    }

    async parseAll() {
        var serviceNames = await this.parseServices();
        await this.parseFunctions(serviceNames);
        return
    }
}

module.exports = StdlibParser;
