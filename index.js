// backend/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db'); // الاتصال بقاعدة بيانات petrochoice_org
const nodemailer = require('nodemailer');

const app = express();
const PORT = 5000;

// ✅ Middleware
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // لعرض الصور

// ✅ إعدادات رفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ------------------- 🟢 Settings Routes ------------------- */

// ✅ GET: جلب إعدادات الموقع
app.get('/api/settings', (req, res) => {
  const sql = 'SELECT * FROM settings WHERE id = 1';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching settings:', err);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    res.json(results[0]);
  });
});

// ✅ POST: تحديث إعدادات الموقع
app.post('/api/settings', upload.fields([{ name: 'logo' }, { name: 'icon' }]), (req, res) => {
  const { site_name } = req.body;
  const logo = req.files?.logo?.[0]?.filename || null;
  const icon = req.files?.icon?.[0]?.filename || null;

  const sql = `UPDATE settings SET site_name = ?, logo = ?, icon = ? WHERE id = 1`;
  db.query(sql, [site_name, logo, icon], (err) => {
    if (err) {
      console.error('Error updating DB:', err);
      return res.status(500).json({ error: 'Failed to update settings in DB' });
    }
    res.json({ message: 'Settings saved to DB successfully' });
  });
});

/* ------------------- 🟡 Blog Routes ------------------- */
/* ------------------- 🟡 Blog Routes ------------------- */

// ✅ GET: عرض كل المقالات
app.get('/api/blog', (req, res) => {
  const sql = 'SELECT * FROM blog_posts ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching blog:', err);
      return res.status(500).json({ error: 'Failed to fetch blog' });
    }
    res.json(results);
  });
});

// ✅ GET: جلب مقال واحد عبر id أو slug
app.get('/api/blog/:identifier', (req, res) => {
  const identifier = req.params.identifier;
  let sql, params;
  if (isNaN(Number(identifier))) {
    sql = 'SELECT * FROM blog_posts WHERE slug = ?';
    params = [identifier];
  } else {
    sql = 'SELECT * FROM blog_posts WHERE id = ?';
    params = [identifier];
  }
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching blog post:', err);
      return res.status(500).json({ error: 'Failed to fetch blog post' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(results[0]);
  });
});
// ✅ POST: إضافة مقال مع صورة
app.post('/api/blog', upload.single('image'), (req, res) => {
  let { title, slug, meta_title, meta_description, keywords, content, author } = req.body;
  const image = req.file?.filename || null;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  // توليد slug تلقائي إذا لم يُرسل
  if (!slug || slug.trim() === '') {
    slug = title
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  const sql = `INSERT INTO blog_posts (title, slug, content, meta_title, meta_description, keywords, author, image, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
  const values = [title, slug, content, meta_title, meta_description, keywords, author, image];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error adding blog:', err);
      return res.status(500).json({ error: 'Failed to add blog' });
    }
    res.json({ message: 'Blog added successfully', id: result.insertId });
  });
});

app.put('/api/blog/:id', upload.single('image'), (req, res) => {
  let { title, slug, meta_title, meta_description, keywords, content, author } = req.body;
  const image = req.file?.filename || null;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  if (!slug || slug.trim() === '') {
    slug = title
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  // نُحدّث الصورة فقط إذا تم رفعها
  const sql = image
    ? `UPDATE blog_posts SET title = ?, slug = ?, meta_title = ?, meta_description = ?, keywords = ?, content = ?, author = ?, image = ?, updated_at = NOW() WHERE id = ?`
    : `UPDATE blog_posts SET title = ?, slug = ?, meta_title = ?, meta_description = ?, keywords = ?, content = ?, author = ?, updated_at = NOW() WHERE id = ?`;

  const values = image
    ? [title, slug, meta_title, meta_description, keywords, content, author, image, req.params.id]
    : [title, slug, meta_title, meta_description, keywords, content, author, req.params.id];

  db.query(sql, values, (err) => {
    if (err) {
      console.error('Error updating blog:', err);
      return res.status(500).json({ error: 'Failed to update blog' });
    }
    res.json({ message: 'Blog updated successfully' });
  });
});


// ✅ DELETE: حذف مقال
app.delete('/api/blog/:id', (req, res) => {
  const sql = 'DELETE FROM blog_posts WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error('Error deleting blog:', err);
      return res.status(500).json({ error: 'Failed to delete blog' });
    }
    res.json({ message: 'Blog deleted successfully' });
  });
});

/* ------------------- 🟢 Jobs Routes ------------------- */

// ✅ GET: جلب كل الوظائف
app.get('/api/jobs', (req, res) => {
  const sql = 'SELECT * FROM carrers_jobs ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching jobs:', err);
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }
    res.json(results);
  });
});

// ✅ GET: جلب وظيفة واحدة بالتفصيل عبر id
app.get('/api/jobs/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM carrers_jobs WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching job:', err);
      return res.status(500).json({ error: 'Failed to fetch job' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(results[0]);
  });
});

// ✅ POST: إضافة وظيفة جديدة
app.post('/api/jobs', (req, res) => {
  const {
    branch_id,
    title,
    category,
    location,
    schedule,
    date_posted,
    description,
    responsibilities,
    qualifications,
    benefits,
    company_name,
    apply_link
  } = req.body;

  if (!title || !branch_id) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }

  const sql = `INSERT INTO carrers_jobs (
    branch_id, title, category, location, schedule, date_posted, description, responsibilities, qualifications, benefits, company_name, apply_link, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

  const values = [
    branch_id, title, category, location, schedule, date_posted, description, responsibilities, qualifications, benefits, company_name, apply_link
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error adding job:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to insert job', error_details: err.message });
    }
    res.json({ status: 'success', message: 'Job added successfully', id: result.insertId });
  });
});

// ✅ PUT: تعديل وظيفة
app.put('/api/jobs/:id', (req, res) => {
  const id = req.params.id;
  const {
    branch_id,
    title,
    category,
    location,
    schedule,
    date_posted,
    description,
    responsibilities,
    qualifications,
    benefits,
    company_name,
    apply_link
  } = req.body;

  if (!id || !branch_id) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }

  const sql = `UPDATE carrers_jobs SET
    branch_id = ?,
    title = ?,
    category = ?,
    location = ?,
    schedule = ?,
    date_posted = ?,
    description = ?,
    responsibilities = ?,
    qualifications = ?,
    benefits = ?,
    company_name = ?,
    apply_link = ?,
    updated_at = NOW()
    WHERE id = ?`;

  const values = [
    branch_id, title, category, location, schedule, date_posted, description, responsibilities, qualifications, benefits, company_name, apply_link, id
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error updating job:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to update job', error_details: err.message });
    }
    res.json({ status: 'success', message: 'Job updated successfully' });
  });
});

// ✅ DELETE: حذف وظيفة
app.delete('/api/jobs/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM carrers_jobs WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting job:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to delete job', error_details: err.message });
    }
    res.json({ status: 'success', message: 'Job deleted successfully' });
  });
});

/* ------------------- 🟡 Job Form Fields Routes ------------------- */

// ✅ GET: جلب كل الحقول لوظيفة معينة
app.get('/api/job-form-fields/:job_id', (req, res) => {
  const job_id = req.params.job_id;
  const sql = 'SELECT * FROM job_form_fields WHERE job_id = ?';
  db.query(sql, [job_id], (err, results) => {
    if (err) {
      console.error('Error fetching job form fields:', err);
      return res.status(500).json({ error: 'Failed to fetch job form fields' });
    }
    res.json(results);
  });
});

// ✅ POST: إضافة حقل جديد
app.post('/api/job-form-fields', (req, res) => {
  const { job_id, field_name, field_type, options, required } = req.body;
  if (!job_id || !field_name || !field_type) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }
  let options_json = null;
  if (['select', 'dropdown', 'radio'].includes(field_type) && options) {
    options_json = JSON.stringify(Array.isArray(options) ? options : options.split(','));
  }
  const sql = `INSERT INTO job_form_fields (job_id, field_name, field_type, options, required, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
  const values = [job_id, field_name, field_type, options_json, required ? 1 : 0];
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error adding job form field:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to add job form field', error_details: err.message });
    }
    res.json({ status: 'success', message: 'Job form field added successfully', id: result.insertId });
  });
});

// ✅ PUT: تعديل حقل
app.put('/api/job-form-fields/:id', (req, res) => {
  const id = req.params.id;
  const { field_name, field_type, options, required } = req.body;
  if (!id || !field_name || !field_type) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }
  let options_json = null;
  if (['select', 'dropdown', 'radio'].includes(field_type) && options) {
    options_json = JSON.stringify(Array.isArray(options) ? options : options.split(','));
  }
  const sql = `UPDATE job_form_fields SET field_name = ?, field_type = ?, options = ?, required = ?, updated_at = NOW() WHERE id = ?`;
  const values = [field_name, field_type, options_json, required ? 1 : 0, id];
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error updating job form field:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to update job form field', error_details: err.message });
    }
    res.json({ status: 'success', message: 'Job form field updated successfully' });
  });
});

// ✅ DELETE: حذف حقل
app.delete('/api/job-form-fields/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM job_form_fields WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting job form field:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to delete job form field', error_details: err.message });
    }
    res.json({ status: 'success', message: 'Job form field deleted successfully' });
  });
});

/* ------------------- 🟣 Job Applications Routes ------------------- */

// ✅ GET: جلب كل التقديمات (مع إمكانية الفلترة بـ job_id)
app.get('/api/applications', (req, res) => {
  const job_id = req.query.job_id;
  let sql = 'SELECT * FROM job_applications';
  let params = [];
  if (job_id) {
    sql += ' WHERE job_id = ?';
    params.push(job_id);
  }
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching applications:', err);
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }
    res.json(results);
  });
});

// ✅ POST: إضافة تقديم جديد (يدعم رفع ملف)
const uploadApplication = upload.single('resume'); // اسم الحقل المتوقع للملف
app.post('/api/applications', (req, res) => {
  uploadApplication(req, res, function (err) {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(500).json({ status: 'error', message: 'File upload error', error_details: err.message });
    }
    let job_id, applicant_data;
    if (req.is('multipart/form-data')) {
      job_id = req.body.job_id;
      try {
        applicant_data = JSON.parse(req.body.applicant_data);
      } catch {
        applicant_data = {};
      }
      // إذا تم رفع ملف، أضف اسمه للبيانات
      if (req.file) {
        applicant_data[req.file.fieldname] = req.file.filename;
      }
    } else {
      job_id = req.body.job_id;
      applicant_data = req.body.applicant_data;
    }
    if (!job_id || !applicant_data) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }
    const sql = `INSERT INTO job_applications (job_id, applicant_data, created_at) VALUES (?, ?, NOW())`;
    const values = [job_id, JSON.stringify(applicant_data)];
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error adding application:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to add application', error_details: err.message });
      }
      res.json({ status: 'success', message: 'Application added successfully', id: result.insertId });
    });
  });
});

// ✅ POST: تحديث حالة التقديم (قبول/رفض/مراحل متعددة)
function updateApplicationStatusRoute(statusField, statusValue) {
  return (req, res) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Missing application id' });
    }
    const sql = `UPDATE job_applications SET status = ? WHERE id = ?`;
    db.query(sql, [statusValue, id], (err, result) => {
      if (err) {
        console.error('Error updating application status:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to update application status', error_details: err.message });
      }
      res.json({ status: 'success', message: `Application status updated to ${statusValue}` });
    });
  };
}

app.post('/api/applications/:id/approve', updateApplicationStatusRoute('status', 'approved'));
app.post('/api/applications/:id/reject', updateApplicationStatusRoute('status', 'rejected'));
app.post('/api/applications/:id/approve_hr_technical', updateApplicationStatusRoute('status', 'approved_from_hr_technical'));
app.post('/api/applications/:id/reject_hr_technical', updateApplicationStatusRoute('status', 'rejected_from_hr_technical'));
app.post('/api/applications/:id/approve_head_manager', updateApplicationStatusRoute('status', 'approved_from_head_manager'));
app.post('/api/applications/:id/reject_head_manager', updateApplicationStatusRoute('status', 'rejected_from_head_manager'));

// ✅ POST: إضافة طلب عرض سعر (Quote)
app.post('/api/quote', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject) {
    return res.status(400).json({ error: 'Name, email, and subject are required' });
  }
  const sql = `INSERT INTO quotes (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, NOW())`;
  db.query(sql, [name, email, subject, message], async (err, result) => {
    if (err) {
      console.error('Error adding quote:', err);
      return res.status(500).json({ error: 'Failed to add quote' });
    }
    // Send email to info@petrochoice.org
    try {
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'medoragab482@gmail.com',
          pass: 'dbxdtgifcxeddcsf'
        }
      });
      await transporter.sendMail({
        from: email, // user's email from the form
        replyTo: email, // so replies go to the user
        to: 'info@petrochoice.org',
        subject: `[Quote Request] ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: #0c61c0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">📋 New Quote Request</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Petrochoice Integrated Services</p>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="margin-bottom: 25px;">
                <h3 style="color: #0c61c0; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">📝 Request Details</h3>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #0c61c0;">
                  <p style="margin: 8px 0;"><strong style="color: #495057;">👤 Name:</strong> <span style="color: #212529;">${name}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #495057;">📧 Email:</strong> <span style="color: #212529;">${email}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #495057;">📋 Subject:</strong> <span style="color: #212529;">${subject}</span></p>
                  ${message ? `<p style="margin: 8px 0;"><strong style="color: #495057;">💬 Message:</strong></p><div style="background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6; margin-top: 8px;">${message.replace(/\n/g, '<br>')}</div>` : ''}
                </div>
              </div>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 14px; margin: 0;">This email was sent from the Quote Request form on your website.</p>
                <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">⏰ Sent on: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })}</p>
              </div>
            </div>
          </div>
        `
      });
    } catch (mailErr) {
      console.error('Error sending email:', mailErr);
      return res.status(500).json({ error: 'Failed to send email', details: mailErr.message });
    }
    res.json({ message: 'Quote request submitted successfully', id: result.insertId });
  });
});

// ✅ POST: إضافة رسالة تواصل (Contact Us)
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject) {
    return res.status(400).json({ error: 'Name, email, and subject are required' });
  }
  const sql = `INSERT INTO contacts (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, NOW())`;
  db.query(sql, [name, email, subject, message], async (err, result) => {
    if (err) {
      console.error('Error adding contact:', err);
      return res.status(500).json({ error: 'Failed to add contact message' });
    }
    // Send email to info@petrochoice.org
    try {
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'medoragab482@gmail.com',
          pass: 'dbxdtgifcxeddcsf'
        }
      });
      await transporter.sendMail({
        from: email, // user's email from the form
        replyTo: email, // so replies go to the user
        to: 'info@petrochoice.org',
        subject: `[Contact Message] ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 24px;">📞 New Contact Message</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Petrochoice Integrated Services</p>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="margin-bottom: 25px;">
                <h3 style="color: #28a745; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">📝 Contact Details</h3>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745;">
                  <p style="margin: 8px 0;"><strong style="color: #495057;">👤 Name:</strong> <span style="color: #212529;">${name}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #495057;">📧 Email:</strong> <span style="color: #212529;">${email}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #495057;">📋 Subject:</strong> <span style="color: #212529;">${subject}</span></p>
                  ${message ? `<p style="margin: 8px 0;"><strong style="color: #495057;">💬 Message:</strong></p><div style="background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6; margin-top: 8px;">${message.replace(/\n/g, '<br>')}</div>` : ''}
                </div>
              </div>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 14px; margin: 0;">This email was sent from the Contact Us form on your website.</p>
                <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">⏰ Sent on: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })}</p>
              </div>
            </div>
          </div>
        `
      });
    } catch (mailErr) {
      console.error('Error sending email:', mailErr);
      // Don't fail the request if email fails, just log
    }
    res.json({ message: 'Contact message submitted successfully', id: result.insertId });
  });
});

/* ------------------- 🚀 Start Server ------------------- */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// معالجة الأخطاء
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
