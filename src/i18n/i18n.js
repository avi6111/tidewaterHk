// src/i18n/i18n.js
import en from './en.js';
import zh from './zh.js';
import enFishcard from './en_fishcard.js';
import zhFishcard from './zh_fishcard.js';
const dictionaries = { en:{...en, ...enFishcard}, zh: {...zh, ...zhFishcard} };
let current = localStorage.getItem('tidewater.language') || 'zh';

export function i18nlanguage() {
  return current;
}

export function t(key) {
  return dictionaries[current][key] ?? dictionaries.en[key] ?? key;
}
//region 监听 html 元素的语言变化
// export function translate(root = document) {
//   const elements = [];
//   if (root instanceof Element && root.matches('[data-i18n]')) elements.push(root);
//   elements.push(...root.querySelectorAll('[data-i18n]'));

//   for (const element of elements) {
//     const value = t(element.dataset.i18n);
//     if (element.textContent !== value) element.textContent = value;
//   }
// }
export function translate(root = document) {
  const elements = [];
  if (root instanceof Element && root.matches('[data-i18n]')) elements.push(root);
  elements.push(...root.querySelectorAll('[data-i18n]'));

  // 先翻译内层节点，再翻译外层，确保插槽克隆的是当前语言的节点。
  for (const element of elements.reverse()) {
    const key = element.dataset.i18n;
    const value = t(key);
    const signature = JSON.stringify([key, value]);
    if (element.dataset.i18nRendered === signature) continue;

    const nested = [...element.querySelectorAll('[data-i18n]')];
    const slots = new Map(nested.map((child) => [child.dataset.i18n, child]));
    const placeholder = /\{\{([\w-]+)\}\}/g;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let match;
    let hasPlaceholder = false;

    while ((match = placeholder.exec(value))) {
      hasPlaceholder = true;
      fragment.append(document.createTextNode(value.slice(cursor, match.index)));
      const slot = slots.get(match[1]);
      fragment.append(slot ? slot.cloneNode(true) : document.createTextNode(match[0]));
      cursor = placeholder.lastIndex;
    }

    if (hasPlaceholder) {
      fragment.append(document.createTextNode(value.slice(cursor)));
      element.replaceChildren(fragment);
    } else if (element.textContent !== value) {
      element.textContent = value;
    }

    element.dataset.i18nRendered = signature;
  }
}

export function observeTranslations(root = document.body) {
  translate(root);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) translate(node);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });

  window.addEventListener('tidewater-languagechange', () => translate(root));
  return observer;
}
//endregion

//region 必须刷新    在onChange时必须调用
export function setLanguage(next) {
  current = next === 'zh' ? 'zh' : 'en';
  localStorage.setItem('tidewater.language', current);
  window.dispatchEvent(new CustomEvent('tidewater-languagechange', {
    detail: { language: current },
  }));
}