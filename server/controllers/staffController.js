const PayrollService = require('../services/payrollService');

class StaffController {
  static getStaff(req, res) {
    try {
      const { search, status, department } = req.query;
      const staffList = PayrollService.getStaffList(req.business.id, { search, status, department });
      return res.json({ success: true, staff: staffList });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch staff: ' + err.message });
    }
  }

  static getStaffById(req, res) {
    try {
      const staff = PayrollService.getStaffById(req.business.id, req.params.id);
      return res.json({ success: true, staff });
    } catch (err) {
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  static createStaff(req, res) {
    try {
      const staff = PayrollService.createStaff(req.business.id, req.user.id, req.body);
      return res.status(201).json({ success: true, message: 'Staff member created successfully.', staff });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static updateStaff(req, res) {
    try {
      const staff = PayrollService.updateStaff(req.business.id, req.params.id, req.user.id, req.body);
      return res.json({ success: true, message: 'Staff updated successfully.', staff });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static archiveStaff(req, res) {
    try {
      const result = PayrollService.archiveStaff(req.business.id, req.params.id, req.user.id);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = StaffController;
