import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

interface PaymentWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
      };
    };
  };
  booking_id?: string;
  rider_id?: string;
  driver_id?: string;
  fare_amount?: number;
  platform_fee?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Payment webhook received');

    // Get Razorpay webhook signature for verification
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return new Response(
        JSON.stringify({ error: 'Missing signature or webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the webhook payload
    const body = await req.text();
    const payload: PaymentWebhookPayload = JSON.parse(body);

    // Verify Razorpay webhook signature using HMAC SHA256
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body)
    );
    
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignatureHex) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook signature verified');

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process payment based on event type
    if (payload.event === 'payment.captured') {
      const { id: razorpay_payment_id, order_id, amount, status } = payload.payload.payment.entity;
      
      // Extract additional info from payload (sent during payment creation)
      const { booking_id, rider_id, driver_id, fare_amount, platform_fee } = payload;

      if (!booking_id || !rider_id || !driver_id || !fare_amount) {
        console.error('Missing required payment information', { booking_id, rider_id, driver_id, fare_amount });
        return new Response(
          JSON.stringify({ error: 'Missing required payment information' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert payment record using service role
      const { data, error } = await supabase
        .from('payments')
        .insert({
          booking_id,
          rider_id,
          driver_id,
          amount: fare_amount,
          platform_fee: platform_fee || 0,
          method: 'razorpay',
          status: status === 'captured' ? 'completed' : 'pending',
          razorpay_payment_id,
          razorpay_order_id: order_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting payment:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create payment record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment record created successfully:', data);

      // Update booking status to completed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking_id);

      if (bookingError) {
        console.error('Error updating booking status:', bookingError);
      }

      return new Response(
        JSON.stringify({ success: true, payment: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle failed payments
    if (payload.event === 'payment.failed') {
      console.log('Payment failed:', payload);
      // You can add logic here to update booking status or notify users
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
