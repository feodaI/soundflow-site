'use strict';
/* SoundFlow download counter — added 2026-11-20.
   1) Shows the live total of GitHub Release downloads (public GitHub API).
   2) Logs Download-button clicks to Supabase (table: download_clicks) so
      site-only clicks can be counted separately from GitHub's total.
      The Supabase publishable key is read from auth.js at runtime — it is
      the site's own public key, protected by Row Level Security.
   Both parts fail silently: if a service is unreachable or the table does
   not exist yet, the site and the download links work exactly as before. */
(() => {
  const GH_API = 'https://api.github.com/repos/despito-studio/SoundFlow/releases?per_page=100';
  const SB_URL = 'https://ieafdutkxpyqwmfedwqy.supabase.co';

  // --- 1) Live GitHub download total in the download section ---
  fetch(GH_API, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('github ' + r.status))))
    .then((releases) => {
      let total = 0;
      for (const rel of releases) {
        for (const asset of rel.assets || []) total += asset.download_count || 0;
      }
      if (!total) return;
      const host = document.querySelector('.direct-download');
      if (!host) return;
      const el = document.createElement('p');
      el.className = 'notice';
      el.id = 'dl-count';
      el.textContent = total + ' downloads on GitHub';
      host.appendChild(el);
    })
    .catch(() => {});

  // --- 2) Site click tracking (exe / zip) into Supabase ---
  let sbKey = null;
  const keyReady = fetch('auth.js?v=2')
    .then((r) => r.text())
    .then((t) => {
      const m = t.match(/sb_publishable_[A-Za-z0-9_-]+/);
      if (m) sbKey = m[0];
    })
    .catch(() => {});

  const logClick = (asset) => {
    const send = () => {
      if (!sbKey) return;
      fetch(SB_URL + '/rest/v1/download_clicks', {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: sbKey,
          Authorization: 'Bearer ' + sbKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ asset: asset, page: location.pathname }),
      }).catch(() => {});
    };
    if (sbKey) send();
    else keyReady.then(send);
  };

  document.querySelectorAll('a[href*="/releases/download/"]').forEach((a) => {
    a.addEventListener('click', () => {
      logClick(a.href.toLowerCase().endsWith('.zip') ? 'zip' : 'exe');
    });
  });
})();
