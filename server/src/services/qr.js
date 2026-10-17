import QRCode from 'qrcode';
export function newQrToken(){ return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''); }
export async function qrDataUrl(token){const root=(process.env.FRONTEND_URL||'http://localhost:5173').replace(/\/$/,'');return QRCode.toDataURL(`${root}/emergency/${token}`,{errorCorrectionLevel:'H',margin:2,width:600,color:{dark:'#10233f',light:'#ffffff'}});}
