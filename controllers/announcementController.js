import moment from 'moment-timezone';
import Announcement from '../models/Announcement.js';

export const createAnnouncement = async (req, res) => {
  const { content, start_date, end_date } = req.body;

  try {
    const parsedStartDate = moment.tz(start_date, 'Asia/Makassar').toDate();
    const parsedEndDate = moment.tz(end_date, 'Asia/Makassar').toDate();

    if (parsedStartDate.isAfter(parsedEndDate)) {
      return res.status(400).json({ message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' });
    }

    const newAnnouncement = new Announcement({
      content,
      start_date: parsedStartDate,
      end_date: parsedEndDate,
      created_by: req.user.id,
    });
    await newAnnouncement.save();
    res.status(201).json({ message: 'Pengumuman berhasil dibuat.', data: newAnnouncement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getActiveAnnouncements = async (req, res) => {
  try {
    const now = moment.tz('Asia/Makassar').toDate();

    const announcements = await Announcement.find({
      start_date: { $lte: now },
      end_date: { $gte: now },
    }).sort({ createdAt: -1 });

    res.status(200).json(announcements);
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateAnnouncement = async (req, res) => {
  const { announcementId } = req.params;
  const { content, start_date, end_date } = req.body;

  try {
    const existingAnnouncement = await Announcement.findById(announcementId);
    if (!existingAnnouncement) {
      return res.status(404).json({ message: 'Pengumuman tidak ditemukan.' });
    }

    const updateData = { content };

    const finalStartDate = start_date ? moment.tz(start_date, 'Asia/Makassar') : moment(existingAnnouncement.start_date);
    const finalEndDate = end_date ? moment.tz(end_date, 'Asia/Makassar') : moment(existingAnnouncement.end_date);

    if (finalStartDate.isAfter(finalEndDate)) {
      return res.status(400).json({ message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' });
    }

    if (start_date) {
      updateData.start_date = finalStartDate.toDate();
    }
    if (end_date) {
      updateData.end_date = finalEndDate.toDate();
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      announcementId,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedAnnouncement) {
      return res.status(404).json({ message: 'Pengumuman tidak ditemukan.' });
    }
    res.status(200).json({ message: 'Pengumuman berhasil diperbarui.', data: updatedAnnouncement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteAnnouncement = async (req, res) => {
  const { announcementId } = req.params;
  try {
    const deletedAnnouncement = await Announcement.findByIdAndDelete(announcementId);
    if (!deletedAnnouncement) {
      return res.status(404).json({ message: 'Pengumuman tidak ditemukan.' });
    }
    res.status(200).json({ message: 'Pengumuman berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const cleanupExpiredAnnouncements = async (req, res) => {
  try {
    const now = moment.tz('Asia/Makassar').toDate();

    const result = await Announcement.deleteMany({ end_date: { $lt: now } });

    res.status(200).json({
      message: 'Proses pembersihan pengumuman kedaluwarsa selesai.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error during announcement cleanup:', error);
    res.status(500).json({ message: 'Server error during cleanup' });
  }
};
