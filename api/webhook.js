const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  switch (event.type) {
    case 'invoice.payment_succeeded':
      console.log('✅ Paiement reçu'); break;
    case 'invoice.payment_failed':
      console.log('❌ Paiement échoué'); break;
    case 'customer.subscription.deleted':
      console.log('🚫 Résiliation'); break;
    case 'customer.subscription.created':
      console.log('🎉 Nouvel abonné'); break;
  }
  res.status(200).json({ received: true });
};
