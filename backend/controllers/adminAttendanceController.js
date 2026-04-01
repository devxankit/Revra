const Attendance = require('../models/Attendance');
const ExcelJS = require('exceljs');

const normalizeMonth = (input) => {
  if (!input) return new Date().toISOString().slice(0, 7);
  const s = String(input);
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return new Date().toISOString().slice(0, 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// POST /api/admin/attendance/upload
exports.uploadAttendance = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const month = normalizeMonth(req.body.month);

    // Validate file buffer exists
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'File is empty or could not be read' });
    }

    // Check file extension first - ExcelJS only supports .xlsx, not .xls
    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
    if (fileExt === 'xls') {
      return res.status(400).json({ 
        success: false, 
        message: 'Old Excel format (.xls) is not supported. Please save your file as .xlsx format in Excel (File > Save As > Excel Workbook) and try again.' 
      });
    }

    if (fileExt !== 'xlsx') {
      return res.status(400).json({ 
        success: false, 
        message: `File format not supported. Please upload a valid Excel file (.xlsx format). Found: ${fileExt || 'unknown'}` 
      });
    }

    const workbook = new ExcelJS.Workbook();
    
    try {
      // Load the Excel file buffer (only .xlsx supported)
      await workbook.xlsx.load(req.file.buffer);
    } catch (loadError) {
      console.error('Excel load error:', loadError);
      
      return res.status(400).json({ 
        success: false, 
        message: `Failed to read Excel file. Please ensure the file is a valid Excel (.xlsx) format and not corrupted. Error: ${loadError.message}. If the file is password-protected, please remove the password and try again.` 
      });
    }

    // Try multiple methods to get the first worksheet
    let sheet = null;
    
    // Method 1: Access via worksheets array
    if (workbook.worksheets && workbook.worksheets.length > 0) {
      sheet = workbook.worksheets[0];
    }
    
    // Method 2: Use getWorksheet by index (1-based)
    if (!sheet) {
      try {
        sheet = workbook.getWorksheet(1);
      } catch (e) {
        // Ignore error, try next method
      }
    }
    
    // Method 3: Use eachSheet to get first sheet
    if (!sheet) {
      try {
        let found = false;
        workbook.eachSheet((worksheet, sheetId) => {
          if (!found) {
            sheet = worksheet;
            found = true;
          }
        });
      } catch (e) {
        // Ignore error, try next method
      }
    }
    
    // Method 4: Try accessing by Sheet1 name
    if (!sheet) {
      try {
        sheet = workbook.getWorksheet('Sheet1');
      } catch (e) {
        // Ignore error
      }
    }

    if (!sheet) {
      return res.status(400).json({ 
        success: false, 
        message: 'No sheets found in Excel file. Please ensure the file contains at least one worksheet with data. If the file is password-protected, please remove the password and try again.' 
      });
    }

    // Validate sheet has content
    if (!sheet.rowCount || sheet.rowCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'The Excel sheet is empty. Please ensure it contains header row and data rows.' 
      });
    }

    // Read header row (row 1)
    const headerRow = sheet.getRow(1);
    const headers = {};
    
    // Collect all headers with their column numbers
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerText = String(cell.value || '').trim();
      if (headerText) {
        headers[colNumber] = headerText;
      }
    });

    // Normalize header text for matching (lowercase, remove special chars)
    const normalizeHeader = (text) => {
      return String(text || '').trim().toLowerCase()
        .replace(/[()[\]{}]/g, '') // Remove parentheses and brackets
        .replace(/\s+/g, '') // Remove spaces
        .replace(/\//g, ''); // Remove slashes for matching
    };

    // Find column index by matching normalized header text
    const findColumnIndex = (searchTerms) => {
      let bestMatch = null;
      let bestScore = 0;
      
      for (const [colNum, headerText] of Object.entries(headers)) {
        const normalized = normalizeHeader(headerText);
        const originalLower = String(headerText).trim().toLowerCase();
        
        for (const term of searchTerms) {
          const termLower = term.toLowerCase();
          // Exact match gets highest priority
          if (normalized === termLower || originalLower === termLower) {
            return parseInt(colNum);
          }
          // Contains match
          if (normalized.includes(termLower) || originalLower.includes(termLower)) {
            // Score based on how specific the match is
            const score = termLower.length;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = parseInt(colNum);
            }
          }
        }
      }
      
      return bestMatch;
    };

    // Find required columns - prioritize exact matches
    // "No" - should match exactly or "no", "serial", etc.
    const serialCol = findColumnIndex(['no', 'sr', 'serial', 'sno', 'number']);
    
    // "Name" - should match exactly
    const nameCol = findColumnIndex(['name', 'employeename', 'empname', 'employee name']);
    
    // "Attend (Req/Act)" - this is the key column, normalize removes parens and slash
    // After normalization: "attendreqact" should match terms like "attend", "reqact", "req/act"
    const attendCol = findColumnIndex(['attendreqact', 'attend', 'reqact', 'req/act', 'req', 'act']);
    
    // "AB" - should match exactly or "absent", "abs"
    const abCol = findColumnIndex(['ab', 'absent', 'abs', 'absentdays', 'absent days']);

    // Validate required columns and provide helpful error messages
    if (!nameCol) {
      const availableHeaders = Object.values(headers).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Could not find "Name" column in Excel file. Available headers: ${availableHeaders}. Please check column headers.` 
      });
    }
    if (!attendCol) {
      const availableHeaders = Object.values(headers).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Could not find "Attend (Req/Act)" column in Excel file. Available headers: ${availableHeaders}. Please check column headers.` 
      });
    }
    

    const records = [];
    let processedRows = 0;
    let skippedRows = 0;

    // Iterate through data rows (starting from row 2)
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      try {
        // Helper to get cell value safely
        const getCellValue = (colNum) => {
          if (!colNum) return '';
          const cell = row.getCell(colNum);
          if (!cell || cell.value === null || cell.value === undefined) return '';
          // Handle various cell types
          if (cell.type === ExcelJS.ValueType.Formula) {
            return String(cell.result || '').trim();
          }
          return String(cell.value || '').trim();
        };

        const name = getCellValue(nameCol);
        const attendRaw = getCellValue(attendCol);
        const serialRaw = serialCol ? getCellValue(serialCol) : '';
        const abRaw = abCol ? getCellValue(abCol) : '0';

        // Skip rows without name or attendance data
        if (!name || !attendRaw) {
          skippedRows++;
          return;
        }

        // Parse serial number (optional)
        const serialNo = serialRaw ? (Number(serialRaw) || undefined) : undefined;

        // Parse absent days
        const absentDays = Number(String(abRaw).replace(/[^0-9]/g, '')) || 0;

        // Parse "Attend (Req/Act)" - format is "RequiredDays/ActualDays" (e.g., "13/2", "13/10")
        // This means: first number = Required (office open days), second = Actual (attended days)
        let requiredDays = 0;
        let attendedDays = 0;
        
        // Clean the string - remove any extra whitespace
        const cleanAttend = String(attendRaw).trim();
        
        // Try to match "number/number" format (e.g., "13/2", "13/10", "30/28")
        // This is the primary format we expect
        const slashMatch = cleanAttend.match(/^(\d+)\s*[\/]\s*(\d+)$/);
        if (slashMatch) {
          // First number is Required (office open days), second is Actual (attended days)
          requiredDays = Number(slashMatch[1]);
          attendedDays = Number(slashMatch[2]);
        } else {
          // Fallback: try to find two numbers separated by any non-digit characters
          const fallbackMatch = cleanAttend.match(/(\d+)\s*[^\d]+\s*(\d+)/);
          if (fallbackMatch) {
            requiredDays = Number(fallbackMatch[1]);
            attendedDays = Number(fallbackMatch[2]);
          } else {
            // Last resort: extract all numbers and take first two
            const numbers = (cleanAttend.match(/\d+/g) || []).map(n => Number(n));
            if (numbers.length >= 2) {
              // First is required, second is attended
              requiredDays = numbers[0];
              attendedDays = numbers[1];
            } else if (numbers.length === 1) {
              // Only one number found - assume it's attended days
              // Calculate required from attended + absent
              attendedDays = numbers[0];
              requiredDays = attendedDays + absentDays;
            }
          }
        }

        // Validation: if we have attended days but no required, calculate from attended + absent
        if (requiredDays === 0 && attendedDays > 0) {
          requiredDays = attendedDays + absentDays;
        }
        
        // Ensure data integrity: requiredDays should typically be >= attendedDays
        // But we trust the Excel data as-is (some edge cases might have different logic)
        // If required < attended, we keep the values as parsed (might be a data issue in source)

        // Only add record if we have valid data
        if (name && (requiredDays > 0 || attendedDays > 0 || absentDays > 0)) {
          records.push({
            serialNo,
            name: name.trim(),
            requiredDays: Math.max(0, requiredDays),
            attendedDays: Math.max(0, attendedDays),
            absentDays: Math.max(0, absentDays)
          });
          processedRows++;
        } else {
          skippedRows++;
        }
      } catch (rowError) {
        skippedRows++;
      }
    });

    // Validate we got some records
    if (records.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid attendance records found in the file. Please check the data format.' 
      });
    }

    // Prepare data for saving
    const attendanceData = {
      month,
      sourceFileName: req.file.originalname,
      records: records.map(r => ({
        serialNo: r.serialNo,
        name: r.name,
        requiredDays: r.requiredDays,
        attendedDays: r.attendedDays,
        absentDays: r.absentDays
        // Note: employee field is optional and can be linked later if needed
      })),
      uploadedBy: req.admin?.id || req.user?.id || null
    };

    // Save to database - upsert: update if exists for this month, otherwise create
    const doc = await Attendance.findOneAndUpdate(
      { month },
      attendanceData,
      { 
        upsert: true, 
        new: true,
        runValidators: true // Ensure schema validation
      }
    );

    return res.status(200).json({ 
      success: true, 
      data: doc, 
      message: `Attendance uploaded successfully. Processed ${processedRows} records${skippedRows > 0 ? `, skipped ${skippedRows} rows` : ''}.` 
    });
  } catch (error) {
    console.error('Upload attendance error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload attendance. Please check file format.' 
    });
  }
};

// GET /api/admin/attendance?month=YYYY-MM
exports.getAttendance = async (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    
    const doc = await Attendance.findOne({ month }).lean(); // Use lean() for better performance
    
    if (!doc) {
      return res.status(200).json({ 
        success: true, 
        data: { month, records: [] },
        message: 'No attendance data found for this month'
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      data: doc,
      message: `Found ${doc.records?.length || 0} attendance records for ${month}`
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch attendance' 
    });
  }
};


