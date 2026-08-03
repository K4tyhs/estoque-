const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

const authCtrl = require('../controllers/authController');
const stockCtrl = require('../controllers/stockController');
const webhookCtrl = require('../controllers/webhookController');
const poCtrl = require('../controllers/purchaseOrderController');
const reportCtrl = require('../controllers/reportController');
const triggerCtrl = require('../controllers/triggerController');
const userCtrl = require('../controllers/userController');

// Auth
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authMiddleware, authCtrl.logout);
router.get('/auth/me', authMiddleware, authCtrl.getMe);
router.put('/auth/change-password', authMiddleware, authCtrl.changePassword);
router.put('/auth/admin-reset-password', authMiddleware, requireRole('ADMIN'), authCtrl.adminResetPassword);
router.post('/auth/request-access', authCtrl.requestAccess);
router.post('/auth/first-access', authCtrl.firstAccess);

// Webhooks
router.post('/webhooks/jira', webhookCtrl.jiraWebhook);
router.post('/webhooks/whatsapp', webhookCtrl.whatsappWebhook);
router.post('/webhooks/simulate', authMiddleware, requireRole('ADMIN', 'TI'), webhookCtrl.simulateWebhook);
router.get('/webhooks/logs', authMiddleware, webhookCtrl.getWebhookLogs);

// Stock
router.get('/stock', authMiddleware, stockCtrl.getItems);
router.get('/stock/movements', authMiddleware, stockCtrl.getMovements);
router.get('/stock/:id', authMiddleware, stockCtrl.getItemById);
router.post('/stock', authMiddleware, requireRole('ADMIN', 'TI'), stockCtrl.createItem);
router.put('/stock/:id', authMiddleware, requireRole('ADMIN', 'TI'), stockCtrl.updateItem);
router.delete('/stock/:id', authMiddleware, requireRole('ADMIN', 'TI'), stockCtrl.deleteItem);
router.post('/stock/:id/move', authMiddleware, requireRole('ADMIN', 'TI'), stockCtrl.manualMove);

// Purchase Orders - Permissão para Admin e TI criarem pedidos de compra manuais
router.get('/purchase-orders', authMiddleware, poCtrl.getPurchaseOrders);
router.post('/purchase-orders', authMiddleware, requireRole('ADMIN', 'TI'), poCtrl.createManualPurchaseOrder);
router.put('/purchase-orders/:id/quantity', authMiddleware, requireRole('ADMIN', 'TI'), poCtrl.updateQuantity);
router.put('/purchase-orders/:id/confirm', authMiddleware, requireRole('ADMIN', 'TI'), poCtrl.confirmPurchaseOrder);
router.put('/purchase-orders/:id/cancel', authMiddleware, requireRole('ADMIN', 'TI'), poCtrl.cancelPurchaseOrder);
router.get('/purchase-orders/recalculate/:item_id', authMiddleware, requireRole('ADMIN', 'TI'), poCtrl.recalculate);

// Reports
router.get('/reports/monthly', authMiddleware, requireRole('ADMIN', 'TI'), reportCtrl.getMonthlyReport);
router.get('/reports/months', authMiddleware, requireRole('ADMIN', 'TI'), reportCtrl.getAvailableMonths);

// Triggers
router.get('/triggers', authMiddleware, requireRole('ADMIN'), triggerCtrl.getConfig);
router.put('/triggers', authMiddleware, requireRole('ADMIN'), triggerCtrl.updateGlobalConfig);
router.put('/triggers/item/:id', authMiddleware, requireRole('ADMIN'), triggerCtrl.updateItemMinimum);

// Users
router.get('/users', authMiddleware, requireRole('ADMIN'), userCtrl.getUsers);
router.post('/users', authMiddleware, requireRole('ADMIN'), userCtrl.createUser);
router.put('/users/:id/status', authMiddleware, requireRole('ADMIN'), userCtrl.toggleUserStatus);
router.delete('/users/:id', authMiddleware, requireRole('ADMIN'), userCtrl.deleteUser);
router.get('/users/authorized-emails', authMiddleware, requireRole('ADMIN'), userCtrl.getAuthorizedEmails);
router.post('/users/authorized-emails', authMiddleware, requireRole('ADMIN'), userCtrl.addAuthorizedEmail);
router.delete('/users/authorized-emails/:id', authMiddleware, requireRole('ADMIN'), userCtrl.removeAuthorizedEmail);
router.get('/users/access-requests', authMiddleware, requireRole('ADMIN'), userCtrl.getAccessRequests);
router.put('/users/access-requests/:id/approve', authMiddleware, requireRole('ADMIN'), userCtrl.approveAccessRequest);
router.put('/users/access-requests/:id/reject', authMiddleware, requireRole('ADMIN'), userCtrl.rejectAccessRequest);

module.exports = router;
