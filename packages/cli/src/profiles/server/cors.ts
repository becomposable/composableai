
import { ServerResponse, IncomingMessage } from 'http';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, ',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400' // 1 day
};

export function handleCors(req: IncomingMessage, res: ServerResponse) {
    console.log('##HANDLE CORS', req.method);
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return true;
    } else {
        res.writeHead(204, corsHeaders);
    }
    return false;

}