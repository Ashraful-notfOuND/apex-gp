import {originURL} from './ctf-http.mjs';

export function ctfConfig(env=process.env){
 const required=name=>{const value=env[name]?.trim();if(!value||/^(?:CHANGE_ME|REPLACE_ME)/.test(value))throw new Error('Set '+name+' before starting the CTF service.');return value;};
 const allowHTTP=env.APEX_ALLOW_HTTP==='true',date=name=>{const value=required(name),stamp=Date.parse(value);if(!/(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(stamp))throw new Error(name+' must be an ISO date with a timezone.');return stamp;};
 const config={rctfURL:originURL(required('RCTF_URL'),{allowHTTP}),publicURL:originURL(required('COORDINATOR_PUBLIC_URL'),{allowHTTP}),clientId:required('RCTF_CLIENT_ID'),clientSecret:required('RCTF_CLIENT_SECRET'),cookieSecret:required('APEX_COOKIE_SECRET'),gatewayKey:required('APEX_GATEWAY_KEY'),instanceDomain:required('INSTANCE_DOMAIN'),instancePrefix:env.INSTANCE_PREFIX||'apex-gp-',challengeId:required('RCTF_CHALLENGE_ID'),secret:required('RCTF_SCORING_SECRET'),event:required('EVENT_ID'),eventStart:date('EVENT_START'),eventEnd:date('EVENT_END'),seed:Number(env.EVENT_SEED||2026),maxSessions:Number(env.MAX_SESSIONS||24),allowHTTP,developmentOrigins:allowHTTP?(env.DEVELOPMENT_ORIGINS||'').split(',').filter(Boolean):[]};
 if(config.eventEnd<=config.eventStart)throw new Error('EVENT_END must be after EVENT_START.');
 if(!Number.isInteger(config.seed)||!Number.isInteger(config.maxSessions)||config.maxSessions<1||config.gatewayKey.length<32)throw new Error('Invalid event seed, session limit, or gateway key (minimum 32 characters).');
 return config;
}
