(async function () {
  const form = document.getElementById('auth-form');
  const status = document.getElementById('auth-status');
  const button = form.querySelector('button');
  let client;
  const signup = document.body.dataset.mode === 'signup';
  try {
    const response = await fetch('/api/public-config', {cache:'no-store'});
    if (!response.ok) throw new Error();
    const config = await response.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey || config.ready === false || new URL(config.supabaseUrl).protocol !== 'https:' || !window.supabase) throw new Error();
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'qrguys-auth-apparel'}});
    button.disabled = false;
    status.textContent = signup ? 'Create your QR Guys apparel account.' : 'Sign in to manage your QR clothing.';
  } catch (_) {
    status.textContent = 'Account services are being prepared. Sign-in and registration are unavailable until setup is complete.';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) return;
    button.disabled = true;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    try {
      const result = signup
        ? await client.auth.signUp({email,password,options:{emailRedirectTo: new URL('/Apparel.html',location.origin).href}})
        : await client.auth.signInWithPassword({email,password});
      if (result.error) throw result.error;
      if (result.data.session) location.assign('/Apparel.html');
      else status.textContent = 'Check your email for the account confirmation link before signing in.';
    } catch (error) {
      status.textContent = error.message || 'Unable to sign in. Please try again.';
    } finally { button.disabled = false; }
  });
})();
