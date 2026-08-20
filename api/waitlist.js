module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { email, source, statut } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    console.error('Missing NOTION_TOKEN or NOTION_DATABASE_ID env vars');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const properties = {
    Email: { title: [{ text: { content: String(email).trim() } }] }
  };

  if (source === 'Hero' || source === 'CTA final') {
    properties.Source = { select: { name: source } };
  }

  const knownStatuts = [
    'Diagnostiquée',
    'En cours de diagnostic',
    'Je me reconnais dans les symptômes',
    'Je soutiens une proche'
  ];
  if (statut && knownStatuts.includes(statut)) {
    properties.Statut = { select: { name: statut } };
  }

  try {
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties
      })
    });

    if (!notionRes.ok) {
      const detail = await notionRes.text();
      console.error('Notion API error', notionRes.status, detail);
      res.status(502).json({ error: 'notion_error' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Waitlist handler error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
