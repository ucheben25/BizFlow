const PayrollService = require('../services/payrollService');

class PayrollController {
  static getDashboard(req, res) {
    try {
      const { period } = req.query;
      const dashboard = PayrollService.getPayrollDashboard(req.business.id, period);
      return res.json({ success: true, dashboard });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch payroll dashboard: ' + err.message });
    }
  }

  static getRecords(req, res) {
    try {
      const { pay_period, staff_id, payment_status } = req.query;
      const records = PayrollService.getSalaryRecords(req.business.id, { pay_period, staff_id, payment_status });
      return res.json({ success: true, records });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch salary records: ' + err.message });
    }
  }

  static getRecordById(req, res) {
    try {
      const record = PayrollService.getSalaryRecordById(req.business.id, req.params.id);
      return res.json({ success: true, record });
    } catch (err) {
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  static createRecord(req, res) {
    try {
      const record = PayrollService.createSalaryRecord(req.business.id, req.user.id, req.body);
      return res.status(201).json({ success: true, message: 'Salary record saved successfully.', record });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static recordPayment(req, res) {
    try {
      const { payment_method, payment_reference, payment_date, notes } = req.body;
      const result = PayrollService.recordSalaryPayment(
        req.business.id,
        req.user.id,
        req.params.id,
        { payment_method, payment_reference, payment_date, notes }
      );
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = PayrollController;
