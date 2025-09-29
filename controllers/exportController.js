import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import axios from 'axios';
import moment from 'moment-timezone';

export const exportAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { format } = req.query;

    const user = await User.findById(userId);
    const attendance = await Attendance.find({ user_id: userId }).sort({ date: 'asc' });

    if (!user) {
      return res.status(404).send('User not found');
    }

    if (format === 'pdf') {
      await generatePdf(user, attendance, res);
    } else if (format === 'xlsx') {
      await generateXlsx(user, attendance, res);
    } else {
      res.status(400).send('Invalid format specified');
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Server error during export');
  }
};

const generatePdf = async (user, attendance, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  const filename = `Laporan Absensi - ${user.name}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  try {
    const logoResponse = await axios.get('https://i.imgbox.com/cN2ke70I.png', { responseType: 'arraybuffer' });
    const logoImage = Buffer.from(logoResponse.data, 'binary');
    doc.image(logoImage, 50, 45, { width: 60 });
  } catch (error) {
    console.error("Could not fetch logo for PDF", error);
  }
  
  doc.font('Helvetica-Bold').fontSize(14).text('Dinas Ketahanan Pangan, Pertanian dan Perikanan', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10).text('Komplek Screen House Jl. Pangeran Hidayatullah/Lingkar Dalam Utara', { align: 'center' });
  doc.fontSize(10).text('Kel. Benua Anyar Kec. Banjarmasin Timur 70239', { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('blue').text('dkp3.banjarmasinkota.go.id', { align: 'center', link: 'http://dkp3.banjarmasinkota.go.id', underline: true });
  doc.fillColor('black');
  doc.moveDown(2);

  doc.font('Helvetica-Bold').fontSize(12).text('Laporan Absensi Peserta Magang');
  doc.moveDown(1);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Nama: ${user.name}`);
  doc.text(`Nomor Telepon: ${user.phone || '-'}`);
  doc.text(`Tanggal Mulai: ${new Date(user.internship_start).toLocaleDateString('id-ID')}`);
  doc.text(`Tanggal Selesai: ${new Date(user.internship_end).toLocaleDateString('id-ID')}`);
  doc.moveDown(1.5);

  const tableTop = doc.y;
  const col1 = 50;
  const col2 = 200;
  const col3 = 300;
  const col4 = 400;

  doc.font('Helvetica-Bold');
  doc.text('Hari, Tanggal', col1, tableTop);
  doc.text('Jam Masuk', col2, tableTop);
  doc.text('Status', col3, tableTop);
  doc.text('Catatan', col4, tableTop);
  doc.y += 20;
  
  doc.font('Helvetica');
  attendance.forEach(att => {
    if (doc.y > 700) {
        doc.addPage();
    }
    const rowY = doc.y;
    const displayDate = new Date(att.date.replace(/-/g, '/')).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    
    doc.text(displayDate, col1, rowY, { width: 140 });
    doc.text(att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar'}) : '-', col2, rowY);
    doc.text(att.status, col3, rowY);
    doc.text(att.notes || '-', col4, rowY, { width: 150 });

    const rowHeight = Math.max(
        doc.heightOfString(displayDate, { width: 140 }),
        doc.heightOfString(att.notes || '-', { width: 150 })
    );
    doc.y = rowY + rowHeight + 10;
  });

  if (doc.y > 650) {
    doc.addPage();
  }

  const todayFormatted = moment.tz('Asia/Makassar').format('D MMMM YYYY');
  
  const signatureY = doc.y < 650 ? 650 : doc.y + 50; 
  doc.text(`Banjarmasin, ${todayFormatted}`, 0, signatureY, { align: 'right' });
  doc.moveDown(0.5);
  doc.text('Mengetahui,', { align: 'right' });
  doc.moveDown(3);
  doc.text('Kepala DKP3 Kota Banjarmasin', { align: 'right' });

  doc.end();
};

const generateXlsx = async (user, attendance, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Absensi');
    
    worksheet.mergeCells('A1:D1'); // Sesuaikan merge cell
    worksheet.getCell('A1').value = 'Dinas Ketahanan Pangan, Pertanian dan Perikanan Kota Banjarmasin';
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    
    worksheet.addRow([]);
    worksheet.addRow(['Nama:', user.name]);
    worksheet.addRow(['Nomor Telepon:', user.phone || '-']);
    worksheet.addRow(['Tanggal Mulai:', new Date(user.internship_start).toLocaleDateString('id-ID')]);
    worksheet.addRow(['Tanggal Selesai:', new Date(user.internship_end).toLocaleDateString('id-ID')]);
    worksheet.addRow([]);

    const headerRow = worksheet.addRow(['Hari, Tanggal', 'Jam Masuk', 'Status', 'Catatan']);
    headerRow.font = { bold: true };

    attendance.forEach(att => {
        worksheet.addRow([
            new Date(att.date.replace(/-/g, '/')).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar'}) : '-',
            att.status,
            att.notes || '-'
        ]);
    });

    worksheet.columns.forEach(column => {
        column.width = 35;
    });

    worksheet.addRow([]);
    worksheet.addRow([]);
    
    const todayFormatted = moment.tz('Asia/Makassar').format('D MMMM YYYY');
    const signatureRowStart = worksheet.lastRow.number + 1;

    worksheet.mergeCells(`C${signatureRowStart}:D${signatureRowStart}`);
    worksheet.getCell(`C${signatureRowStart}`).value = `Banjarmasin, ${todayFormatted}`;
    worksheet.getCell(`C${signatureRowStart}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`C${signatureRowStart + 1}:D${signatureRowStart + 1}`);
    worksheet.getCell(`C${signatureRowStart + 1}`).value = 'Mengetahui,';
    worksheet.getCell(`C${signatureRowStart + 1}`).alignment = { horizontal: 'center' };
    
    worksheet.mergeCells(`C${signatureRowStart + 3}:D${signatureRowStart + 3}`);
    worksheet.getCell(`C${signatureRowStart + 3}`).value = 'Kepala DKP3 Kota Banjarmasin';
    worksheet.getCell(`C${signatureRowStart + 3}`).alignment = { horizontal: 'center' };
    
    const filename = `Laporan Absensi - ${user.name}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
};