const express = require('express');
const router = express.Router();

const { authenticate, requireBusiness } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

const AuthController = require('../controllers/authController');
const BusinessController = require('../controllers/businessController');
const ProductController = require('../controllers/productController');
const SalesController = require('../controllers/salesController');
const PurchaseController = require('../controllers/purchaseController');
const CustomerController = require('../controllers/customerController');
const SupplierController = require('../controllers/supplierController');
const ExpenseController = require('../controllers/expenseController');
const PaymentController = require('../controllers/paymentController');
const ReportController = require('../controllers/reportController');
const AiController = require('../controllers/aiController');
const AuditController = require('../controllers/auditController');

// --- Auth Routes ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticate, AuthController.me);
router.put('/auth/profile', authenticate, AuthController.updateProfile);
router.put('/auth/password', authenticate, AuthController.changePassword);

// --- Business Management Routes ---
router.post('/businesses', authenticate, BusinessController.createBusiness);
router.get('/businesses', authenticate, BusinessController.getBusinesses);
router.get('/businesses/current', authenticate, requireBusiness, BusinessController.getBusinessDetails);
router.put('/businesses/current', authenticate, requireBusiness, requireRoles('owner', 'admin'), BusinessController.updateBusiness);
router.post('/businesses/members', authenticate, requireBusiness, requireRoles('owner', 'admin'), BusinessController.addMember);
router.put('/businesses/members/:memberId', authenticate, requireBusiness, requireRoles('owner', 'admin'), BusinessController.updateMemberRole);
router.delete('/businesses/members/:memberId', authenticate, requireBusiness, requireRoles('owner', 'admin'), BusinessController.removeMember);

// --- Products & Categories Routes ---
router.get('/products', authenticate, requireBusiness, ProductController.getProducts);
router.get('/products/:id', authenticate, requireBusiness, ProductController.getProductById);
router.post('/products', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager'), ProductController.createProduct);
router.put('/products/:id', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager'), ProductController.updateProduct);
router.delete('/products/:id', authenticate, requireBusiness, requireRoles('owner', 'admin'), ProductController.archiveProduct);
router.post('/products/:id/adjust-stock', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager'), ProductController.adjustStock);

router.get('/categories', authenticate, requireBusiness, ProductController.getCategories);
router.post('/categories', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager'), ProductController.createCategory);

// --- Sales Routes ---
router.get('/sales', authenticate, requireBusiness, SalesController.getSales);
router.get('/sales/:id', authenticate, requireBusiness, SalesController.getSaleById);
router.post('/sales', authenticate, requireBusiness, SalesController.createSale);
router.post('/sales/:id/void', authenticate, requireBusiness, requireRoles('owner', 'admin'), SalesController.voidSale);

// --- Purchases Routes ---
router.get('/purchases', authenticate, requireBusiness, PurchaseController.getPurchases);
router.get('/purchases/:id', authenticate, requireBusiness, PurchaseController.getPurchaseById);
router.post('/purchases', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager'), PurchaseController.createPurchase);

// --- Customers Routes ---
router.get('/customers', authenticate, requireBusiness, CustomerController.getCustomers);
router.get('/customers/:id', authenticate, requireBusiness, CustomerController.getCustomerById);
router.post('/customers', authenticate, requireBusiness, CustomerController.createCustomer);
router.put('/customers/:id', authenticate, requireBusiness, CustomerController.updateCustomer);
router.post('/customers/:id/payments', authenticate, requireBusiness, CustomerController.recordPayment);

// --- Suppliers Routes ---
router.get('/suppliers', authenticate, requireBusiness, SupplierController.getSuppliers);
router.get('/suppliers/:id', authenticate, requireBusiness, SupplierController.getSupplierById);
router.post('/suppliers', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager'), SupplierController.createSupplier);
router.put('/suppliers/:id', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager'), SupplierController.updateSupplier);
router.post('/suppliers/:id/payments', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager', 'accountant'), SupplierController.recordPayment);

// --- Expenses Routes ---
router.get('/expenses', authenticate, requireBusiness, ExpenseController.getExpenses);
router.post('/expenses', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager', 'accountant'), ExpenseController.createExpense);

// --- Payments & Accounts Routes ---
router.get('/payments', authenticate, requireBusiness, PaymentController.getPayments);
router.get('/accounts', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager', 'accountant'), PaymentController.getBusinessAccounts);

// --- Reports & Dashboard Routes ---
router.get('/reports/dashboard', authenticate, requireBusiness, ReportController.getDashboardSummary);
router.get('/reports/sales', authenticate, requireBusiness, ReportController.getSalesReport);
router.get('/reports/inventory', authenticate, requireBusiness, ReportController.getInventoryReport);
router.get('/reports/pnl', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getProfitAndLoss);
router.get('/reports/balance-sheet', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getBalanceSheet);
router.get('/reports/cash-flow', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getCashFlow);
router.get('/reports/trial-balance', authenticate, requireBusiness, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getTrialBalance);

// --- AI Assistant Route ---
router.post('/ai/ask', authenticate, requireBusiness, AiController.ask);

// --- Audit Trail Route ---
router.get('/audit', authenticate, requireBusiness, requireRoles('owner', 'admin'), AuditController.getLogs);

module.exports = router;
