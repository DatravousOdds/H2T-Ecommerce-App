import { auth } from "../../../api/firebase-client.js";
import { escapeHtml } from "../../../core/escapeHtml.js";

const STATUS_LABELS = {
  delivered: "Delivered",
  processing: "Processing",
  shipped: "Shipped",
  pending_authentication: "Pending authentication",
  pending: "Unpaid checkout",
  cancelled: "Cancelled",
  refunded: "Refunded",
  unknown: "Unknown (legacy)"
};

const formatNumber = (n) => n.toLocaleString("en-US");
const formatMoney = (cents) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const formatPercent = (part, whole) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "—");
const formatHours = (ms) => (ms == null ? "—" : `${(ms / 3600000).toFixed(1)}h`);
const plural = (n, one, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });

function statTile(label, value, note = "") {
  return `
    <div class="admin-stat">
      <h3 class="admin-stat__label">${label}</h3>
      <p class="admin-stat__value">${value}</p>
      ${note ? `<p class="admin-stat__note">${note}</p>` : ""}
    </div>`;
}

// A queue at 0 is a calm "All clear" tile; a queue with work turns red and,
// when it has a review page, the whole tile becomes the link (big target).
function actionTile({ count, label, href }) {
  const isClear = count === 0;
  // Same label -> value -> note order as every other tile.
  const body = `
      <h3 class="admin-stat__label">${label}</h3>
      <p class="admin-stat__value">${isClear ? '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>' : formatNumber(count)}</p>
      <p class="admin-stat__note">${isClear ? "All clear" : href ? "Review →" : "No review page yet"}</p>`;

  if (isClear) return `<div class="admin-stat admin-action admin-action--clear">${body}</div>`;
  if (!href) return `<div class="admin-stat admin-action admin-action--alert">${body}</div>`;
  return `<a class="admin-stat admin-action admin-action--alert admin-action--link" href="${href}" aria-label="${formatNumber(count)} ${label}. Review">${body}</a>`;
}

function renderStatus(needsAction) {
  const pending = needsAction.disputes + needsAction.tier1 + needsAction.stuck + needsAction.failedPayouts;
  const status = document.getElementById("admin-status");
  status.className = `admin-dashboard__status admin-dashboard__status--${pending ? "alert" : "ok"}`;
  status.innerHTML = pending
    ? `<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> ${formatNumber(pending)} ${pending === 1 ? "item needs" : "items need"} your attention`
    : `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> All caught up`;
  status.hidden = false;
}

function table(headers, rows, emptyText) {
  if (!rows.length) return `<p class="admin-dashboard__empty">${emptyText}</p>`;
  return `
    <table class="admin-table">
      <thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
}

// [light end at 0, full color at the top of the plot area]
const BAR_GRADIENTS = {
  // Light end deep enough that a 1-signup bar stays visible on white.
  month: ["#ffa3ab", "#f30c1e"],
  monthHover: ["#ff7a85", "#c20a18"],
  // Current month is partial -- grey so it doesn't read as a drop.
  current: ["#f3f3f3", "#c4c4c4"],
  currentHover: ["#e5e5e5", "#a3a3a3"]
};

// The gradient spans the whole plot area rather than each bar, so taller
// bars end in a deeper shade.
function barGradient({ chart, dataIndex }, isCurrentMonth, isHover) {
  const [from, to] = BAR_GRADIENTS[`${isCurrentMonth ? "current" : "month"}${isHover ? "Hover" : ""}`];
  const { ctx, chartArea } = chart;
  if (!chartArea) return to; // first layout pass, before the plot area exists
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  return gradient;
}

// Readable on the #070707 tooltip (all >= 7:1). The arrows carry direction
// too, so color is never the only signal.
const TREND_COLORS = { up: "#4ade80", down: "#ff6b75", flat: "#d4d4d4" };

// Tooltip footer: change vs the previous month. Skipped for the first bar
// and for the current month, whose partial count would always look like a drop.
function monthOverMonth(values, keys, i) {
  if (i === 0) return { text: "", trend: "flat" };
  if (i === keys.length - 1) return { text: "Month in progress", trend: "flat" };
  const [prev, cur] = [values[i - 1], values[i]];
  const prevMonth = monthLabel(keys[i - 1]);
  if (prev === cur) return { text: `Same as ${prevMonth}`, trend: "flat" };
  if (prev === 0) return { text: `▲ Up from 0 in ${prevMonth}`, trend: "up" };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { text: `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs ${prevMonth}`, trend: pct > 0 ? "up" : "down" };
}

function renderSignupsChart(signupsByMonth) {
  const keys = Object.keys(signupsByMonth);
  const values = keys.map((k) => signupsByMonth[k]);
  const lastIndex = keys.length - 1;
  const canvas = document.getElementById("admin-signups-chart");
  canvas.setAttribute("aria-label", `Signups per month: ${keys.map((k) => `${monthLabel(k)} ${signupsByMonth[k]}`).join(", ")}`);

  // Re-rendering onto a canvas that already has a chart throws in Chart.js.
  Chart.getChart(canvas)?.destroy();
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: keys.map((k, i) => (i === lastIndex ? `${monthLabel(k)} (so far)` : monthLabel(k))),
      datasets: [{
        label: "Signups",
        data: values,
        backgroundColor: (ctx) => barGradient(ctx, ctx.dataIndex === lastIndex, false),
        // Chart.js can't auto-darken a gradient on hover, so give it one.
        hoverBackgroundColor: (ctx) => barGradient(ctx, ctx.dataIndex === lastIndex, true),
        borderRadius: 6
      }]
    },
    options: {
      maintainAspectRatio: false,
      // Hovering anywhere in a month's column shows its tooltip, not just the bar.
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#070707",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          // Scriptable: recolored for whichever month is being hovered.
          footerColor: ({ tooltip }) => {
            const i = tooltip?.dataPoints?.[0]?.dataIndex;
            return i == null ? TREND_COLORS.flat : TREND_COLORS[monthOverMonth(values, keys, i).trend];
          },
          titleFont: { family: "'Space Grotesk', sans-serif", size: 14, weight: "700" },
          bodyFont: { family: "'Inter', sans-serif", size: 13 },
          footerFont: { family: "'Inter', sans-serif", size: 12, weight: "500" },
          padding: 12,
          cornerRadius: 8,
          caretSize: 6,
          displayColors: false,
          yAlign: "bottom", // sit above the bar instead of covering its neighbor
          animation: { duration: 150 },
          callbacks: {
            title: ([item]) => new Date(`${keys[item.dataIndex]}-01T00:00:00Z`)
              .toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
            label: (item) => `${item.parsed.y} ${item.parsed.y === 1 ? "signup" : "signups"}`,
            footer: ([item]) => monthOverMonth(values, keys, item.dataIndex).text
          }
        }
      },
      scales: {
        // Vertical gridlines add noise between bars; keep faint horizontals only.
        x: { grid: { display: false }, border: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#f0f0f0" }, border: { display: false } }
      }
    }
  });
}

function renderStats(stats) {
  const { needsAction, users, orders, disputes, sellerDebt } = stats;
  const reviewPage = "/admin/delivery-confirmation-review";

  const asOf = new Date(stats.computedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const meta = document.getElementById("admin-stats-meta");
  meta.textContent = stats.stale
    ? `Showing stats from ${asOf} -- the latest refresh failed, so these may be out of date.`
    : `Stats as of ${asOf} · refreshes every 10 min · test orders excluded`;
  meta.classList.toggle("admin-dashboard__meta--stale", Boolean(stats.stale));

  renderStatus(needsAction);

  // At-a-glance band; the sections below hold the detail.
  document.getElementById("admin-headline").innerHTML = [
    ["New signups", formatNumber(users.signedUp30d)],
    ["Active users", formatNumber(users.active30d)],
    ["Orders placed", formatNumber(orders.last30d)],
    ["Sales", formatMoney(orders.salesCents30d)]
  ].map(([label, value]) => `<div class="admin-headline__item"><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  document.getElementById("admin-needs-action").innerHTML = [
    { count: needsAction.disputes, label: "Disputes to review", href: `${reviewPage}#disputes-list` },
    // Only orders whose seller has sent photos -- the rest are waiting on sellers.
    { count: needsAction.tier1, label: "Authentication photos to review", href: "/admin/order-authentication-review" },
    { count: needsAction.stuck, label: "Orders stuck over 3 days" },
    { count: needsAction.failedPayouts, label: "Failed payouts", href: `${reviewPage}#failed-payouts-list` }
  ].map(actionTile).join("");

  // In transit is information, not a task, so it lives with order statuses.
  document.getElementById("admin-in-transit").innerHTML = needsAction.inTransit
    ? `<a class="admin-dashboard__panel-link" href="${reviewPage}#in-transit-list">${formatNumber(needsAction.inTransit)} prepaid-label ${needsAction.inTransit === 1 ? "order" : "orders"} in transit →</a>`
    : "No prepaid-label orders in transit";

  document.getElementById("admin-users").innerHTML = [
    statTile("Total signups", formatNumber(users.total),
      users.signedUp30d ? `${formatNumber(users.signedUp30d)} new in the last 30 days` : "No new signups in 30 days"),
    statTile("Active in last 30 days", formatPercent(users.active30d, users.total), `${formatNumber(users.active30d)} of ${plural(users.total, "user")}`),
    statTile("30-day retention", formatPercent(users.retained, users.signedUpBefore30d), "Signed up 30+ days ago, still active"),
    statTile("Repeat buyers", formatPercent(orders.repeatBuyers, orders.buyers), `${formatNumber(orders.repeatBuyers)} of ${plural(orders.buyers, "buyer")} ordered 2+ times`)
  ].join("");
  renderSignupsChart(users.signupsByMonth);

  document.getElementById("admin-orders").innerHTML = [
    statTile("Total orders", formatNumber(orders.total),
      orders.last30d ? `${formatNumber(orders.last30d)} in the last 30 days` : "No new orders in 30 days"),
    statTile("Sales · last 30 days", formatMoney(orders.salesCents30d), "Item prices, excluding tax, shipping and fees"),
    statTile("Average sale", orders.captured30d ? formatMoney(orders.salesCents30d / orders.captured30d) : "—",
      orders.captured30d ? "Last 30 days" : "No paid orders in 30 days"),
    statTile("Fees earned · last 30 days", formatMoney(orders.feesCents30d), "Hexxo's marketplace fees")
  ].join("");

  const statuses = Object.entries(orders.byStatus).sort((a, b) => b[1] - a[1]);
  document.getElementById("admin-orders-by-status").innerHTML = statuses.length
    ? statuses.map(([status, count]) => `
        <li class="admin-dashboard__row">
          <span class="admin-badge admin-badge--${escapeHtml(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
          <span class="admin-dashboard__count">${formatNumber(count)}</span>
        </li>`).join("")
    : `<li class="admin-dashboard__empty">No orders yet</li>`;

  const topSales = orders.topBrands[0]?.sales || 1;
  document.getElementById("admin-top-brands").innerHTML = orders.topBrands.length
    ? orders.topBrands.map(({ brand, sales }) => `
        <li class="admin-brand">
          <div class="admin-dashboard__row"><span>${escapeHtml(brand)}</span><span class="admin-dashboard__count">${formatNumber(sales)}</span></div>
          <div class="admin-brand__track"><div class="admin-brand__bar" style="width: ${(sales / topSales) * 100}%; --track-width: ${(topSales / sales) * 100}%"></div></div>
        </li>`).join("")
    : `<li class="admin-dashboard__empty">No sales yet</li>`;

  const { passed, failed, avgReviewMs } = orders.tier1;
  const refunded = orders.byStatus.refunded || 0;
  document.getElementById("admin-trust").innerHTML = [
    // Rates are out of paid orders: unpaid, cancelled or still-authorizing
    // orders can't be disputed or refunded, so they'd only dilute the rate.
    statTile("Dispute rate", formatPercent(disputes.total, orders.paid),
      `${disputes.byStatus.submitted} open · ${disputes.byStatus.upheld} upheld · ${disputes.byStatus.rejected} rejected`),
    statTile("Refund rate", formatPercent(refunded, orders.paid), refunded ? plural(refunded, "refunded order") : "No refunds"),
    // Pass rate and review speed share a tile: both describe Tier 1.
    statTile("Tier 1 authentication", formatPercent(passed, passed + failed),
      passed + failed
        ? `${passed} passed · ${failed} failed${avgReviewMs == null ? "" : ` · ${formatHours(avgReviewMs)} avg review`}`
        : "No authentications yet"),
    statTile("Seller debt owed", formatMoney(sellerDebt.outstandingCents),
      // Debts come from return shipping and prepaid labels, so stay neutral.
      sellerDebt.sellers
        ? `${plural(sellerDebt.sellers, "seller")} ${sellerDebt.sellers === 1 ? "has an unpaid balance" : "have unpaid balances"}`
        : "No sellers owe anything")
  ].join("");

  document.getElementById("admin-refunds-by-buyer").innerHTML = table(
    ["Buyer", "Refunds", "Amount"],
    orders.refundsByBuyer.map((r) => [escapeHtml(r.email || r.buyerId || "Unknown"), formatNumber(r.count), formatMoney(r.amountCents)]),
    "No refunds yet"
  );

  document.getElementById("admin-sellers-by-disputes").innerHTML = table(
    ["Seller", "Disputes", "Upheld"],
    disputes.topSellers.map((s) => [
      escapeHtml(s.username ? `@${s.username}` : s.sellerId),
      formatNumber(s.disputes),
      s.upheld ? `<span class="admin-badge admin-badge--refunded">${formatNumber(s.upheld)}</span>` : "0"
    ]),
    "No disputes yet"
  );
}

const SKELETON_TILE = `
  <div class="admin-stat" aria-hidden="true">
    <span class="skeleton admin-skeleton admin-skeleton--label"></span>
    <span class="skeleton admin-skeleton admin-skeleton--value"></span>
    <span class="skeleton admin-skeleton admin-skeleton--note"></span>
  </div>`;
const skeletonRows = (count, tag) =>
  `<${tag} aria-hidden="true"><span class="skeleton admin-skeleton admin-skeleton--row"></span></${tag}>`.repeat(count);

// Placeholders shaped like the real content, so the page doesn't jump when
// the numbers arrive.
function showLoading() {
  document.getElementById("admin-dashboard").setAttribute("aria-busy", "true");
  document.getElementById("admin-error").hidden = true;
  document.getElementById("admin-status").hidden = true;
  document.querySelectorAll("#admin-dashboard .admin-dashboard__section").forEach((s) => { s.hidden = false; });

  const meta = document.getElementById("admin-stats-meta");
  meta.textContent = "Loading stats…";
  meta.classList.remove("admin-dashboard__meta--stale");

  for (const [id, tiles] of [["admin-needs-action", 4], ["admin-users", 4], ["admin-orders", 4], ["admin-trust", 4]]) {
    document.getElementById(id).innerHTML = SKELETON_TILE.repeat(tiles);
  }
  document.getElementById("admin-headline").innerHTML =
    `<div class="admin-headline__item" aria-hidden="true"><dt><span class="skeleton admin-skeleton admin-skeleton--label"></span></dt><dd><span class="skeleton admin-skeleton admin-skeleton--value"></span></dd></div>`.repeat(4);
  for (const id of ["admin-orders-by-status", "admin-top-brands"]) {
    document.getElementById(id).innerHTML = skeletonRows(3, "li");
  }
  for (const id of ["admin-refunds-by-buyer", "admin-sellers-by-disputes"]) {
    document.getElementById(id).innerHTML = skeletonRows(2, "div");
  }
  document.getElementById("admin-in-transit").textContent = "";
}

// One clear error panel instead of empty sections, with a retry that
// doesn't need a full page refresh.
function showError(user) {
  document.querySelectorAll("#admin-dashboard .admin-dashboard__section").forEach((s) => { s.hidden = true; });
  document.getElementById("admin-stats-meta").textContent = "";
  document.getElementById("admin-error").hidden = false;

  const retry = document.getElementById("admin-retry");
  // onclick (not addEventListener) so repeated failures don't stack handlers.
  retry.onclick = async () => {
    retry.disabled = true;
    retry.textContent = "Retrying…";
    await loadStats(user);
    retry.disabled = false;
    retry.textContent = "Try again";
  };
}

async function loadStats(user) {
  showLoading();
  let body;
  try {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${idToken}` } });
    body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.message || `HTTP ${response.status}`);
  } catch (error) {
    console.error("Admin stats failed to load:", error);
    document.getElementById("admin-dashboard").removeAttribute("aria-busy");
    showError(user);
    return;
  }

  // Separate from the fetch: a drawing bug (e.g. the chart) shouldn't be
  // reported as "couldn't load" with a retry that can never succeed.
  try {
    renderStats(body);
  } catch (error) {
    console.error("Admin stats failed to render:", error);
    const meta = document.getElementById("admin-stats-meta");
    meta.textContent = "Some stats couldn't be displayed. Refresh the page to try again.";
    meta.classList.add("admin-dashboard__meta--stale");
  } finally {
    document.getElementById("admin-dashboard").removeAttribute("aria-busy");
  }
}

// Reveals the Admin tab for users with the `admin` custom claim. This is a UX
// gate only -- /api/admin/stats re-checks the claim server-side.
export async function initAdmin() {
  const user = auth.currentUser;
  if (!user) return;

  // No forced refresh: it would cost every profile visitor a network call.
  // A newly granted admin sees the tab after their token refreshes (<1h) or
  // on next login.
  const { claims } = await user.getIdTokenResult();
  if (claims.admin !== true) return;

  const tabButton = document.getElementById("admin-tab-btn");
  tabButton.hidden = false;
  document.getElementById("admin-dashboard").hidden = false;

  // Load on first open, not on every profile visit: a recompute scans every
  // user and order, and admins mostly visit their profile for other tabs.
  const openedDirectly = new URLSearchParams(window.location.search).get("tab") === "admin";
  if (openedDirectly) return loadStats(user);
  tabButton.addEventListener("click", () => loadStats(user), { once: true });
}
