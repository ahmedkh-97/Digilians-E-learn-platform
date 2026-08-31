export const STORAGE_SCHEMA_KEY="digilians.storageSchemaVersion";
export const CURRENT_STORAGE_SCHEMA_VERSION=2;

const PRODUCTION_MIGRATIONS=[
  {
    from:1,
    to:2,
    destructive:false,
    // V2 introduces an explicit storage schema marker. Existing learner
    // records are intentionally left byte-for-byte untouched.
    apply(){return true;}
  }
];

function readVersion(storage){
  try{
    const raw=storage?.getItem?.(STORAGE_SCHEMA_KEY);
    if(raw===null || raw===undefined || raw==="")return {ok:true,version:1};
    const version=Number(raw);
    if(!Number.isInteger(version) || version<1)return {ok:false,reason:"invalid-schema"};
    return {ok:true,version};
  }catch{
    return {ok:false,reason:"storage-read-failed"};
  }
}

function writeVersion(storage,version){
  try{
    storage?.setItem?.(STORAGE_SCHEMA_KEY,String(version));
    return true;
  }catch{
    return false;
  }
}

export function runStorageMigrations(storage,{currentVersion,targetVersion=CURRENT_STORAGE_SCHEMA_VERSION,migrations=PRODUCTION_MIGRATIONS,createSafetySnapshot=()=>true}={}){
  const start=Number(currentVersion);
  const target=Number(targetVersion);
  if(!Number.isInteger(start) || start<1)return {ok:false,reason:"invalid-schema",fromVersion:start,toVersion:start};
  if(start>target)return {ok:false,reason:"future-schema",fromVersion:start,toVersion:start};
  if(start===target){
    if(!writeVersion(storage,target))return {ok:false,reason:"storage-write-failed",fromVersion:start,toVersion:start};
    return {ok:true,fromVersion:start,toVersion:target,applied:[]};
  }

  let version=start;
  const applied=[];
  while(version<target){
    const migration=migrations.find(item=>Number(item?.from)===version && Number(item?.to)===version+1);
    if(!migration)return {ok:false,reason:"missing-migration",fromVersion:start,toVersion:version,applied};

    if(migration.destructive){
      let snapshotOk=false;
      try{snapshotOk=createSafetySnapshot(storage,{from:version,to:version+1})===true;}catch{snapshotOk=false;}
      if(!snapshotOk)return {ok:false,reason:"safety-snapshot-failed",fromVersion:start,toVersion:version,applied};
    }

    try{
      migration.apply?.(storage);
    }catch{
      return {ok:false,reason:"migration-failed",fromVersion:start,toVersion:version,applied};
    }

    const next=version+1;
    if(!writeVersion(storage,next))return {ok:false,reason:"storage-write-failed",fromVersion:start,toVersion:version,applied};
    applied.push(`${version}->${next}`);
    version=next;
  }

  return {ok:true,fromVersion:start,toVersion:version,applied};
}

export function ensureStorageSchema(storage=globalThis.localStorage,options={}){
  const read=readVersion(storage);
  if(!read.ok)return {ok:false,reason:read.reason,fromVersion:null,toVersion:null,applied:[]};
  if(read.version>CURRENT_STORAGE_SCHEMA_VERSION){
    return {ok:false,reason:"future-schema",fromVersion:read.version,toVersion:read.version,applied:[]};
  }
  return runStorageMigrations(storage,{
    currentVersion:read.version,
    targetVersion:CURRENT_STORAGE_SCHEMA_VERSION,
    migrations:options.migrations||PRODUCTION_MIGRATIONS,
    createSafetySnapshot:options.createSafetySnapshot||(()=>true)
  });
}
