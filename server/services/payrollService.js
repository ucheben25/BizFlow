const db = require('../config/database');
const AccountingService = require('./accountingService');
const AuditService = require('./auditService');

class PayrollService {
  /**
   * Generates next sequential employee ID for a business
   */
  static generateEmployeeId(businessId) {
    const count = db.prepare('SELECT COUNT(*) as count FROM staff WHERE business_id = ?').get(businessId).count;
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Create a new staff member
   */
  static createStaff(businessId, userId, data) {
    const {
      full_name,
      email,
      phone,
      position,
      department,
      employment_date = new Date().toISOString().split('T')[0],
      employment_status = 'active',
      basic_salary = 0,
      notes
    } = data;

    if (!full_name || !position) {
      throw new Error('Staff full name and position are required.');
    }

    const employeeId = data.employee_id || this.generateEmployeeId(businessId);

    const stmt = db.prepare(`
      INSERT INTO staff (
        business_id, employee_id, full_name, email, phone, position,
        department, employment_date, employment_status, basic_salary, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      businessId,
      employeeId,
      full_name.trim(),
      email ? email.trim() : null,
      phone ? phone.trim() : null,
      position.trim(),
      department ? department.trim() : null,
      employment_date,
      employment_status,
      Number(basic_salary) || 0,
      notes ? notes.trim() : null
    );

    const staffId = result.lastInsertRowid;

    AuditService.log({
      businessId,
      userId,
      action: 'CREATE_STAFF',
      entity: 'STAFF',
      entityId: staffId,
      newValues: { full_name, position, basic_salary, employeeId }
    });

    return this.getStaffById(businessId, staffId);
  }

  /**
   * Get staff members for a business
   */
  static getStaffList(businessId, { search, status, department } = {}) {
    let query = 'SELECT * FROM staff WHERE business_id = ?';
    const params = [businessId];

    if (status) {
      query += ' AND employment_status = ?';
      params.push(status);
    }

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    if (search) {
      query += ' AND (full_name LIKE ? OR employee_id LIKE ? OR email LIKE ? OR position LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY id DESC';
    return db.prepare(query).all(...params);
  }

  /**
   * Get single staff member by ID
   */
  static getStaffById(businessId, staffId) {
    const staff = db.prepare('SELECT * FROM staff WHERE business_id = ? AND id = ?').get(businessId, staffId);
    if (!staff) {
      throw new Error('Staff member not found.');
    }
    return staff;
  }

  /**
   * Update staff member details
   */
  static updateStaff(businessId, staffId, userId, data) {
    const current = this.getStaffById(businessId, staffId);

    const stmt = db.prepare(`
      UPDATE staff
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          position = COALESCE(?, position),
          department = COALESCE(?, department),
          employment_status = COALESCE(?, employment_status),
          basic_salary = COALESCE(?, basic_salary),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE business_id = ? AND id = ?
    `);

    stmt.run(
      data.full_name !== undefined ? data.full_name.trim() : null,
      data.email !== undefined ? data.email.trim() : null,
      data.phone !== undefined ? data.phone.trim() : null,
      data.position !== undefined ? data.position.trim() : null,
      data.department !== undefined ? data.department.trim() : null,
      data.employment_status !== undefined ? data.employment_status : null,
      data.basic_salary !== undefined ? Number(data.basic_salary) : null,
      data.notes !== undefined ? data.notes.trim() : null,
      businessId,
      staffId
    );

    AuditService.log({
      businessId,
      userId,
      action: 'UPDATE_STAFF',
      entity: 'STAFF',
      entityId: staffId,
      oldValues: current,
      newValues: data
    });

    return this.getStaffById(businessId, staffId);
  }

  /**
   * Archive / deactivate staff member
   */
  static archiveStaff(businessId, staffId, userId) {
    const current = this.getStaffById(businessId, staffId);

    db.prepare(`
      UPDATE staff
      SET employment_status = 'archived',
          updated_at = CURRENT_TIMESTAMP
      WHERE business_id = ? AND id = ?
    `).run(businessId, staffId);

    AuditService.log({
      businessId,
      userId,
      action: 'ARCHIVE_STAFF',
      entity: 'STAFF',
      entityId: staffId,
      oldValues: current
    });

    return { success: true, message: 'Staff member archived successfully.' };
  }

  /**
   * Create or update a salary record for a staff member in a pay period
   * Formula: Basic + Allowances - Deductions = Net Salary
   */
  static createSalaryRecord(businessId, userId, data) {
    const {
      staff_id,
      pay_period, // e.g. '2026-09'
      basic_salary,
      allowances = 0,
      deductions = 0,
      notes
    } = data;

    if (!staff_id || !pay_period) {
      throw new Error('Staff ID and Pay Period (e.g. YYYY-MM) are required.');
    }

    const staff = this.getStaffById(businessId, staff_id);

    const finalBasic = basic_salary !== undefined ? Number(basic_salary) : staff.basic_salary;
    const finalAllowances = Number(allowances) || 0;
    const finalDeductions = Number(deductions) || 0;

    // Strict calculation: Basic + Allowances - Deductions = Net Salary
    const netSalary = Math.max(0, Math.round((finalBasic + finalAllowances - finalDeductions) * 100) / 100);

    // Check if salary record already exists for this staff in this period
    const existing = db.prepare(`
      SELECT id, payment_status FROM salary_records
      WHERE business_id = ? AND staff_id = ? AND pay_period = ?
    `).get(businessId, staff_id, pay_period);

    if (existing) {
      if (existing.payment_status === 'paid') {
        throw new Error(`Salary record for ${staff.full_name} for period ${pay_period} is already PAID and cannot be modified.`);
      }

      db.prepare(`
        UPDATE salary_records
        SET basic_salary = ?,
            allowances = ?,
            deductions = ?,
            net_salary = ?,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(finalBasic, finalAllowances, finalDeductions, netSalary, notes, existing.id);

      return this.getSalaryRecordById(businessId, existing.id);
    }

    const result = db.prepare(`
      INSERT INTO salary_records (
        business_id, staff_id, pay_period, basic_salary, allowances, deductions,
        net_salary, payment_status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(businessId, staff_id, pay_period, finalBasic, finalAllowances, finalDeductions, netSalary, notes, userId);

    const recordId = result.lastInsertRowid;

    AuditService.log({
      businessId,
      userId,
      action: 'CREATE_SALARY_RECORD',
      entity: 'SALARY_RECORD',
      entityId: recordId,
      newValues: { staff_id, pay_period, net_salary: netSalary }
    });

    return this.getSalaryRecordById(businessId, recordId);
  }

  /**
   * Get single salary record by ID
   */
  static getSalaryRecordById(businessId, recordId) {
    const record = db.prepare(`
      SELECT sr.*, s.full_name as staff_name, s.employee_id, s.position, s.department
      FROM salary_records sr
      JOIN staff s ON sr.staff_id = s.id
      WHERE sr.business_id = ? AND sr.id = ?
    `).get(businessId, recordId);

    if (!record) {
      throw new Error('Salary record not found.');
    }

    return record;
  }

  /**
   * Get salary records for a business
   */
  static getSalaryRecords(businessId, { pay_period, staff_id, payment_status } = {}) {
    let query = `
      SELECT sr.*, s.full_name as staff_name, s.employee_id, s.position, s.department
      FROM salary_records sr
      JOIN staff s ON sr.staff_id = s.id
      WHERE sr.business_id = ?
    `;
    const params = [businessId];

    if (pay_period) {
      query += ' AND sr.pay_period = ?';
      params.push(pay_period);
    }

    if (staff_id) {
      query += ' AND sr.staff_id = ?';
      params.push(staff_id);
    }

    if (payment_status) {
      query += ' AND sr.payment_status = ?';
      params.push(payment_status);
    }

    query += ' ORDER BY sr.pay_period DESC, s.full_name ASC';
    return db.prepare(query).all(...params);
  }

  /**
   * Record Salary Payment & Execute Automatic Double-Entry Accounting Entry
   * Requirement 22:
   * Debit: Salary Expense (Account 6040)
   * Credit: Cash (1010) or Bank (1020)
   */
  static recordSalaryPayment(businessId, userId, recordId, {
    payment_method = 'bank_transfer',
    payment_reference,
    payment_date = new Date().toISOString(),
    notes
  }) {
    const record = this.getSalaryRecordById(businessId, recordId);

    if (record.payment_status === 'paid') {
      throw new Error(`Salary for ${record.staff_name} for period ${record.pay_period} is already marked as paid.`);
    }

    const netAmount = Number(record.net_salary);
    if (netAmount <= 0) {
      throw new Error('Salary amount must be greater than zero to execute payment.');
    }

    // Determine credit account (1010 for cash, 1020 for bank transfer, 1030 for pos)
    const creditAccountCode = AccountingService.getPaymentAccountCode(payment_method);
    const debitAccountCode = '6040'; // Operating Expense: Salaries & Wages

    return db.transaction(() => {
      // 1. Create Double-Entry Journal Entry
      const journalEntry = AccountingService.recordJournalEntry({
        businessId,
        referenceType: 'payroll_payment',
        referenceId: record.id,
        description: `Salary Payment: ${record.staff_name} (${record.employee_id}) - ${record.pay_period}`,
        userId,
        lines: [
          {
            accountCode: debitAccountCode,
            debit: netAmount,
            credit: 0,
            description: `Salary expense for ${record.staff_name} (${record.pay_period})`
          },
          {
            accountCode: creditAccountCode,
            debit: 0,
            credit: netAmount,
            description: `Salary payout via ${payment_method} (${payment_reference || 'Direct'})`
          }
        ]
      });

      // 2. Also record in central payments ledger
      db.prepare(`
        INSERT INTO payments (
          business_id, user_id, payment_type, entity_type, entity_id,
          reference_type, reference_id, amount, payment_method, payment_account_code, notes, payment_date
        ) VALUES (?, ?, 'outflow', 'staff', ?, 'salary_record', ?, ?, ?, ?, ?, ?)
      `).run(
        businessId,
        userId,
        record.staff_id,
        record.id,
        netAmount,
        payment_method,
        creditAccountCode,
        notes || `Salary payment for ${record.pay_period}`,
        payment_date
      );

      // 3. Update salary record status to 'paid'
      db.prepare(`
        UPDATE salary_records
        SET payment_status = 'paid',
            payment_date = ?,
            payment_method = ?,
            payment_reference = ?,
            journal_entry_id = ?,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        payment_date,
        payment_method,
        payment_reference || null,
        journalEntry.id,
        notes || null,
        record.id
      );

      AuditService.log({
        businessId,
        userId,
        action: 'PAY_SALARY',
        entity: 'SALARY_RECORD',
        entityId: record.id,
        newValues: {
          staff_name: record.staff_name,
          pay_period: record.pay_period,
          net_salary: netAmount,
          payment_method,
          journal_entry_id: journalEntry.id
        }
      });

      return {
        success: true,
        message: `Salary of ₦${netAmount.toLocaleString()} paid to ${record.staff_name}`,
        record: this.getSalaryRecordById(businessId, record.id),
        journalEntryId: journalEntry.id
      };
    })();
  }

  /**
   * Get Payroll Dashboard Metrics (Requirement 19)
   */
  static getPayrollDashboard(businessId, period) {
    const currentPeriod = period || new Date().toISOString().substring(0, 7); // 'YYYY-MM'

    // Total staff and active staff
    const staffStats = db.prepare(`
      SELECT 
        COUNT(*) as total_staff,
        COUNT(CASE WHEN employment_status = 'active' THEN 1 END) as active_staff,
        COALESCE(SUM(CASE WHEN employment_status = 'active' THEN basic_salary ELSE 0 END), 0) as total_monthly_basic
      FROM staff
      WHERE business_id = ? AND employment_status != 'archived'
    `).get(businessId);

    // Period specific salary records stats
    const periodStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN net_salary ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN net_salary ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
        COALESCE(SUM(net_salary), 0) as total_recorded_payroll
      FROM salary_records
      WHERE business_id = ? AND pay_period = ?
    `).get(businessId, currentPeriod);

    // Recent salary payments
    const recentPayments = db.prepare(`
      SELECT sr.*, s.full_name as staff_name, s.employee_id, s.position
      FROM salary_records sr
      JOIN staff s ON sr.staff_id = s.id
      WHERE sr.business_id = ?
      ORDER BY sr.updated_at DESC
      LIMIT 10
    `).all(businessId);

    return {
      period: currentPeriod,
      totalStaff: staffStats.total_staff,
      activeStaff: staffStats.active_staff,
      totalMonthlyPayroll: staffStats.total_monthly_basic,
      paidAmount: periodStats.paid_amount,
      pendingAmount: periodStats.pending_amount,
      paidCount: periodStats.paid_count,
      pendingCount: periodStats.pending_count,
      recentPayments
    };
  }
}

module.exports = PayrollService;
