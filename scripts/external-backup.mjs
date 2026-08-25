import crypto from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {S3Client,PutObjectCommand,ListObjectsV2Command,DeleteObjectsCommand,HeadBucketCommand} from '@aws-sdk/client-s3';

const dryRun=process.env.BACKUP_DRY_RUN==='true';
const target=String(process.env.BACKUP_TARGET||'r2').trim();
if(!['r2','github-artifact'].includes(target))throw new Error(`Unsupported BACKUP_TARGET: ${target}`);
const baseRequired=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','SUPABASE_PROJECT_REF','BACKUP_PROJECT_CODE'];
const r2Required=['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'];
const githubRequired=['BACKUP_ENCRYPTION_KEY'];
const targetRequired=target==='r2'?r2Required:githubRequired;
const required=[...baseRequired,...(dryRun?[]:targetRequired)];
const missing=required.filter(key=>!String(process.env[key]||'').trim());
if(missing.length){console.log(`External backup is not configured yet. Missing GitHub secrets: ${missing.join(', ')}`);process.exit(0)}
const env=Object.fromEntries(required.map(key=>[key,String(process.env[key]).trim()]));
const retentionDays=Math.max(1,Number(process.env.BACKUP_RETENTION_DAYS||20));
const tables=['settings','submissions','reviews','user_questions','page_views','error_logs','admin_devices','admin_sessions','security_rate_limits','admin_credentials','admin_audit_logs','submission_contacts','submission_orders','submission_consultations','checkout_sessions','assistant_knowledge','assistant_settings','assistant_unanswered','assistant_feedback','assistant_bot_states'];
const zip=new JSZip();const manifest={project:env.BACKUP_PROJECT_CODE,createdAt:new Date().toISOString(),retentionDays,tables:{},storage:{objects:0,bytes:0},files:[]};
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const addFile=(path,value)=>{const data=Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:JSON.stringify(value,null,2));zip.file(path,data);manifest.files.push({path,bytes:data.length,sha256:sha(data)})};
async function checkedFetch(url,options={}){const response=await fetch(url,{...options,headers:{'User-Agent':'scheduled-backup/1.0',...(options.headers||{})},signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`${options.method||'GET'} ${new URL(url).pathname} failed with HTTP ${response.status}`);return response}
async function tableRows(table){const rows=[];for(let offset=0;offset<1_000_000;offset+=1000){const response=await checkedFetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=1000`,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}});const batch=await response.json();rows.push(...batch);if(batch.length<1000)break}return rows}
for(const table of tables){try{const rows=await tableRows(table);manifest.tables[table]=rows.length;addFile(`database/data-${table}.json`,rows)}catch(error){manifest.tables[table]=`unavailable: ${String(error?.message||error)}`}}
const sqlQueries={columns:"select table_schema,table_name,column_name,data_type,is_nullable,column_default,generation_expression from information_schema.columns where table_schema in ('public','storage') order by table_schema,table_name,ordinal_position",policies:"select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname",indexes:"select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','storage') order by schemaname,tablename,indexname",triggers:"select event_object_schema,event_object_table,trigger_name,event_manipulation,action_statement,action_timing from information_schema.triggers where event_object_schema='public' order by event_object_table,trigger_name",functions:"select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.proname",grants:"select grantee,table_schema,table_name,privilege_type from information_schema.role_table_grants where table_schema='public' order by table_name,grantee,privilege_type"};
for(const [name,query] of Object.entries(sqlQueries)){const response=await checkedFetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});addFile(`database/${name}.json`,await response.json())}
const storageHeaders={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`};
const buckets=await (await checkedFetch(`${env.SUPABASE_URL}/storage/v1/bucket`,{headers:storageHeaders})).json();addFile('database/buckets.json',buckets);
async function listObjects(bucket,prefix=''){const found=[];for(let offset=0;;offset+=1000){const response=await checkedFetch(`${env.SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(bucket)}`,{method:'POST',headers:{...storageHeaders,'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:1000,offset,sortBy:{column:'name',order:'asc'}})});const batch=await response.json();for(const item of batch){const path=[prefix,item.name].filter(Boolean).join('/');if(item.id===null)found.push(...await listObjects(bucket,path));else found.push({path,metadata:item})}if(batch.length<1000)break}return found}
const storageIndex=[];
for(const bucketInfo of buckets){const bucket=String(bucketInfo.id||bucketInfo.name||'');if(!bucket)continue;for(const item of await listObjects(bucket)){const encoded=item.path.split('/').map(encodeURIComponent).join('/');const response=await checkedFetch(`${env.SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`,{headers:storageHeaders});const data=Buffer.from(await response.arrayBuffer());const archivePath=`storage/${bucket}/${item.path}`;addFile(archivePath,data);manifest.storage.objects++;manifest.storage.bytes+=data.length;storageIndex.push({bucket,path:item.path,bytes:data.length,sha256:sha(data),metadata:item.metadata})}}
addFile('database/storage-objects.json',storageIndex);addFile('manifest.json',manifest);
const archive=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
if(dryRun){console.log(JSON.stringify({dryRun:true,archiveBytes:archive.length,archiveSha256:sha(archive),tableCount:Object.keys(manifest.tables).length,storageObjects:manifest.storage.objects,retentionDays}));process.exit(0)}
if(target==='github-artifact'){
 const salt=crypto.randomBytes(16);const iv=crypto.randomBytes(12);const key=crypto.scryptSync(env.BACKUP_ENCRYPTION_KEY,salt,32);const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const ciphertext=Buffer.concat([cipher.update(archive),cipher.final()]);const encrypted=Buffer.concat([Buffer.from('ZKBAK1'),salt,iv,cipher.getAuthTag(),ciphertext]);
 await mkdir('backup-output',{recursive:true});const output=`backup-output/${env.BACKUP_PROJECT_CODE}-${timestamp}.zip.enc`;await writeFile(output,encrypted,{mode:0o600});console.log(JSON.stringify({target,output,encryptedBytes:encrypted.length,encryptedSha256:sha(encrypted),tableCount:Object.keys(manifest.tables).length,storageObjects:manifest.storage.objects,retentionDays}));process.exit(0)
}
const key=`backups/${env.BACKUP_PROJECT_CODE}/${timestamp}.zip`;
const s3=new S3Client({region:'auto',endpoint:`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:env.R2_ACCESS_KEY_ID,secretAccessKey:env.R2_SECRET_ACCESS_KEY}});
await s3.send(new HeadBucketCommand({Bucket:env.R2_BUCKET}));await s3.send(new PutObjectCommand({Bucket:env.R2_BUCKET,Key:key,Body:archive,ContentType:'application/zip',Metadata:{project:env.BACKUP_PROJECT_CODE,sha256:sha(archive)}}));
const cutoff=Date.now()-retentionDays*86400000;const expired=[];let token;
do{const page=await s3.send(new ListObjectsV2Command({Bucket:env.R2_BUCKET,Prefix:`backups/${env.BACKUP_PROJECT_CODE}/`,ContinuationToken:token}));for(const object of page.Contents||[])if(object.Key&&object.LastModified&&object.LastModified.getTime()<cutoff)expired.push({Key:object.Key});token=page.IsTruncated?page.NextContinuationToken:undefined}while(token);
for(let index=0;index<expired.length;index+=1000)await s3.send(new DeleteObjectsCommand({Bucket:env.R2_BUCKET,Delete:{Objects:expired.slice(index,index+1000),Quiet:true}}));
console.log(JSON.stringify({uploaded:key,archiveBytes:archive.length,archiveSha256:sha(archive),tableCount:Object.keys(manifest.tables).length,storageObjects:manifest.storage.objects,expiredDeleted:expired.length,retentionDays}));
