require('dotenv').config()
const STDLIB_TOKEN = process.env.STDLIB_TOKEN;
const STDLIB_USER= process.env.STDLIB_USER;

const NEO4J_USER= process.env.NEO4J_USER;
const NEO4J_PASS = process.env.NEO4J_PASS;
const NEO4J_URI = process.env.NEO4J_URI;

import StdlibParser from './StdlibParser.js';

function main() {

    var parser = new StdlibParser();
    parser.parseAll().then(() => { return })
}

main();
