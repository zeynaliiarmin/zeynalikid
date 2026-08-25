import crypto from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const [input,output]=process.argv.slice(2);const password=String(process.env.BACKUP_ENCRYPTION_KEY||'');
if(!input||!output||!password){console.error('Usage: BACKUP_ENCRYPTION_KEY=... node scripts/decrypt-backup.mjs input.zip.enc output.zip');process.exit(1)}
const data=await readFile(input);if(data.subarray(0,6).toString()!=='ZKBAK1')throw new Error('Unsupported backup format.');
const salt=data.subarray(6,22);const iv=data.subarray(22,34);const tag=data.subarray(34,50);const ciphertext=data.subarray(50);const key=crypto.scryptSync(password,salt,32);const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);const plain=Buffer.concat([decipher.update(ciphertext),decipher.final()]);await writeFile(output,plain,{mode:0o600});console.log(JSON.stringify({output,bytes:plain.length,sha256:crypto.createHash('sha256').update(plain).digest('hex')}));
