/**
 * BizFlow Global State
 */

const State = {
  user: null,
  businesses: [],
  currentBusiness: null,
  currentView: 'dashboard',
  cart: {
    items: [],
    customerId: null,
    discount: 0,
    tax: 0,
    paidAmount: 0,
    paymentMethod: 'cash',
    notes: ''
  },

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
  },

  notify(event, payload) {
    for (const listener of this.listeners) {
      listener(event, payload);
    }
  },

  setCurrentBusiness(bizId) {
    const biz = this.businesses.find(b => String(b.id) === String(bizId));
    if (biz) {
      this.currentBusiness = biz;
      API.setActiveBusinessId(biz.id);
      this.notify('business:changed', biz);
    }
  },

  setView(viewName, params = {}) {
    this.currentView = viewName;
    const targetHash = '#app/' + viewName;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      this.notify('view:changed', { view: viewName, params });
    }
  }
};
