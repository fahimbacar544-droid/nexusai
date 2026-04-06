export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function sendWelcomeEmail(email, company) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_URL}/public/dashboard.html`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'NexusAI <onboarding@resend.dev>',
      to: email,
      subject: '🎉 Bienvenue sur NexusAI — Votre agent IA est prêt !',
      html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px"><div style="background:#185FA5;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px"><h1 style="color:white;margin:0">NexusAI</h1><p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Agent IA pour entreprises</p></div><h2>Bienvenue, ${company} ! 🎉</h2><p style="color:#6b7280;line-height:1.6">Votre abonnement est actif. Votre agent IA est prêt.</p><div style="background:#f9fafb;border-radius:10px;padding:20px;margin:24px 0"><ul style="line-height:1.9;padding-left:20px"><li>📧 Rédiger tous vos emails</li><li>📄 Créer des devis</li><li>💬 Répondre aux clients</li><li>📞 Scripts d'appels</li><li>📊 Analyser vos données</li></ul></div><a href="${dashboardUrl}" style="display:block;background:#185FA5;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600">Accéder à mon agent IA →</a><p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px">120€/mois · Résiliable à tout moment</p></div>`
    })
  });
  return res.ok;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  switch (event.type) {
    case 'customer.subscription.created': {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      if (customer.email) await sendWelcomeEmail(customer.email, customer.name || 'votre entreprise');
      break;
    }
    case 'invoice.payment_succeeded': console.log('✅ Paiement reçu'); break;
    case 'invoice.payment_failed': console.log('❌ Paiement échoué'); break;
    case 'customer.subscription.deleted': console.log('🚫 Résiliation'); break;
  }
  res.status(200).json({ received: true });
};
