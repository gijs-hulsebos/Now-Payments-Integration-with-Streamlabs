import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  return NextResponse.json(
    { error: 'IPN must be a POST request to /api/webhook' },
    { status: 405 }
  );
}

export async function POST(req: Request) {
  console.log('--- Received POST request to /api/webhook ---');
  
  try {
    const payload = await req.json();
    const signature = req.headers.get('x-nowpayments-sig');

    if (!signature) {
      console.error('Missing x-nowpayments-sig header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const secret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!secret) {
      console.error('NOWPAYMENTS_IPN_SECRET is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Sort keys alphabetically (recursive)
    function sortObject(obj: any): any {
      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
      }
      return Object.keys(obj).sort().reduce((result: any, key: string) => {
        result[key] = (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) 
          ? sortObject(obj[key]) 
          : obj[key];
        return result;
      }, {});
    }

    const sortedPayload = sortObject(payload);
    const stringifiedPayload = JSON.stringify(sortedPayload);

    // Create HMAC-SHA512 signature
    const hmac = crypto.createHmac('sha512', secret);
    hmac.update(stringifiedPayload);
    const calculatedSignature = hmac.digest('hex');

    // Verify signature
    if (calculatedSignature !== signature) {
      console.error('Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process payment
    if (payload.payment_status === 'finished') {
      const streamlabsToken = process.env.STREAMLABS_ACCESS_TOKEN;
      if (!streamlabsToken) {
        console.error('STREAMLABS_ACCESS_TOKEN is not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const streamlabsPayload = {
        name: payload.order_id,
        amount: Number(payload.price_amount || payload.pay_amount),
        currency: 'USD',
        message: `(${payload.pay_amount} ${payload.pay_currency.toUpperCase()}) ${payload.order_description || ''}`,
        identifier: String(payload.payment_id)
      };

      console.log("Sending to Streamlabs:", streamlabsPayload);

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
        console.error("SL Error:", await response.text());
        return NextResponse.json({ error: 'Failed to forward donation to Streamlabs' }, { status: 502 });
      }

      console.log('Successfully sent donation to Streamlabs');
    }

    return NextResponse.json({ status: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
