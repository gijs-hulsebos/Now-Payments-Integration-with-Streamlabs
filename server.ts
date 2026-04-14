import express from 'express';
import next from 'next';
import crypto from 'crypto';
import { parse } from 'url';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Parse JSON bodies
  server.use(express.json());

  // Webhook endpoint
  server.all('/webhook', (req, res, next) => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    next();
  });

  server.post('/webhook', async (req, res) => {
    try {
      const payload = req.body;
      const signature = req.headers['x-nowpayments-sig'];

      if (!signature) {
        return res.status(400).send('Missing signature');
      }

      const secret = process.env.NOWPAYMENTS_IPN_SECRET;
      if (!secret) {
        console.error('NOWPAYMENTS_IPN_SECRET is not set');
        return res.status(500).send('Server configuration error');
      }

      // Sort keys alphabetically
      const sortedKeys = Object.keys(payload).sort();
      const sortedPayload: Record<string, any> = {};
      for (const key of sortedKeys) {
        sortedPayload[key] = payload[key];
      }

      const stringifiedPayload = JSON.stringify(sortedPayload);

      // Create HMAC-SHA512 signature
      const hmac = crypto.createHmac('sha512', secret);
      hmac.update(stringifiedPayload);
      const calculatedSignature = hmac.digest('hex');

      // Verify signature
      if (calculatedSignature !== signature) {
        console.error('Invalid signature');
        return res.status(401).send('Invalid signature');
      }

      // Process payment
      if (payload.payment_status === 'finished') {
        const streamlabsToken = process.env.STREAMLABS_ACCESS_TOKEN;
        if (!streamlabsToken) {
          console.error('STREAMLABS_ACCESS_TOKEN is not set');
          return res.status(500).send('Server configuration error');
        }

        const streamlabsPayload = {
          name: payload.order_id || 'Crypto Supporter',
          amount: payload.pay_amount,
          currency: payload.pay_currency ? payload.pay_currency.toUpperCase() : 'USD',
          message: payload.order_description || 'Crypto donation via NOWPayments',
          identifier: payload.payment_id
        };

        // Send to Streamlabs using fetch
        const response = await fetch('https://streamlabs.com/api/v1.0/donations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${streamlabsToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(streamlabsPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Streamlabs API error:', response.status, errorText);
          return res.status(502).send('Failed to forward donation to Streamlabs');
        }

        console.log('Successfully sent donation to Streamlabs');
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Handle all other routes with Next.js
  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
