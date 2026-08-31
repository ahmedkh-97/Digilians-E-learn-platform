function randomBytes(length,cryptoObject,randomFn){
  const bytes=new Uint8Array(length);
  if(typeof cryptoObject?.getRandomValues==="function"){
    cryptoObject.getRandomValues(bytes);
    return bytes;
  }
  for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(randomFn()*256)&255;
  return bytes;
}

function formatUuid(bytes){
  const value=Uint8Array.from(bytes);
  value[6]=(value[6]&0x0f)|0x40;
  value[8]=(value[8]&0x3f)|0x80;
  const hex=[...value].map(byte=>byte.toString(16).padStart(2,"0"));
  return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10,16).join("")}`;
}

export function createUuid(cryptoObject=globalThis.crypto,randomFn=Math.random){
  if(typeof cryptoObject?.randomUUID==="function"){
    try{return cryptoObject.randomUUID()}catch{}
  }
  return formatUuid(randomBytes(16,cryptoObject,randomFn));
}

export function isBenignClientError(message){
  const normalized=String(message??"")
    .trim()
    .replace(/\s+/g," ")
    .replace(/\.$/,"")
    .toLowerCase();
  return normalized==="resizeobserver loop completed with undelivered notifications" ||
    normalized==="resizeobserver loop limit exceeded";
}
