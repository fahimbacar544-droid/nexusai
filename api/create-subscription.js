const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PRICE_ID = process.env.STRIPE_PRICE_ID;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, company } = req.body;
  if (!email || !company) return res.status(400).json({ error: 'Email et entreprise requis' });
  try {
    const existing = await stripe.customers.list({ email, limit: 1 });
    let customer = existing.data.length > 0 ? existing.data[0] : await stripe.customers.create({ email, name: company });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
    res.status(200).json({ clientSecret: subscription.latest_invoice.payment_intent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
