import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

let products = [];
let images = [];
let pages = [];
let reviews = [];
let settings = { ...CONFIG };

let cart = {};

try {
  cart = JSON.parse(localStorage.getItem('tsm_cart') || '{}');
} catch {
  cart = {};
}

const $ = selector => document.querySelector(selector);

const fmt = number =>
  new Intl.NumberFormat('ru-RU').format(Number(number) || 0) +
  ' ' +
  (settings.currency || '₽');

function toast(message) {
  const element = $('#toast');

  if (!element) return;

  element.textContent = message;
  element.classList.add('show');

  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

function saveCart() {
  localStorage.setItem(
    'tsm_cart',
    JSON.stringify(cart)
  );
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[character])
  );
}

async function load() {
  const [
    productsResponse,
    imagesResponse,
    pagesResponse,
    reviewsResponse,
    settingsResponse
  ] = await Promise.all([
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
      .order('created_at', {
        ascending: false
      }),

    supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
  ]);

  if (productsResponse.error) {
    console.error(
      'Products error:',
      productsResponse.error
    );
  }

  if (imagesResponse.error) {
    console.error(
      'Images error:',
      imagesResponse.error
    );
  }

  if (pagesResponse.error) {
    console.error(
      'Pages error:',
      pagesResponse.error
    );
  }

  if (reviewsResponse.error) {
    console.error(
      'Reviews error:',
      reviewsResponse.error
    );
  }

  if (settingsResponse.error) {
    console.error(
      'Settings error:',
      settingsResponse.error
    );
  }

  products = productsResponse.data || [];
  images = imagesResponse.data || [];
  pages = pagesResponse.data || [];
  reviews = reviewsResponse.data || [];

  settings = {
    ...settings,
    ...(settingsResponse.data || {})
  };

  if ($('#tagline')) {
    $('#tagline').textContent =
      settings.tagline || '';
  }

  if ($('#footerTagline')) {
    $('#footerTagline').textContent =
      settings.tagline || '';
  }

  if ($('#year')) {
    $('#year').textContent =
      new Date().getFullYear();
  }

  document.title =
    settings.seo_title ||
    settings.site_name ||
    'techswapmarket';

  const description =
    document.querySelector(
      'meta[name="description"]'
    );

  if (description) {
    description.content =
      settings.seo_description || '';
  }

  renderNav();
  renderSeries();
  renderProducts();
  renderReviews();
  renderCart();
  updateTelegram();
}

function renderNav() {
  const nav = $('#nav');

  if (nav) {
    nav.innerHTML =
      '<a href="./">Каталог</a>' +
      pages
        .filter(
          page =>
            page.is_visible &&
            page.show_in_nav
        )
        .map(
          page =>
            `<a href="?page=${encodeURIComponent(
              page.slug
            )}">${escapeHtml(
              page.title
            )}</a>`
        )
        .join('');
  }

  const footerPages = $('#footerPages');

  if (footerPages) {
    footerPages.innerHTML = pages
      .filter(page => page.is_visible)
      .map(
        page =>
          `<a href="?page=${encodeURIComponent(
            page.slug
          )}">${escapeHtml(
            page.title
          )}</a>`
      )
      .join('');
  }
}

function renderSeries() {
  const select = $('#series');

  if (!select) return;

  const values = [
    ...new Set(
      products.map(product => product.series)
    )
  ];

  select.innerHTML =
    '<option value="">Все серии</option>' +
    values
      .map(
        value =>
          `<option value="${escapeHtml(
            value
          )}">${escapeHtml(value)}</option>`
      )
      .join('');
}

function filteredProducts() {
  let result = [...products];

  const searchElement = $('#search');
  const seriesElement = $('#series');
  const storageElement = $('#storage');
  const conditionElement = $('#condition');
  const maxPriceElement = $('#maxPrice');
  const sortElement = $('#sort');

  const search = (
    searchElement?.value || ''
  )
    .toLowerCase()
    .trim();

  const series =
    seriesElement?.value || '';

  const storage =
    storageElement?.value || '';

  const condition =
    conditionElement?.value || '';

  const maxPrice =
    Number(maxPriceElement?.value) ||
    Infinity;

  if (search) {
    result = result.filter(product =>
      `${product.name} ${product.series} ${product.model} ${product.color} ${product.storage_gb}`
        .toLowerCase()
        .includes(search)
    );
  }

  if (series) {
    result = result.filter(
      product => product.series === series
    );
  }

  if (storage) {
    result = result.filter(
      product =>
        String(product.storage_gb) ===
        String(storage)
    );
  }

  if (condition) {
    result = result.filter(
      product =>
        product.condition === condition
    );
  }

  result = result.filter(
    product =>
      Number(product.price) <= maxPrice
  );

  const sort = sortElement?.value || '';

  if (sort === 'priceAsc') {
    result.sort(
      (a, b) => a.price - b.price
    );
  }

  if (sort === 'priceDesc') {
    result.sort(
      (a, b) => b.price - a.price
    );
  }

  if (sort === 'new') {
    result.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );
  }

  return result;
}

function renderProducts() {
  const result = filteredProducts();

  const resultCount = $('#resultCount');

  if (resultCount) {
    const word =
      result.length === 1
        ? 'устройство'
        : result.length < 5
        ? 'устройства'
        : 'устройств';

    resultCount.textContent =
      `${result.length} ${word}`;
  }

  const emptyState = $('#emptyState');

  if (emptyState) {
    emptyState.classList.toggle(
      'hidden',
      result.length > 0
    );
  }

  const grid = $('#productGrid');

  if (!grid) return;

  grid.innerHTML = result
    .map(product => {
      const image =
        images.find(
          item =>
            item.product_id === product.id
        )?.public_url ||
        'assets/phone-placeholder.svg';

      return `
        <article
          class="card"
          data-product="${product.id}"
        >

          <div class="badges">

            ${
              product.featured
                ? `
                  <span class="badge">
                    Рекомендуем
                  </span>
                `
                : ''
            }

            ${
              Number(product.stock) <= 0
                ? `
                  <span class="badge">
                    Нет в наличии
                  </span>
                `
                : ''
            }

          </div>

          <img
            src="${image}"
            alt="${escapeHtml(
              product.name
            )}"
            loading="lazy"
          >

          <div class="name">
            ${escapeHtml(
              product.name
            )}
          </div>

          <div class="desc">
            ${escapeHtml(
              product.short_description ||
                product.description ||
                'Подробности внутри карточки'
            )}
          </div>

          <div class="price">
            ${fmt(product.price)}

            ${
              product.old_price
                ? `
                  <span class="old">
                    ${fmt(
                      product.old_price
                    )}
                  </span>
                `
                : ''
            }
          </div>

        </article>
      `;
    })
    .join('');

  document
    .querySelectorAll('[data-product]')
    .forEach(element => {
      element.onclick = () =>
        openProduct(
          element.dataset.product
        );
    });
}

function openProduct(id) {
  const product = products.find(
    item => item.id === id
  );

  if (!product) return;

  const productImages = images.filter(
    image =>
      image.product_id === id
  );

  const firstImage =
    productImages[0]?.public_url ||
    'assets/phone-placeholder.svg';

  const modalBody = $('#modalBody');

  if (!modalBody) return;

  modalBody.innerHTML = `
    <div class="product-detail">

      <div>

        <img
          id="detailImage"
          src="${firstImage}"
          alt="${escapeHtml(
            product.name
          )}"
        >

        <div class="thumbs">

          ${productImages
            .map(
              image => `
                <img
                  src="${image.public_url}"
                  alt=""
                  data-thumb="${image.public_url}"
                >
              `
            )
            .join('')}

        </div>

      </div>

      <div>

        <span class="eyebrow">
          ${escapeHtml(
            product.series || ''
          )}
        </span>

        <h2>
          ${escapeHtml(
            product.name
          )}
        </h2>

        <p
          class="tag"
          style="text-align:left"
        >
          ${escapeHtml(
            product.description || ''
          )}
        </p>

        <div
          class="price"
          style="font-size:1.4rem"
        >
          ${fmt(product.price)}
        </div>

        <div class="specs">
          ${specRows(product)}
        </div>

        ${
          product.included
            ? `
              <p
                class="tag"
                style="text-align:left"
              >
                ${escapeHtml(
                  product.included
                )}
              </p>
            `
            : ''
        }

        <button
          class="btn solid"
          style="
            width:100%;
            margin-top:12px
          "
          id="addDetail"
        >
          Добавить в корзину
        </button>

      </div>

    </div>
  `;

  document
    .querySelectorAll('[data-thumb]')
    .forEach(element => {
      element.onclick = () => {
        const detailImage =
          $('#detailImage');

        if (detailImage) {
          detailImage.src =
            element.dataset.thumb;
        }
      };
    });

  const addButton =
    $('#addDetail');

  if (addButton) {
    addButton.onclick = () => {
      addCart(id);
      closeModal();
    };
  }

  openModal();
}

function specRows(product) {
  return [
    [
      'Состояние',
      product.condition || '—'
    ],
    [
      'Память',
      product.storage_gb
        ? `${product.storage_gb} ГБ`
        : '—'
    ],
    [
      'Цвет',
      product.color || '—'
    ],
    [
      'Аккумулятор',
      product.battery_percent
        ? `${product.battery_percent}%`
        : '—'
    ],
    [
      'Гарантия',
      product.warranty ||
        'Уточняется'
    ]
  ]
    .map(
      ([label, value]) => `
        <div class="spec-row">
          <span>
            ${escapeHtml(label)}
          </span>

          <strong>
            ${escapeHtml(
              String(value)
            )}
          </strong>
        </div>
      `
    )
    .join('');
}

function addCart(id) {
  cart[id] = (cart[id] || 0) + 1;

  saveCart();
  renderCart();

  toast('Добавлено в корзину');
}

function renderCart() {
  const count =
    Object.values(cart).reduce(
      (sum, quantity) =>
        sum + Number(quantity),
      0
    );

  const cartCount = $('#cartCount');
  const floatCount = $('#floatCount');

  if (cartCount) {
    cartCount.textContent = count;
  }

  if (floatCount) {
    floatCount.textContent = count;
  }
}

function openCart() {
  const rows =
    Object.entries(cart).filter(
      ([, quantity]) =>
        Number(quantity) > 0
    );

  let total = 0;

  const html = rows.length
    ? rows
        .map(([id, quantity]) => {
          const product =
            products.find(
              item => item.id === id
            );

          if (!product) return '';

          const qty =
            Number(quantity);

          total +=
            Number(product.price) * qty;

          const image =
            images.find(
              item =>
                item.product_id === id
            )?.public_url ||
            'assets/phone-placeholder.svg';

          return `
            <div class="cart-row">

              <img
                src="${image}"
                alt=""
              >

              <div class="grow">

                <strong>
                  ${escapeHtml(
                    product.name
                  )}
                </strong>

                <div
                  class="tag"
                  style="text-align:left"
                >
                  ${fmt(product.price)}
                </div>

              </div>

              <div class="qty">

                <button
                  class="step"
                  data-dec="${id}"
                >
                  −
                </button>

                ${qty}

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
    : `
        <div class="empty">
          Корзина пуста
        </div>
      `;

  const modalBody = $('#modalBody');

  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>
      Корзина
    </h2>

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
      <span>
        Итого
      </span>

      <span>
        ${fmt(total)}
      </span>
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
    .forEach(button => {
      button.onclick = () =>
        changeQty(
          button.dataset.inc,
          1
        );
    });

  document
    .querySelectorAll('[data-dec]')
    .forEach(button => {
      button.onclick = () =>
        changeQty(
          button.dataset.dec,
          -1
        );
    });

  const checkout =
    $('#checkout');

  if (checkout) {
    checkout.onclick =
      checkoutForm;
  }

  openModal();
}

function changeQty(id, delta) {
  cart[id] =
    (cart[id] || 0) + delta;

  if (cart[id] <= 0) {
    delete cart[id];
  }

  saveCart();
  openCart();
  renderCart();
}

function checkoutForm() {
  const total =
    Object.entries(cart).reduce(
      (sum, [id, quantity]) => {
        const product =
          products.find(
            item => item.id === id
          );

        return (
          sum +
          (Number(
            product?.price || 0
          ) *
            Number(quantity))
        );
      },
      0
    );

  const modalBody =
    $('#modalBody');

  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>
      Оформление заказа
    </h2>

    <p
      class="tag"
      style="text-align:left"
    >
      После отправки заказ сохранится
      в базе, а затем откроется готовое
      сообщение для Telegram.
    </p>

    <div class="form-grid">

      <div>

        <label class="field">
          Имя *
        </label>

        <input
          class="input"
          id="cName"
          autocomplete="name"
        >

      </div>

      <div>

        <label class="field">
          Телефон
        </label>

        <input
          class="input"
          id="cPhone"
          type="tel"
          autocomplete="tel"
        >

      </div>

      <div>

        <label class="field">
          Город
        </label>

        <input
          class="input"
          id="cCity"
          autocomplete="address-level2"
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

      <span>
        Итого
      </span>

      <span>
        ${fmt(total)}
      </span>

    </div>

    <button
      class="btn solid"
      style="width:100%"
      id="sendOrder"
    >
      Отправить заказ
    </button>
  `;

  const sendButton =
    $('#sendOrder');

  if (sendButton) {
    sendButton.onclick =
      submitOrder;
  }
}

function generateOrderId() {
  if (
    typeof crypto !== 'undefined' &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  ).replace(
    /[xy]/g,
    character => {
      const random =
        Math.random() * 16 | 0;

      const value =
        character === 'x'
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

async function submitOrder() {
  const nameElement =
    $('#cName');

  const phoneElement =
    $('#cPhone');

  const cityElement =
    $('#cCity');

  const commentElement =
    $('#cComment');

  const sendButton =
    $('#sendOrder');

  const name =
    nameElement?.value.trim() || '';

  const phone =
    phoneElement?.value.trim() || '';

  const city =
    cityElement?.value.trim() || '';

  const comment =
    commentElement?.value.trim() || '';

  if (!name) {
    toast('Укажите имя');
    return;
  }

  const entries =
    Object.entries(cart).filter(
      ([, quantity]) =>
        Number(quantity) > 0
    );

  if (!entries.length) {
    toast('Корзина пуста');
    return;
  }

  let total = 0;

  const items = [];

  for (const [id, quantity] of entries) {
    const product =
      products.find(
        item => item.id === id
      );

    if (!product) continue;

    const qty =
      Number(quantity);

    const price =
      Number(product.price) || 0;

    total += price * qty;

    items.push({
      product_id: product.id,
      product_name: product.name,
      price,
      quantity: qty
    });
  }

  if (!items.length) {
    toast(
      'Не удалось найти товары в корзине'
    );
    return;
  }

  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent =
      'Отправляем...';
  }

  /*
   * ВАЖНО:
   *
   * Мы сами создаём UUID заказа.
   * Поэтому после INSERT нам НЕ нужно
   * делать .select().single().
   *
   * Это позволяет обычному посетителю
   * создать заказ через RLS, не получая
   * права читать таблицу orders.
   */

  const orderId =
    generateOrderId();

  const orderReference =
    orderId
      .replace(/-/g, '')
      .slice(0, 8)
      .toUpperCase();

  const {
    error: orderError
  } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      customer_name: name,
      customer_phone: phone,
      customer_telegram: null,
      city,
      comment,
      total
    });

  if (orderError) {
    console.error(
      'SUPABASE ORDER ERROR:',
      orderError
    );

    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent =
        'Отправить заказ';
    }

    alert(
      'Не удалось создать заказ.\n\n' +
      (orderError.message ||
        'Неизвестная ошибка') +
      '\n\nКод: ' +
      (orderError.code || '—')
    );

    return;
  }

  /*
   * Добавляем позиции заказа.
   */

  const {
    error: itemsError
  } = await supabase
    .from('order_items')
    .insert(
      items.map(item => ({
        ...item,
        order_id: orderId
      }))
    );

  if (itemsError) {
    console.error(
      'SUPABASE ORDER ITEMS ERROR:',
      itemsError
    );

    /*
     * Удалять заказ автоматически здесь
     * не пытаемся — пусть он останется
     * в админке для контроля.
     */

    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent =
        'Отправить заказ';
    }

    alert(
      'Заказ создан, но не удалось сохранить состав заказа.\n\n' +
      (itemsError.message ||
        'Неизвестная ошибка') +
      '\n\nКод: ' +
      (itemsError.code || '—')
    );

    return;
  }

  /*
   * Формируем сообщение для магазина.
   */

  const lines = items.map(
    (item, index) =>
      `${index + 1}) ${
        item.product_name
      } × ${
        item.quantity
      } — ${fmt(
        item.price *
          item.quantity
      )}`
  );

  const telegramUsername = (
    settings.telegram_username ||
    CONFIG.TELEGRAM_USERNAME ||
    ''
  ).replace(/^@/, '');

  const telegramText =
    `Здравствуйте! Новый заказ №${orderReference}.\n\n` +
    `${lines.join('\n')}\n\n` +
    `Итого: ${fmt(total)}\n\n` +
    `Имя: ${name}\n` +
    `Телефон: ${
      phone || 'не указан'
    }\n` +
    `Город: ${
      city || 'не указан'
    }\n` +
    `Комментарий: ${
      comment || 'нет'
    }`;

  /*
   * Очищаем корзину.
   */

  cart = {};

  localStorage.removeItem(
    'tsm_cart'
  );

  renderCart();

  /*
   * Формируем Telegram URL.
   */

  if (telegramUsername) {
    const telegramUrl =
      `https://t.me/${telegramUsername}` +
      `?text=${encodeURIComponent(
        telegramText
      )}`;

    /*
     * location.href вместо window.open().
     *
     * Это важно для iPhone и Telegram
     * WebView: Safari/iOS часто блокирует
     * window.open(), если он вызывается
     * после await.
     */

    window.location.href =
      telegramUrl;
  } else {
    closeModal();

    alert(
      'Заказ №' +
        orderReference +
        ' создан.\n\n' +
        'Telegram магазина пока не настроен.'
    );
  }
}

function renderReviews() {
  const container =
    $('#reviews');

  if (!container) return;

  if (!reviews.length) {
    container.innerHTML =
      '<p class="tag">Пока отзывов нет.</p>';

    return;
  }

  container.innerHTML =
    reviews
      .slice(0, 6)
      .map(
        review => `
          <article class="review">

            <div class="stars">
              ${'★'.repeat(
                Number(
                  review.rating
                ) || 0
              )}

              ${'☆'.repeat(
                5 -
                  (Number(
                    review.rating
                  ) || 0)
              )}
            </div>

            <strong>
              ${escapeHtml(
                review.author_name
              )}
            </strong>

            <p>
              ${escapeHtml(
                review.text
              )}
            </p>

          </article>
        `
      )
      .join('');
}

function updateTelegram() {
  const username = (
    settings.telegram_username ||
    CONFIG.TELEGRAM_USERNAME ||
    ''
  ).replace(/^@/, '');

  const footerTelegram =
    $('#tgFooter');

  if (footerTelegram) {
    footerTelegram.href =
      'https://t.me/' +
      username;
  }
}

function openModal() {
  const modal = $('#modal');

  if (modal) {
    modal.classList.add('open');
  }
}

function closeModal() {
  const modal = $('#modal');

  if (modal) {
    modal.classList.remove('open');
  }
}

/*
 * Search
 */

const search =
  $('#search');

if (search) {
  search.oninput =
    renderProducts;
}

/*
 * Filters
 */

[
  'series',
  'storage',
  'condition',
  'maxPrice',
  'sort'
].forEach(id => {
  const element =
    $('#' + id);

  if (element) {
    element.oninput =
      renderProducts;

    element.onchange =
      renderProducts;
  }
});

/*
 * Reset filters
 */

const resetFilters =
  $('#resetFilters');

if (resetFilters) {
  resetFilters.onclick =
    () => {
      if ($('#search')) {
        $('#search').value =
          '';
      }

      if ($('#maxPrice')) {
        $('#maxPrice').value =
          '';
      }

      [
        'series',
        'storage',
        'condition',
        'sort'
      ].forEach(id => {
        const element =
          $('#' + id);

        if (element) {
          element.selectedIndex =
            0;
        }
      });

      renderProducts();
    };
}

/*
 * Mobile filters
 */

const filterToggle =
  $('#filterToggle');

if (filterToggle) {
  filterToggle.onclick =
    () => {
      const filters =
        $('#filters');

      if (filters) {
        filters.classList.toggle(
          'open'
        );
      }
    };
}

/*
 * Cart buttons
 */

const openCartButton =
  $('#openCart');

if (openCartButton) {
  openCartButton.onclick =
    openCart;
}

const floatingCart =
  $('#cartFloat');

if (floatingCart) {
  floatingCart.onclick =
    openCart;
}

/*
 * Modal close
 */

const modal =
  $('#modal');

if (modal) {
  modal.onclick =
    event => {
      if (
        event.target.id ===
          'modal' ||
        event.target.hasAttribute(
          'data-close'
        )
      ) {
        closeModal();
      }
    };
}

/*
 * Page routes
 */

(async () => {
  try {
    const params =
      new URLSearchParams(
        location.search
      );

    const pageSlug =
      params.get('page');

    if (pageSlug) {
      await load();

      const page =
        pages.find(
          item =>
            item.slug ===
            pageSlug
        );

      if (page) {
        const modalBody =
          $('#modalBody');

        if (modalBody) {
          modalBody.innerHTML = `
            <h2>
              ${escapeHtml(
                page.title
              )}
            </h2>

            <div
              style="
                line-height:1.7;
                color:var(--dim);
                white-space:pre-wrap
              "
            >
              ${escapeHtml(
                page.content
              )}
            </div>
          `;

          openModal();

          return;
        }
      }
    }

    await load();

  } catch (error) {
    console.error(
      'APPLICATION ERROR:',
      error
    );

    toast(
      'Ошибка загрузки сайта'
    );
  }
})();
