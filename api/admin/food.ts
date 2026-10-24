import type {IncomingMessage,ServerResponse} from "node:http";
import {run} from "../_handler";
import {GET,PATCH} from "../../src/server/routes/adminFood";
export default (req:IncomingMessage,res:ServerResponse)=>{
 if(!["GET","PATCH"].includes(req.method||"")){res.statusCode=405;res.end();return;}
 return run(req,res,req.method==="PATCH"?PATCH:GET);
};
