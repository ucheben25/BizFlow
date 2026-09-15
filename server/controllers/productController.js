const db = require('../config/database');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');
const AuditService = require('../services/auditService');

class ProductController {
  static getProducts(req, res) {
    try {
      const { search, category_id, filter, limit = 50, offset = 0 } = req.query;
      let sql = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.business_id = ? AND p.is_active = 1
      `;
      const params = [req.business.id];

      if (search) {
        sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      if (category_id) {
        sql += ` AND p.category_id = ?`;
        params.push(category_id);
      }

      if (filter === 'low_stock') {
        sql += ` AND p.current_stock > 0 AND p.current_stock <= p.reorder_level`;
      } else if (filter === 'out_of_stock') {
        sql += ` AND p.current_stock <= 0`;
      }

      sql += ` ORDER BY p.name ASC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const products = db.prepare(sql).all(...params);

      const totalCount = db.prepare(`
        SELECT COUNT(*) as count FROM products WHERE business_id = ? AND is_active = 1
      `).get(req.business.id).count;

      return res.json({ success: true, products, totalCount });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch products: ' + err.message });
    }
  }

  static getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? AND p.business_id = ?
      `).get(id, req.business.id);

      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      // Fetch recent inventory ledger movements for this product
      const movements = db.prepare(`
        SELECT it.*, u.full_name as user_name
        FROM inventory_transactions it
        LEFT JOIN users u ON it.user_id = u.id
        WHERE it.product_id = ? AND it.business_id = ?
        ORDER BY it.created_at DESC
        LIMIT 30
      `).all(id, req.business.id);

      return res.json({ success: true, product, movements });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch product details: ' + err.message });
    }
  }

  static createProduct(req, res) {
    try {
      const {
        name,
        category_id,
        description,
        sku,
        barcode,
        unit = 'unit',
        cost_price = 0,
        selling_price = 0,
        opening_stock = 0,
        reorder_level = 10,
        image_url
      } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Product name is required.' });
      }

      const costPriceNum = Math.max(0, Number(cost_price) || 0);
      const sellingPriceNum = Math.max(0, Number(selling_price) || 0);
      const openingStockNum = Math.max(0, Number(opening_stock) || 0);
      const reorderLevelNum = Math.max(0, Number(reorder_level) || 0);

      let productId;

      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO products (
            business_id, category_id, name, description, sku, barcode, unit,
            cost_price, selling_price, current_stock, opening_stock, reorder_level, image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.business.id,
          category_id ? Number(category_id) : null,
          name.trim(),
          description ? description.trim() : null,
          sku ? sku.trim() : null,
          barcode ? barcode.trim() : null,
          unit ? unit.trim() : 'unit',
          costPriceNum,
          sellingPriceNum,
          0, // will be incremented via inventory transaction if opening stock > 0
          openingStockNum,
          reorderLevelNum,
          image_url ? image_url.trim() : null
        );

        productId = result.lastInsertRowid;

        // If opening stock is provided, record inventory transaction & double-entry
        if (openingStockNum > 0) {
          const totalVal = openingStockNum * costPriceNum;

          InventoryService.recordMovement({
            businessId: req.business.id,
            productId,
            transactionType: 'opening_stock',
            quantity: openingStockNum,
            unitCost: costPriceNum,
            referenceType: 'product_init',
            referenceId: productId,
            notes: 'Initial opening stock',
            userId: req.user.id
          });

          if (totalVal > 0) {
            AccountingService.recordJournalEntry({
              businessId: req.business.id,
              referenceType: 'opening_stock',
              referenceId: productId,
              description: `Initial opening inventory for ${name.trim()}`,
              userId: req.user.id,
              lines: [
                { accountCode: '1200', debit: totalVal, credit: 0 }, // Dr Inventory
                { accountCode: '3010', debit: 0, credit: totalVal }  // Cr Owner Equity
              ]
            });
          }
        }

        AuditService.log({
          businessId: req.business.id,
          userId: req.user.id,
          action: 'CREATE_PRODUCT',
          entity: 'PRODUCT',
          entityId: productId,
          newValues: req.body,
          ipAddress: req.ip
        });
      })();

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      return res.status(201).json({ success: true, message: 'Product created successfully.', product });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to create product: ' + err.message });
    }
  }

  static updateProduct(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        category_id,
        description,
        sku,
        barcode,
        unit,
        cost_price,
        selling_price,
        reorder_level,
        image_url
      } = req.body;

      const current = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!current) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      db.prepare(`
        UPDATE products
        SET name = COALESCE(?, name),
            category_id = ?,
            description = COALESCE(?, description),
            sku = COALESCE(?, sku),
            barcode = COALESCE(?, barcode),
            unit = COALESCE(?, unit),
            cost_price = COALESCE(?, cost_price),
            selling_price = COALESCE(?, selling_price),
            reorder_level = COALESCE(?, reorder_level),
            image_url = COALESCE(?, image_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND business_id = ?
      `).run(
        name ? name.trim() : null,
        category_id !== undefined ? (category_id ? Number(category_id) : null) : current.category_id,
        description !== undefined ? description : null,
        sku !== undefined ? sku : null,
        barcode !== undefined ? barcode : null,
        unit !== undefined ? unit : null,
        cost_price !== undefined ? Number(cost_price) : null,
        selling_price !== undefined ? Number(selling_price) : null,
        reorder_level !== undefined ? Number(reorder_level) : null,
        image_url !== undefined ? image_url : null,
        id,
        req.business.id
      );

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'UPDATE_PRODUCT',
        entity: 'PRODUCT',
        entityId: id,
        oldValues: current,
        newValues: req.body,
        ipAddress: req.ip
      });

      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      return res.json({ success: true, message: 'Product updated successfully.', product: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update product: ' + err.message });
    }
  }

  static archiveProduct(req, res) {
    try {
      const { id } = req.params;
      const current = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(id, req.business.id);
      if (!current) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?').run(id, req.business.id);

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'ARCHIVE_PRODUCT',
        entity: 'PRODUCT',
        entityId: id,
        ipAddress: req.ip
      });

      return res.json({ success: true, message: 'Product archived successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to archive product: ' + err.message });
    }
  }

  static adjustStock(req, res) {
    try {
      const { id } = req.params;
      const { physical_stock, reason } = req.body;

      if (physical_stock === undefined || isNaN(physical_stock)) {
        return res.status(400).json({ success: false, error: 'Valid physical stock count is required.' });
      }

      const result = InventoryService.adjustStock({
        businessId: req.business.id,
        productId: id,
        physicalStock: Number(physical_stock),
        reason: reason || 'Physical count stock adjustment',
        userId: req.user.id
      });

      AuditService.log({
        businessId: req.business.id,
        userId: req.user.id,
        action: 'STOCK_ADJUSTMENT',
        entity: 'PRODUCT',
        entityId: id,
        newValues: { physical_stock, reason },
        ipAddress: req.ip
      });

      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      return res.json({ success: true, message: 'Stock adjusted successfully.', product: updated, details: result });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to adjust stock: ' + err.message });
    }
  }

  // Categories
  static getCategories(req, res) {
    try {
      const categories = db.prepare(`
        SELECT c.*, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
        WHERE c.business_id = ? AND c.is_active = 1
        GROUP BY c.id
        ORDER BY c.name ASC
      `).all(req.business.id);

      return res.json({ success: true, categories });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch categories: ' + err.message });
    }
  }

  static createCategory(req, res) {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Category name is required.' });
      }

      const existing = db.prepare('SELECT id FROM categories WHERE business_id = ? AND LOWER(name) = LOWER(?)').get(req.business.id, name.trim());
      if (existing) {
        return res.status(409).json({ success: false, error: 'Category already exists.' });
      }

      const resInsert = db.prepare(`
        INSERT INTO categories (business_id, name, description)
        VALUES (?, ?, ?)
      `).run(req.business.id, name.trim(), description ? description.trim() : null);

      return res.status(201).json({
        success: true,
        message: 'Category created.',
        category: { id: resInsert.lastInsertRowid, name: name.trim(), description }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to create category: ' + err.message });
    }
  }
}

module.exports = ProductController;
