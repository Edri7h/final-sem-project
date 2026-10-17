const escapeXml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}[char]));

async function fetchQrData(vehicleId, apiBase) {
  const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/qr.png`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Could not load the vehicle QR code.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not prepare the QR image.'));
    reader.readAsDataURL(blob);
  });
}

function cardSvg(vehicle, qrData) {
  const registration = escapeXml(vehicle.registrationNumber);
  const makeModel = escapeXml(`${vehicle.make} ${vehicle.model}`);
  const color = escapeXml(vehicle.color || 'Not specified');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="50mm" viewBox="0 0 1000 500">
<rect width="1000" height="500" rx="24" fill="#f5f6f7"/>
<rect x="8" y="8" width="380" height="484" rx="20" fill="#c92828"/>
<text x="198" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#fff">SCAN TO ALERT</text>
<text x="198" y="78" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#fff">THIS VEHICLE'S</text>
<text x="198" y="103" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#fff">EMERGENCY CONTACTS</text>
<rect x="27" y="116" width="342" height="350" rx="14" fill="#fff"/>
<image x="48" y="133" width="300" height="300" href="${qrData}" preserveAspectRatio="xMidYMid meet"/>
<text x="198" y="453" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="600" fill="#17212b">Point your camera at the code</text>
<text x="414" y="56" font-family="Arial,sans-serif" font-size="21" font-weight="700" letter-spacing="1.5" fill="#4b5965">VEHICLE DETAILS</text>
<text x="414" y="104" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1" fill="#626e78">REGISTRATION NUMBER</text>
<rect x="414" y="117" width="570" height="92" rx="10" fill="#fff" stroke="#cbd2d7" stroke-width="2"/>
<text x="699" y="176" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" letter-spacing="1.5" fill="#15202a" textLength="530" lengthAdjust="spacingAndGlyphs">${registration}</text>
<line x1="414" y1="237" x2="984" y2="237" stroke="#d9dee2" stroke-width="2"/>
<text x="414" y="276" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1" fill="#626e78">VEHICLE</text>
<text x="414" y="315" font-family="Arial,sans-serif" font-size="27" font-weight="600" fill="#17212b" textLength="550" lengthAdjust="spacingAndGlyphs">${makeModel}</text>
<line x1="414" y1="350" x2="984" y2="350" stroke="#d9dee2" stroke-width="2"/>
<text x="414" y="391" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1" fill="#626e78">COLOR</text>
<text x="414" y="431" font-family="Arial,sans-serif" font-size="24" fill="#17212b">${color}</text>
</svg>`;
}

export async function downloadQrCard(vehicle, apiBase) {
  const svg = cardSvg(vehicle, await fetchQrData(vehicle.id, apiBase));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${vehicle.registrationNumber}-emergency-card.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function printQrCard(vehicle, apiBase) {
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) throw new Error('Allow pop-ups to print the emergency card.');
  try {
    const svg = cardSvg(vehicle, await fetchQrData(vehicle.id, apiBase));
    const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeXml(vehicle.registrationNumber)} emergency card</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;display:grid;place-items:center;min-height:100vh;background:#fff}img{display:block;width:100mm;height:50mm}@media screen{body{padding:24px;background:#edf0f1}img{box-shadow:0 8px 28px #0002}}</style></head><body><img alt="Emergency QR card for vehicle ${escapeXml(vehicle.registrationNumber)}" src="${imageUrl}"><script>window.addEventListener('load',()=>setTimeout(()=>{window.focus();window.print()},350))<\/script></body></html>`);
    printWindow.document.close();
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
