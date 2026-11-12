/* Only public configuration is fetched here. No legacy service fallback. */
window.QRGuysSetupState = function (message) {
  const status = document.getElementById('setup-status');
  status.hidden = false;
  status.textContent = message;
  document.querySelectorAll('button,input,select,textarea').forEach(el => el.disabled = true);
};
(async function () {
  window.QRGuysSetupState('Preparing your apparel studio…');
  try {
    const response = await fetch('/api/public-config', {cache:'no-store'});
    if (!response.ok) throw new Error('Configuration unavailable');
    const config = await response.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey || config.ready === false) throw new Error('Configuration incomplete');
    const url = new URL(config.supabaseUrl);
    if (url.protocol !== 'https:' || !window.supabase) throw new Error('Configuration unavailable');
    window.QRGuysConfig = config;
    document.querySelectorAll('button,input,select,textarea').forEach(el => el.disabled = false);
    const script = document.createElement('script');
    script.src = '/js/apparel.js';
    script.onerror = () => window.QRGuysSetupState('The apparel studio could not load. Please try again later.');
    script.onload = () => {document.getElementById('setup-status').hidden = true;};
    document.body.appendChild(script);
  } catch (_) {
    window.QRGuysSetupState('QR Guys Clothing Co. is preparing this apparel service. Sign-in, activation, and saving are unavailable until setup is complete.');
  }
})();
