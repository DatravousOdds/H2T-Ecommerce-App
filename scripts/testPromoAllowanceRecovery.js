"use strict";

// Exercise the real Stripe route and payment handler without network or database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const slice = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a);
  return source.slice(a, b);
};
const routeSource = slice("app.post('/webhook',", '\n// ShipStation API V2');
const handlerSource = slice('async function handlePaymentIntentSucceeded(', '\napp.use((req, res) =>');
const buildOrderSource = slice('function buildOrderDataFromPaymentIntent(', '\n// Authorization-time counterpart');

function harness({ status = 'pending', missingOrder = false, waived = 50000, used = 0, promoExists = true } = {}) {
  let orders = missingOrder ? {} : { order1: { id: 'pi_test', sellerId: 'seller', fulfillmentStatus: status, item: { name: 'Shoes' } } };
  let allowance = 0, failAllowance = false, sequence = 0, notifications = 0;
  let queue = Promise.resolve();
  const apply = (ref, fields, target = orders) => {
    if (ref.collection === 'sellerPromos') {
      if (failAllowance) { failAllowance = false; throw new Error('temporary allowance failure'); }
      return fields.waivedSalesCents.increment;
    }
    target[ref.id] = { ...target[ref.id], ...fields };
    return 0;
  };
  const ref = (collection, id) => ({ collection, id,
    update: async fields => { allowance += apply({ collection, id }, fields); }
  });
  const snapshot = (paymentId = 'pi_test') => { const entries = Object.entries(orders).filter(([, data]) => data.id === paymentId); return { empty: !entries.length, docs: entries.map(([id, data]) => ({ ref: ref('orders', id), data: () => ({ ...data }) })) }; };
  const query = paymentId => ({ paymentId, get: async () => snapshot(paymentId) });
  const db = {
    collection(name) { return {
      where: (_field, _op, id) => ({ limit: () => query(id) }),
      doc: id => ref(name, id || `generated${++sequence}`),
      add: async fields => { const r = ref(name, `generated${++sequence}`); apply(r, fields); return r; }
    }; },
    runTransaction(callback) {
      const result = queue.then(async () => {
        const writes = [];
        const value = await callback({ get: async r => r.collection === 'sellerPromos' ? { exists: promoExists, data: () => ({ capCents: 1000000, waivedSalesCents: used + allowance }) } : snapshot(r.paymentId),
          update: (r, fields) => writes.push([r, fields]),
          set: (r, fields) => writes.push([r, fields]),
          create: (r, fields) => writes.push([r, fields]) });
        const next = structuredClone(orders);
        let increment = 0;
        for (const [r, fields] of writes) increment += apply(r, fields, next);
        orders = next;
        allowance += increment;
        return value;
      });
      queue = result.catch(() => {});
      return result;
    }
  };
  let route;
  const context = {
    MARKETPLACE_FEE_RATE: 0.07, db, console: { log() {}, error() {} }, endpointSecret: null,
    app: { post: (_path, _middleware, handler) => { route = handler; } },
    express: { raw: () => null },
    stripe: { paymentIntents: { retrieve: async () => ({ latest_charge: { balance_transaction: { fee: 100, available_on: 1 } } }) } },
    admin: { firestore: { Timestamp: { fromMillis: v => v }, FieldValue: { serverTimestamp: () => 1, increment: value => ({ increment: value }) } } },
    sendAdminNotification() {},
    createNotification: async () => { notifications++; }
  };
  vm.runInNewContext(slice('function calculateSellerPayoutCents(', '\n// Reads a seller') + '\n' + buildOrderSource + '\n' + handlerSource + '\n' + routeSource, context);
  const payment = { id: 'pi_test', amount: 53500, status: 'succeeded', metadata: { seller_id: 'seller', item: JSON.stringify({ name: 'Shoes', listingPrice: 500, marketplaceFee: 35, sellerFee: Math.round((50000 - waived) * 0.07) / 100 }), zero_fee_2027_waived_cents: String(waived) } };
  return {
    async deliver(id = 'pi_test') {
      let code;
      await route({ body: { type: 'payment_intent.succeeded', data: { object: { ...payment, id } } }, headers: {} }, { sendStatus: value => { code = value; } });
      // Also expose the old fire-and-forget route's eventual state.
      await new Promise(resolve => setImmediate(resolve));
      return code;
    },
    failNextAllowance: () => { failAllowance = true; },
    order: () => Object.values(orders)[0],
    orders: () => Object.values(orders),
    payouts: () => Object.values(orders).map(context.calculateSellerPayoutCents),
    count: () => Object.keys(orders).length,
    allowance: () => allowance,
    notifications: () => notifications
  };
}

(async () => {
  for (const missingOrder of [false, true]) {
    const h = harness({ missingOrder });
    h.failNextAllowance();
    assert.equal(await h.deliver(), 500, 'failed allowance write must request a Stripe retry');
    assert.notEqual(h.order()?.fulfillmentStatus, 'processing', 'failure must not consume the order transition');
    assert.equal(h.allowance(), 0);
    assert.equal(h.notifications(), 0);
    assert.equal(await h.deliver(), 200);
    assert.equal(h.order().fulfillmentStatus, 'processing');
    assert.equal(h.allowance(), 50000, 'retry must recover the allowance');
    assert.equal(h.count(), 1);
    assert.equal(h.notifications(), 1);
    await Promise.all(Array.from({ length: 5 }, () => h.deliver()));
    assert.equal(h.allowance(), 50000, 'duplicate events must not count twice');
    assert.equal(h.notifications(), 1);

    const racing = harness({ missingOrder });
    await Promise.all(Array.from({ length: 5 }, () => racing.deliver()));
    assert.equal(racing.allowance(), 50000, 'concurrent first events must not count twice');
    assert.equal(racing.count(), 1);
    assert.equal(racing.notifications(), 1);
  }
  for (const status of ['processing', 'shipped', 'delivered', 'refunded']) {
    const h = harness({ status });
    assert.equal(await h.deliver(), 200);
    assert.equal(h.order().fulfillmentStatus, status);
    assert.equal(h.allowance(), 0);
    assert.equal(h.notifications(), 0);
  }
  for (const [used, requested, expectedFees, expectedUsage] of [
    [980000, 20000, [21, 35], 20000],
    [990000, 20000, [28, 35], 10000],
    [1000000, 20000, [35, 35], 0]
  ]) {
    const h = harness({ missingOrder: true, used, waived: requested });
    assert.deepEqual(await Promise.all([h.deliver('pi_one'), h.deliver('pi_two')]), [200, 200]);
    assert.equal(h.allowance(), expectedUsage, 'different purchases must share the remaining cap');
    assert.deepEqual(h.orders().map(o => o.item.sellerFee).sort(), expectedFees.sort());
    assert.ok(h.orders().every(o => o.subtotal === '535.00'), 'buyer total must not change');
    assert.deepEqual(h.payouts().sort(), expectedFees.map(fee => 50000 - Math.round(fee * 100)).sort());
    assert.equal(h.orders().filter(o => o.promoFeeWaived).length, expectedUsage ? 1 : 0);
    assert.equal(h.orders().filter(o => o.stripeFeeCents === 100).length, expectedUsage ? 1 : 0);
    await h.deliver('pi_one');
    assert.equal(h.allowance(), expectedUsage, 'retry must not allocate twice');
  }
  const burst = harness({ missingOrder: true, used: 980000, waived: 20000 });
  const statuses = await Promise.all(Array.from({ length: 20 }, (_, i) => burst.deliver(`pi_burst_${i}`)));
  assert.ok(statuses.every(status => status === 200));
  assert.equal(burst.allowance(), 20000, 'a burst of different sales must stay under the cap');
  assert.equal(burst.orders().reduce((sum, o) => sum + o.zeroFee2027WaivedCents, 0), 20000);
  assert.equal(burst.count(), 20);
  const missingPromo = harness({ missingOrder: true, promoExists: false });
  assert.equal(await missingPromo.deliver(), 500, 'missing eligibility must not acknowledge an unaccounted promo sale');
  assert.equal(missingPromo.count(), 0);
  assert.equal(missingPromo.allowance(), 0);
  const ordinary = harness({ waived: 0 });
  ordinary.failNextAllowance();
  assert.equal(await ordinary.deliver(), 200);
  assert.equal(ordinary.allowance(), 0);
  assert.equal(ordinary.order().fulfillmentStatus, 'processing');
  console.log('Promo allowance recovery self-check passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
