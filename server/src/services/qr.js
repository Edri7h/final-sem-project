import QRCode from 'qrcode';
import { frontendUrl } from '../config.js';
export function newQrToken(){ return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''); }
export async function qrDataUrl(token){const fallback=process.env.NODE_ENV==='production'?'https://beacon-emergency.vercel.app':'http://localhost:5173';const root=(process.env.NODE_ENV==='production'?frontendUrl:process.env.FRONTEND_URL||fallback).split(',')[0].trim().replace(/\/+$/,'');return QRCode.toDataURL(`${root}/emergency/${token}`,{errorCorrectionLevel:'H',margin:2,width:600,color:{dark:'#10233f',light:'#ffffff'}});}
