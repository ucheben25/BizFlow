const express = require('express');
const router = express.Router();

const { authenticate, requireBusiness } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');
const { requireActiveSubscription } = require('../middleware/subscriptionGate');

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
const PublicController = require('../controllers/publicController');
const SubscriptionController = require('../controllers/subscriptionController');
const StaffController = require('../controllers/staffController');
const PayrollController = require('../controllers/payrollController');

// --- Public Website Routes (No Auth Required) ---
router.get('/public/plans', PublicController.getPlans);
router.post('/public/contact', PublicController.submitContact);

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

// --- Subscription & Billing Routes (Accessible for Plan Selection / Renewal) ---
router.get('/subscriptions/plans', authenticate, SubscriptionController.getPlans);
router.get('/subscriptions/current', authenticate, requireBusiness, SubscriptionController.getCurrentSubscription);
router.post('/subscriptions/initialize', authenticate, requireBusiness, requireRoles('owner', 'admin'), SubscriptionController.initializePayment);
router.post('/subscriptions/verify', authenticate, requireBusiness, requireRoles('owner', 'admin'), SubscriptionController.verifyPayment);
router.post('/subscriptions/cancel', authenticate, requireBusiness, requireRoles('owner', 'admin'), SubscriptionController.cancel);
router.post('/subscriptions/webhook', SubscriptionController.webhook);

// --- Operational Routes (Require Business + Active Subscription) ---

// Products & Categories Routes
router.get('/products', authenticate, requireBusiness, requireActiveSubscription, ProductController.getProducts);
router.get('/products/:id', authenticate, requireBusiness, requireActiveSubscription, ProductController.getProductById);
router.post('/products', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager'), ProductController.createProduct);
router.put('/products/:id', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager'), ProductController.updateProduct);
router.delete('/products/:id', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), ProductController.archiveProduct);
router.post('/products/:id/adjust-stock', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager'), ProductController.adjustStock);

router.get('/categories', authenticate, requireBusiness, requireActiveSubscription, ProductController.getCategories);
router.post('/categories', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager'), ProductController.createCategory);

// Sales Routes
router.get('/sales', authenticate, requireBusiness, requireActiveSubscription, SalesController.getSales);
router.get('/sales/:id', authenticate, requireBusiness, requireActiveSubscription, SalesController.getSaleById);
router.post('/sales', authenticate, requireBusiness, requireActiveSubscription, SalesController.createSale);
router.post('/sales/:id/void', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), SalesController.voidSale);

// Purchases Routes
router.get('/purchases', authenticate, requireBusiness, requireActiveSubscription, PurchaseController.getPurchases);
router.get('/purchases/:id', authenticate, requireBusiness, requireActiveSubscription, PurchaseController.getPurchaseById);
router.post('/purchases', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager'), PurchaseController.createPurchase);

// Customers Routes
router.get('/customers', authenticate, requireBusiness, requireActiveSubscription, CustomerController.getCustomers);
router.get('/customers/:id', authenticate, requireBusiness, requireActiveSubscription, CustomerController.getCustomerById);
router.post('/customers', authenticate, requireBusiness, requireActiveSubscription, CustomerController.createCustomer);
router.put('/customers/:id', authenticate, requireBusiness, requireActiveSubscription, CustomerController.updateCustomer);
router.post('/customers/:id/payments', authenticate, requireBusiness, requireActiveSubscription, CustomerController.recordPayment);

// Suppliers Routes
router.get('/suppliers', authenticate, requireBusiness, requireActiveSubscription, SupplierController.getSuppliers);
router.get('/suppliers/:id', authenticate, requireBusiness, requireActiveSubscription, SupplierController.getSupplierById);
router.post('/suppliers', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager'), SupplierController.createSupplier);
router.put('/suppliers/:id', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager'), SupplierController.updateSupplier);
router.post('/suppliers/:id/payments', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), SupplierController.recordPayment);

// Expenses Routes (Financial Data Restricted from Regular Staff - Requirement 13)
router.get('/expenses', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), ExpenseController.getExpenses);
router.post('/expenses', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), ExpenseController.createExpense);

// Payments & Accounts Routes
router.get('/payments', authenticate, requireBusiness, requireActiveSubscription, PaymentController.getPayments);
router.get('/accounts', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), PaymentController.getBusinessAccounts);

// Reports & Dashboard Routes
router.get('/reports/dashboard', authenticate, requireBusiness, requireActiveSubscription, ReportController.getDashboardSummary);
router.get('/reports/sales', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getSalesReport);
router.get('/reports/inventory', authenticate, requireBusiness, requireActiveSubscription, ReportController.getInventoryReport);
router.get('/reports/pnl', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getProfitAndLoss);
router.get('/reports/balance-sheet', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getBalanceSheet);
router.get('/reports/cash-flow', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getCashFlow);
router.get('/reports/trial-balance', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin', 'manager', 'accountant'), ReportController.getTrialBalance);

// Staff Management Routes (Requirement 15, 21 - Admin only)
router.get('/staff', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), StaffController.getStaff);
router.get('/staff/:id', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), StaffController.getStaffById);
router.post('/staff', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), StaffController.createStaff);
router.put('/staff/:id', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), StaffController.updateStaff);
router.delete('/staff/:id', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), StaffController.archiveStaff);

// Payroll Routes (Requirement 16, 17, 18, 19, 21, 22 - Admin only)
router.get('/payroll/dashboard', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), PayrollController.getDashboard);
router.get('/payroll/records', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), PayrollController.getRecords);
router.get('/payroll/records/:id', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), PayrollController.getRecordById);
router.post('/payroll/records', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), PayrollController.createRecord);
router.post('/payroll/records/:id/pay', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), PayrollController.recordPayment);

// AI Assistant Route
router.post('/ai/ask', authenticate, requireBusiness, requireActiveSubscription, AiController.ask);

// Audit Trail Route (Owner / Admin only)
router.get('/audit', authenticate, requireBusiness, requireActiveSubscription, requireRoles('owner', 'admin'), AuditController.getLogs);

module.exports = router;

