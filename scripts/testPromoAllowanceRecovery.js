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

function harness({ status = 'pending', missingOrder = false, waived = 50000 } = {}) {
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
  const snapshot = () => ({ empty: !Object.keys(orders).length, docs: Object.entries(orders).map(([id, data]) => ({ ref: ref('orders', id), data: () => ({ ...data }) })) });
  const query = { get: async () => snapshot() };
  const db = {
    collection(name) { return {
      where: () => ({ limit: () => query }),
      doc: id => ref(name, id || `generated${++sequence}`),
      add: async fields => { const r = ref(name, `generated${++sequence}`); apply(r, fields); return r; }
    }; },
    runTransaction(callback) {
      const result = queue.then(async () => {
        const writes = [];
        const value = await callback({ get: async () => snapshot(),
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
    db, console: { log() {}, error() {} }, endpointSecret: null,
    app: { post: (_path, _middleware, handler) => { route = handler; } },
    express: { raw: () => null },
    stripe: { paymentIntents: { retrieve: async () => ({ latest_charge: { balance_transaction: { fee: 100, available_on: 1 } } }) } },
    admin: { firestore: { Timestamp: { fromMillis: v => v }, FieldValue: { serverTimestamp: () => 1, increment: value => ({ increment: value }) } } },
    sendAdminNotification() {},
    createNotification: async () => { notifications++; }
  };
  vm.runInNewContext(buildOrderSource + '\n' + handlerSource + '\n' + routeSource, context);
  const payment = { id: 'pi_test', amount: 50000, status: 'succeeded', metadata: { seller_id: 'seller', item: JSON.stringify({ name: 'Shoes' }), zero_fee_2027_waived_cents: String(waived) } };
  return {
    async deliver() {
      let code;
      await route({ body: { type: 'payment_intent.succeeded', data: { object: payment } }, headers: {} }, { sendStatus: value => { code = value; } });
      // Also expose the old fire-and-forget route's eventual state.
      await new Promise(resolve => setImmediate(resolve));
      return code;
    },
    failNextAllowance: () => { failAllowance = true; },
    order: () => Object.values(orders)[0],
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
  const ordinary = harness({ waived: 0 });
  ordinary.failNextAllowance();
  assert.equal(await ordinary.deliver(), 200);
  assert.equal(ordinary.allowance(), 0);
  assert.equal(ordinary.order().fulfillmentStatus, 'processing');
  console.log('Promo allowance recovery self-check passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
