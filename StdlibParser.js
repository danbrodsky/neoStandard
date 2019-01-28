require('dotenv').config()
const STDLIB_TOKEN = process.env.STDLIB_TOKEN;
const STDLIB_USER = process.env.STDLIB_USER;

const NS_PROJECT_DIR = process.env.NS_PROJECT_DIR;

const lib = require('lib')({token: STDLIB_TOKEN});
const fs = require('fs');
import readFilePromise from 'fs-readfile-promise';

const { lstatSync, readdirSync  } = require('fs')
const { join  } = require('path')

import GraphDriver from './GraphDriver.js';

const isDirectory = source => lstatSync(source).isDirectory()
const isNotDirectory = source => !lstatSync(source).isDirectory()

const getDirectories = source =>
    readdirSync(source).map(name => join(source, name)).filter(isDirectory)

const getFilesInDir = source =>
    readdirSync(source).map(name => join(source, name))

const getServiceNames = source =>
    getDirectories(source).map(name => name.split('/')[1])

const getFunctionPaths = (source, services) => {
    var functionPaths = [];
    services.forEach((s) => {
        functionPaths = functionPaths.concat(getFilesInDir(`${source}/${s}/functions/`).filter(isNotDirectory));
    })
    return functionPaths;
}

class StdlibParser {

    constructor() {
        this.graph = new GraphDriver();
    }


    async parseServices() {

        // create service nodes if they don't already exist
        const serviceNames = getServiceNames('./' + STDLIB_USER);
        for (const service of serviceNames){
            let exists = await this.graph.serviceExists(service);
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
            let exists = await this.graph.functionExists(fn, srv);
            if (!exists){
                console.log(fn + " doesn't exist");
                console.log("adding function");
                await this.graph.createFunction(fn, "function", {service: srv});
            }
        }
        return functionNames;
    }

    async parseFunctionRelations(functionNames) {
        // read function contents and create relation to other functions called
        for (const fnPath of functionNames) {
            await readFilePromise('./' + fnPath, 'utf8')
                .then(async (res) => {
                    let that = this;
                    console.log(res);
                    let parsedCode = res.match(/lib\[`.*?`\]/g);
                    if (parsedCode != null) {
                        for (let code of parsedCode) {
                            let calledFunction = code.split(".").pop();
                            await that.graph.createCommonRelation(fnPath.split("/")[3], calledFunction, "CALLS");
                        }
                    }

                    await that.graph.createFunction("Utils", "service", "");

                    let publicFunctions = res.match(/lib\.utils\..*?(?=\()/g);
                        if (parsedCode != null) {
                            for (let code of publicFunctions) {
                                let calledFunction = code.split(".").pop();
                                await that.graph.createFunction(calledFunction, "function", {service: "Utils"});
                                await that.graph.createCommonRelation(fnPath.split("/")[3], calledFunction, "CALLS");
                            }
                        }

                        return;
                    })
        }
    }

    async parseAll() {
        var serviceNames = await this.parseServices();
        var functionNames = await this.parseFunctions(serviceNames);
        await this.parseFunctionRelations(functionNames);
        return
    }
}

module.exports = StdlibParser;
