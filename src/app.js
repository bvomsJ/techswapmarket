import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let products = [];
let images = [];
let pages = [];
let reviews = [];
let settings = { ...CONFIG };
let cart = JSON.parse(localStorage.getItem('tsm_cart') || '{}');

const $ = s => document.querySelector(s);

const fmt = n =>
  new Intl.NumberFormat('ru-RU').format(n) + ' ' + (settings.currency || '₽');

function toast(t) {
  const e = $('#toast');
  e.textContent = t;
  e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 2200);
}

async function load() {
  const [p, i, pg, r, s] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('sort_order'),

    supabase
      .from('product_images')
      .select('*')
      .order('sort_order'),

    supabase
      .from('pages')
      .select('*')
      .order('sort_order'),

    supabase
      .from('reviews')
      .select('*')
      .eq('is_visible', true)
      .order('created_at', { ascending: false }),

    supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
  ]);

  products = p.data || [];
  images = i.data || [];
  pages = pg.data || [];
  reviews = r.data || [];

  settings = {
    ...settings,
    ...(s.data || {})
  };

  $('#tagline').textContent = settings.tagline;
  $('#footerTagline').textContent = settings.tagline;
  $('#year').textContent = new Date().getFullYear();

  document.title = settings.seo_title || settings.site_name;

  document.querySelector(
    'meta[name=description]'
  ).content = settings.seo_description || '';

  renderNav();
  renderSeries();
  renderProducts();
  renderReviews();
  renderCart();
  updateTelegram();
}

function renderNav() {
  const nav = $('#nav');

  nav.innerHTML =
    '<a href="./">Каталог</a>' +
    pages
      .filter(x => x.is_visible && x.show_in_nav)
      .map(
        p =>
          `<a href="?page=${encodeURIComponent(p.slug)}">${esc(
            p.title
          )}</a>`
      )
      .join('');

  $('#footerPages').innerHTML = pages
    .filter(x => x.is_visible)
    .map(
      p =>
        `<a href="?page=${encodeURIComponent(p.slug)}">${esc(
          p.title
        )}</a>`
    )
    .join('');
}

function renderSeries() {
  const vals = [...new Set(products.map(p => p.series))];

  $('#series').innerHTML =
    '<option value="">Все серии</option>' +
    vals.map(x => `<option>${esc(x)}</option>`).join('');
}

function filtered() {
  let a = [...products];

  const q = $('#search').value.toLowerCase().trim();
  const ser = $('#series').value;
  const st = $('#storage').value;
  const co = $('#condition').value;
  const max =
    Number($('#maxPrice').value) || Infinity;

  if (q) {
    a = a.filter(p =>
      `${p.name} ${p.series} ${p.model} ${p.color} ${p.storage_gb}`
        .toLowerCase()
        .includes(q)
    );
  }

  if (ser) {
    a = a.filter(p => p.series === ser);
  }

  if (st) {
    a = a.filter(p => String(p.storage_gb) === st);
  }

  if (co) {
    a = a.filter(p => p.condition === co);
  }

  a = a.filter(p => Number(p.price) <= max);

  const sort = $('#sort').value;

  if (sort === 'priceAsc') {
    a.sort((x, y) => x.price - y.price);
  }

  if (sort === 'priceDesc') {
    a.sort((x, y) => y.price - x.price);
  }

  if (sort === 'new') {
    a.sort(
      (x, y) =>
        new Date(y.created_at) -
        new Date(x.created_at)
    );
  }

  return a;
}

function renderProducts() {
  const a = filtered();

  $('#resultCount').textContent =
    `${a.length} ${
      a.length === 1
        ? 'устройство'
        : a.length < 5
        ? 'устройства'
        : 'устройств'
    }`;

  $('#emptyState').classList.toggle(
    'hidden',
    a.length > 0
  );

  $('#productGrid').innerHTML = a
    .map(p => {
      const im =
        images.find(x => x.product_id === p.id)
          ?.public_url ||
        'assets/phone-placeholder.svg';

      return `
        <article class="card" data-product="${p.id}">
          <div class="badges">
            ${
              p.featured
                ? '<span class="badge">Рекомендуем</span>'
                : ''
            }

            ${
              p.stock <= 0
                ? '<span class="badge">Нет в наличии</span>'
                : ''
            }
          </div>

          <img
            src="${im}"
            alt="${esc(p.name)}"
            loading="lazy"
          >

          <div class="name">
            ${esc(p.name)}
          </div>

          <div class="desc">
            ${esc(
              p.short_description ||
                p.description ||
                'Подробности внутри карточки'
            )}
          </div>

          <div class="price">
            ${fmt(p.price)}

            ${
              p.old_price
                ? `<span class="old">${fmt(
                    p.old_price
                  )}</span>`
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');

  document
    .querySelectorAll('[data-product]')
    .forEach(e => {
      e.onclick = () =>
        openProduct(e.dataset.product);
    });
}

function openProduct(id) {
  const p = products.find(x => x.id === id);
  const ims = images.filter(
    x => x.product_id === id
  );

  if (!p) return;

  const first =
    ims[0]?.public_url ||
    'assets/phone-placeholder.svg';

  $('#modalBody').innerHTML = `
    <div class="product-detail">

      <div>
        <img
          id="detailImage"
          src="${first}"
          alt="${esc(p.name)}"
        >

        <div class="thumbs">
          ${ims
            .map(
              i => `
                <img
                  src="${i.public_url}"
                  alt=""
                  data-thumb="${i.public_url}"
                >
              `
            )
            .join('')}
        </div>
      </div>

      <div>

        <span class="eyebrow">
          ${esc(p.series)}
        </span>

        <h2>
          ${esc(p.name)}
        </h2>

        <p
          class="tag"
          style="text-align:left"
        >
          ${esc(p.description || '')}
        </p>

        <div
          class="price"
          style="font-size:1.4rem"
        >
          ${fmt(p.price)}
        </div>

        <div class="specs">
          ${specRows(p)}
        </div>

        <p
          class="tag"
          style="text-align:left"
        >
          ${esc(p.included || '')}
        </p>

        <button
          class="btn solid"
          style="width:100%;margin-top:12px"
          id="addDetail"
        >
          Добавить в корзину
        </button>

      </div>

    </div>
  `;

  document
    .querySelectorAll('[data-thumb]')
    .forEach(x => {
      x.onclick = () =>
        ($('#detailImage').src =
          x.dataset.thumb);
    });

  $('#addDetail').onclick = () => {
    addCart(id);
    closeModal();
  };

  openModal();
}

function specRows(p) {
  return [
    ['Состояние', p.condition],
    [
      'Память',
      p.storage_gb
        ? p.storage_gb + ' ГБ'
        : '—'
    ],
    ['Цвет', p.color || '—'],
    [
      'Аккумулятор',
      p.battery_percent
        ? p.battery_percent + '%'
        : '—'
    ],
    [
      'Гарантия',
      p.warranty || 'Уточняется'
    ]
  ]
    .map(
      ([a, b]) =>
        `<div class="spec-row">
          <span>${a}</span>
          <strong>${esc(String(b))}</strong>
        </div>`
    )
    .join('');
}

function addCart(id) {
  cart[id] = (cart[id] || 0) + 1;

  localStorage.setItem(
    'tsm_cart',
    JSON.stringify(cart)
  );

  renderCart();
  toast('Добавлено в корзину');
}

function renderCart() {
  const n = Object.values(cart).reduce(
    (a, b) => a + b,
    0
  );

  $('#cartCount').textContent = n;
  $('#floatCount').textContent = n;
}

function openCart() {
  const rows = Object.entries(cart).filter(
    ([, q]) => q > 0
  );

  let total = 0;

  const html = rows.length
    ? rows
        .map(([id, q]) => {
          const p = products.find(
            x => x.id === id
          );

          if (!p) return '';

          total += p.price * q;

          const im =
            images.find(
              x => x.product_id === id
            )?.public_url ||
            'assets/phone-placeholder.svg';

          return `
            <div class="cart-row">

              <img src="${im}">

              <div class="grow">

                <strong>
                  ${esc(p.name)}
                </strong>

                <div
                  class="tag"
                  style="text-align:left"
                >
                  ${fmt(p.price)}
                </div>

              </div>

              <div class="qty">

                <button
                  class="step"
                  data-dec="${id}"
                >
                  −
                </button>

                ${q}

                <button
                  class="step"
                  data-inc="${id}"
                >
                  +
                </button>

              </div>

            </div>
          `;
        })
        .join('')
    : '<div class="empty">Корзина пуста</div>';

  $('#modalBody').innerHTML = `
    <h2>Корзина</h2>

    ${html}

    <div
      class="total"
      style="
        display:flex;
        justify-content:space-between;
        margin:18px 0;
        font-weight:600
      "
    >
      <span>Итого</span>
      <span>${fmt(total)}</span>
    </div>

    ${
      rows.length
        ? `
          <button
            class="btn solid"
            style="width:100%"
            id="checkout"
          >
            Оформить заказ
          </button>
        `
        : ''
    }
  `;

  document
    .querySelectorAll('[data-inc]')
    .forEach(b => {
      b.onclick = () =>
        changeQty(b.dataset.inc, 1);
    });

  document
    .querySelectorAll('[data-dec]')
    .forEach(b => {
      b.onclick = () =>
        changeQty(b.dataset.dec, -1);
    });

  if (rows.length) {
    $('#checkout').onclick = checkoutForm;
  }

  openModal();
}

function changeQty(id, d) {
  cart[id] = (cart[id] || 0) + d;

  if (cart[id] <= 0) {
    delete cart[id];
  }

  localStorage.setItem(
    'tsm_cart',
    JSON.stringify(cart)
  );

  openCart();
  renderCart();
}

function checkoutForm() {
  const total = Object.entries(cart).reduce(
    (s, [id, q]) =>
      s +
      (products.find(p => p.id === id)?.price ||
        0) *
        q,
    0
  );

  $('#modalBody').innerHTML = `
    <h2>Оформление заказа</h2>

    <p
      class="tag"
      style="text-align:left"
    >
      После отправки заказ сохранится в базе,
      а вам откроется готовое сообщение
      для Telegram.
    </p>

    <div class="form-grid">

      <div>
        <label class="field">
          Имя *
        </label>

        <input
          class="input"
          id="cName"
        >
      </div>

      <div>
        <label class="field">
          Телефон
        </label>

        <input
          class="input"
          id="cPhone"
        >
      </div>

      <div>
        <label class="field">
          Город
        </label>

        <input
          class="input"
          id="cCity"
        >
      </div>

      <div class="full">
        <label class="field">
          Комментарий
        </label>

        <textarea
          id="cComment"
          rows="4"
          class="input"
        ></textarea>
      </div>

    </div>

    <div
      class="total"
      style="
        display:flex;
        justify-content:space-between;
        margin:18px 0;
        font-weight:600
      "
    >
      <span>Итого</span>
      <span>${fmt(total)}</span>
    </div>

    <button
      class="btn solid"
      style="width:100%"
      id="sendOrder"
    >
      Отправить заказ
    </button>
  `;

  $('#sendOrder').onclick = submitOrder;
}

async function submitOrder() {
  const name = $('#cName').value.trim();

  if (!name) {
    toast('Укажите имя');
    return;
  }

  const entries = Object.entries(cart).filter(
    ([, q]) => q > 0
  );

  let total = 0;

  const items = entries.map(([id, q]) => {
    const p = products.find(
      x => x.id === id
    );

    total += p.price * q;

    return {
      product_id: p.id,
      product_name: p.name,
      price: p.price,
      quantity: q
    };
  });

  const { data, error } =
    await supabase
      .from('orders')
      .insert({
        customer_name: name,
        customer_phone: $('#cPhone').value.trim(),
        city: $('#cCity').value.trim(),
        comment: $('#cComment').value.trim(),
        total
      })
      .select()
      .single();

  if (error) {
    toast('Не удалось сохранить заказ');
    console.error(error);
    return;
  }

  await supabase
    .from('order_items')
    .insert(
      items.map(x => ({
        ...x,
        order_id: data.id
      }))
    );

  const lines = items.map(
    (x, i) =>
      `${i + 1}) ${x.product_name} × ${
        x.quantity
      } — ${fmt(x.price * x.quantity)}`
  );

  const text =
    `Здравствуйте! Хочу оформить заказ №${data.order_number}.\n\n` +
    `${lines.join('\n')}\n\n` +
    `Итого: ${fmt(total)}\n\n` +
    `Имя: ${name}\n` +
    `Телефон: ${$('#cPhone').value.trim()}\n` +
    `Город: ${$('#cCity').value.trim()}\n` +
    `Комментарий: ${$('#cComment').value.trim()}`;

  cart = {};

  localStorage.removeItem('tsm_cart');

  renderCart();
  closeModal();

  window.open(
    `https://t.me/${
      settings.telegram_username ||
      CONFIG.TELEGRAM_USERNAME
    }?text=${encodeURIComponent(text)}`,
    '_blank'
  );

  toast('Заказ создан');
}

function renderReviews() {
  $('#reviews').innerHTML = reviews.length
    ? reviews
        .slice(0, 6)
        .map(
          r => `
            <article class="review">

              <div class="stars">
                ${'★'.repeat(r.rating)}
                ${'☆'.repeat(5 - r.rating)}
              </div>

              <strong>
                ${esc(r.author_name)}
              </strong>

              <p>
                ${esc(r.text)}
              </p>

            </article>
          `
        )
        .join('')
    : '<p class="tag">Пока отзывов нет.</p>';
}

function updateTelegram() {
  const u = (
    settings.telegram_username ||
    CONFIG.TELEGRAM_USERNAME
  ).replace(/^@/, '');

  $('#tgFooter').href =
    'https://t.me/' + u;
}

function openModal() {
  $('#modal').classList.add('open');
}

function closeModal() {
  $('#modal').classList.remove('open');
}

function esc(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c])
  );
}

$('#search').oninput = renderProducts;

[
  'series',
  'storage',
  'condition',
  'maxPrice',
  'sort'
].forEach(id => {
  $('#' + id).oninput = renderProducts;
});

$('#resetFilters').onclick = () => {
  ['search', 'maxPrice'].forEach(
    id => ($('#' + id).value = '')
  );

  [
    'series',
    'storage',
    'condition',
    'sort'
  ].forEach(
    id =>
      ($('#' + id).selectedIndex = 0)
  );

  renderProducts();
};

$('#filterToggle').onclick = () =>
  $('#filters').classList.toggle('open');

$('#openCart').onclick = openCart;
$('#cartFloat').onclick = openCart;

$('#modal').onclick = e => {
  if (
    e.target.id === 'modal' ||
    e.target.hasAttribute('data-close')
  ) {
    closeModal();
  }
};

(async () => {
  const params = new URLSearchParams(
    location.search
  );

  if (params.get('page')) {
    await load();

    const p = pages.find(
      x => x.slug === params.get('page')
    );

    if (p) {
      $('#modalBody').innerHTML = `
        <h2>${esc(p.title)}</h2>

        <div
          style="
            line-height:1.7;
            color:var(--dim);
            white-space:pre-wrap
          "
        >
          ${esc(p.content)}
        </div>
      `;

      openModal();
      return;
    }
  }

  await load();
})().catch(e => {
  console.error(e);
  toast('Проверьте настройки Supabase');
});
