import './config.js';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { db,pool } from './db.js';
import { users,vehicles,contacts,alerts,alertEvents } from './schema.js';
import { newQrToken } from './services/qr.js';
const password=process.env.SEED_PASSWORD||'Beacon-Development-Only-2026!';
for(const [fullName,email,phone,role] of [['Alex Morgan','alex@example.test','+15550001001','USER'],['Jordan Lee','jordan@example.test','+15550001002','USER'],['Beacon Admin','admin@example.test','+15550001000','ADMIN']]){
 let [u]=await db.select().from(users).where(eq(users.email,email)).limit(1);
 if(!u)[u]=await db.insert(users).values({fullName,email,phone,passwordHash:await hash(password),phoneVerified:true,role}).returning();
 if(role==='USER'){
  const [found]=await db.select().from(vehicles).where(eq(vehicles.ownerId,u.id)).limit(1);
  if(!found){const [v]=await db.insert(vehicles).values({ownerId:u.id,registrationNumber:email.startsWith('alex')?'TEST-4821':'TEST-7793',make:email.startsWith('alex')?'Toyota':'Honda',model:email.startsWith('alex')?'Corolla':'Civic',color:email.startsWith('alex')?'Silver':'Blue',qrToken:newQrToken()}).returning();const number=email.startsWith('alex')?'+15550002001':'+15550002002';await db.insert(contacts).values({vehicleId:v.id,name:email.startsWith('alex')?'Casey Morgan':'Sam Lee',phone:number,relationship:'Family',verified:false});}
 }
}
const [alex]=await db.select().from(users).where(eq(users.email,'alex@example.test')).limit(1);
if(alex){const [vehicle]=await db.select().from(vehicles).where(eq(vehicles.ownerId,alex.id)).limit(1);if(vehicle){const prior=await db.select().from(alerts).where(eq(alerts.vehicleId,vehicle.id)).limit(1);if(!prior.length){for(const sample of [{type:'ACCIDENT',description:'Development sample: minor roadside collision',status:'OPEN',latitude:'37.7749000',longitude:'-122.4194000',locationAccuracy:'12.00'},{type:'BREAKDOWN',description:'Development sample: vehicle assistance requested',status:'RESOLVED'}]){const [alert]=await db.insert(alerts).values({vehicleId:vehicle.id,...sample}).returning();await db.insert(alertEvents).values({alertId:alert.id,eventType:'DEVELOPMENT_SEED',details:{source:'seed'}});}}}}console.info('Development seed data is ready.');
await pool.end();





