const db = require('../config/database');
const AccountingService = require('./accountingService');

class InventoryService {
  /**
   * Record inventory movement and update product stock & weighted average cost
   */
  static recordMovement({
    businessId,
    productId,
    transactionType, // 'opening_stock', 'purchase', 'sale', 'sale_return', 'purchase_return', 'damage', 'adjustment'
    quantity,        // Positive or negative
    unitCost,
    referenceType,
    referenceId,
    notes,
    userId
  }) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(productId, businessId);
    if (!product) {
      throw new Error(`Product ${productId} not found for business ${businessId}`);
    }

    const prevStock = Number(product.current_stock) || 0;
    const prevCost = Number(product.cost_price) || 0;
    const qty = Number(quantity);
    const newStock = prevStock + qty;

    // Check negative stock prevention
    if (newStock < 0) {
      const business = db.prepare('SELECT allow_negative_stock FROM businesses WHERE id = ?').get(businessId);
      if (!business || !business.allow_negative_stock) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${prevStock}, requested: ${Math.abs(qty)}`);
      }
    }

    let effectiveUnitCost = unitCost !== undefined ? Number(unitCost) : prevCost;
    let newCostPrice = prevCost;

    // Calculate Weighted Average Cost (WAC) on inward inventory (purchases, opening stock)
    if (qty > 0 && (transactionType === 'purchase' || transactionType === 'opening_stock')) {
      if (prevStock <= 0) {
        newCostPrice = effectiveUnitCost;
      } else {
        const prevTotalValue = prevStock * prevCost;
        const newAdditionValue = qty * effectiveUnitCost;
        newCostPrice = Math.round(((prevTotalValue + newAdditionValue) / newStock) * 100) / 100;
      }
    }

    const totalCost = Math.round(Math.abs(qty) * effectiveUnitCost * 100) / 100;

    const insertTx = db.prepare(`
      INSERT INTO inventory_transactions (
        business_id, product_id, transaction_type, quantity, unit_cost, total_cost,
        previous_stock, new_stock, reference_type, reference_id, notes, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateProduct = db.prepare(`
      UPDATE products
      SET current_stock = ?,
          cost_price = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    let txId;
    const execute = () => {
      const res = insertTx.run(
        businessId, productId, transactionType, qty, effectiveUnitCost, totalCost,
        prevStock, newStock, referenceType, referenceId, notes, userId
      );
      txId = res.lastInsertRowid;
      updateProduct.run(newStock, newCostPrice, productId);
    };

    if (db.inTransaction) {
      execute();
    } else {
      db.transaction(execute)();
    }

    return {
      transactionId: txId,
      productId,
      previousStock: prevStock,
      newStock,
      costPrice: newCostPrice,
      effectiveUnitCost,
      totalCost
    };
  }

  /**
   * Process Stock Adjustment (e.g. system stock = 50, physical stock = 47 => diff = -3)
   */
  static adjustStock({
    businessId,
    productId,
    physicalStock,
    reason,
    userId
  }) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(productId, businessId);
    if (!product) {
      throw new Error(`Product not found`);
    }

    const currentStock = Number(product.current_stock) || 0;
    const diff = Number(physicalStock) - currentStock;

    if (diff === 0) {
      return { message: 'Stock is already equal to physical count', currentStock };
    }

    const costPrice = Number(product.cost_price) || 0;
    const totalAdjustmentValue = Math.abs(diff) * costPrice;

    return db.transaction(() => {
      // 1. Record inventory movement
      const movement = this.recordMovement({
        businessId,
        productId,
        transactionType: 'adjustment',
        quantity: diff,
        unitCost: costPrice,
        referenceType: 'adjustment',
        referenceId: null,
        notes: `Adjustment: ${reason || 'Physical count audit'} (was ${currentStock}, now ${physicalStock})`,
        userId
      });

      // 2. Double-entry accounting for adjustment
      if (totalAdjustmentValue > 0) {
        if (diff < 0) {
          // Stock shrinkage/loss: Dr 6110 Misc Expense, Cr 1200 Inventory
          AccountingService.recordJournalEntry({
            businessId,
            referenceType: 'inventory_adjustment',
            referenceId: movement.transactionId,
            description: `Inventory reduction for ${product.name}: ${reason}`,
            userId,
            lines: [
              { accountCode: '6110', debit: totalAdjustmentValue, credit: 0 },
              { accountCode: '1200', debit: 0, credit: totalAdjustmentValue }
            ]
          });
        } else {
          // Stock surplus/gain: Dr 1200 Inventory, Cr 4020 Other Income
          AccountingService.recordJournalEntry({
            businessId,
            referenceType: 'inventory_adjustment',
            referenceId: movement.transactionId,
            description: `Inventory surplus for ${product.name}: ${reason}`,
            userId,
            lines: [
              { accountCode: '1200', debit: totalAdjustmentValue, credit: 0 },
              { accountCode: '4020', debit: 0, credit: totalAdjustmentValue }
            ]
          });
        }
      }

      return movement;
    })();
  }

  /**
   * Get total inventory valuation and summary
   */
  static getInventoryValuation(businessId) {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.business_id = ? AND p.is_active = 1
      ORDER BY p.name ASC
    `).all(businessId);

    let totalValuation = 0;
    let totalItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const items = products.map(p => {
      const stock = Number(p.current_stock) || 0;
      const cost = Number(p.cost_price) || 0;
      const value = Math.round(stock * cost * 100) / 100;

      totalValuation += value;
      totalItems += stock;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= Number(p.reorder_level)) {
        lowStockCount++;
      }

      return {
        ...p,
        total_value: value,
        is_low_stock: stock > 0 && stock <= Number(p.reorder_level),
        is_out_of_stock: stock <= 0
      };
    });

    return {
      items,
      totalValuation: Math.round(totalValuation * 100) / 100,
      totalStockUnits: totalItems,
      totalProductsCount: products.length,
      lowStockCount,
      outOfStockCount
    };
  }
}

module.exports = InventoryService;
