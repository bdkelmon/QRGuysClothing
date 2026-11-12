export function safePublicUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function renderContent(document, container, payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid content');
  container.replaceChildren();
  if (payload.contentType === 'text' && typeof payload.text === 'string' && payload.text.trim()) {
    const p = document.createElement('p');
    p.textContent = payload.text;
    container.append(p);
    return;
  }
  if (payload.contentType === 'image') {
    const url = safePublicUrl(payload.imageUrl);
    if (!url) throw new Error('Invalid image');
    const image = document.createElement('img');
    image.src = url;
    image.alt = 'Image shared by the QR clothing owner';
    image.referrerPolicy = 'no-referrer';
    container.append(image);
    return;
  }
  const url = safePublicUrl(payload.url);
  if (!url) throw new Error('Unsupported content');
  const link = document.createElement('a');
  link.href = url;
  link.textContent = 'Open shared link: ' + new URL(url).hostname;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  container.append(link);
}
