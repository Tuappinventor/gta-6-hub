const analyticsBase = 'https://api.vercel.com/v1/query/web-analytics/visits/';
const projectId = 'prj_UmQWaeLMMANXEoMyrB0Wfd3UZ2Dl';
const teamId = 'team_FQirJov0Lvn4nAs6PuGbvb4t';

async function getAnalytics(endpoint, params, token) {
  const url = new URL(endpoint, analyticsBase);
  url.search = new URLSearchParams({ projectId, teamId, ...params });
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Analytics query failed');
  return (await response.json()).data;
}

const validCount = value => Number.isSafeInteger(value) && value >= 0;

function rankedRows(rows, dimension) {
  if (!Array.isArray(rows)) throw new Error('Invalid analytics rows');
  return rows.filter(row => validCount(row?.pageviews))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 5)
    .map(row => ({
      label: row[dimension] == null ? '' : String(row[dimension]).slice(0, 240),
      pageviews: row.pageviews,
    }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer [\w.-]+$/.test(authorization)) {
    return res.status(401).json({ error: 'sign_in_required' });
  }

  const days = req.query.days ?? '7';
  if (days !== '7' && days !== '30') {
    return res.status(400).json({ error: 'invalid_period' });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const apikey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !apikey) return res.status(503).json({ error: 'unavailable' });

  try {
    const headers = { apikey, Authorization: authorization };
    const auth = await fetch(supabaseUrl + '/auth/v1/user', {
      headers, signal: AbortSignal.timeout(5000),
    });
    if (auth.status === 401 || auth.status === 403) {
      return res.status(401).json({ error: 'sign_in_required' });
    }
    if (!auth.ok) throw new Error('Auth unavailable');
    const { id } = await auth.json();
    if (!id) return res.status(401).json({ error: 'sign_in_required' });

    const profile = new URL(supabaseUrl + '/rest/v1/profiles');
    profile.search = new URLSearchParams({ select: 'role', id: 'eq.' + id, limit: '1' });
    const response = await fetch(profile, { headers, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Profile unavailable');
    const [user] = await response.json();
    if (!['editor', 'admin'].includes(user?.role)) {
      return res.status(403).json({ error: 'editor_required' });
    }

    const token = process.env.VERCEL_ANALYTICS_TOKEN;
    if (!token) return res.status(503).json({ error: 'analytics_not_configured' });

    const now = Date.now();
    const period = {
      since: new Date(now - Number(days) * 86400000).toISOString(),
      until: new Date(now).toISOString(),
    };
    const [totals, pages, referrers] = await Promise.all([
      getAnalytics('count', period, token),
      getAnalytics('aggregate', { ...period, by: 'requestPath', limit: '5' }, token),
      getAnalytics('aggregate', { ...period, by: 'referrerHostname', limit: '5' }, token),
    ]);
    if (!validCount(totals?.visitors) || !validCount(totals?.pageviews)) {
      throw new Error('Invalid analytics totals');
    }

    return res.status(200).json({
      visitors: totals.visitors,
      pageviews: totals.pageviews,
      pages: rankedRows(pages, 'requestPath'),
      referrers: rankedRows(referrers, 'referrerHostname'),
    });
  } catch {
    return res.status(503).json({ error: 'unavailable' });
  }
}
