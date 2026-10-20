import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApplication} from '../server.mjs';
const dataDir=process.env.DATA_DIR?resolve(process.env.DATA_DIR):resolve(dirname(fileURLToPath(import.meta.url)),'../data');
const app=createApplication({dataDir});
console.log(JSON.stringify(app.scoreboard(),null,2));
