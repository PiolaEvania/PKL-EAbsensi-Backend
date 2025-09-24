import moment from 'moment-timezone';
import Announcement from '../models/Announcement.js';

export const createAnnouncement = async (req, res) => {
  const { content, start_date, end_date } = req.body;
  
  try {
    const parsedStartDate = moment.tz(start_date, 'Asia/Makassar').toDate();
    const parsedEndDate = moment.tz(end_date, 'Asia/Makassar').toDate();

    const newAnnouncement = new Announcement({
      content,
      start_date: parsedStartDate, 
      end_date: parsedEndDate,     
      created_by: req.user.id
    });
    await newAnnouncement.save();
    res.status(201).json({ message: 'Pengumuman berhasil dibuat.', data: newAnnouncement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getActiveAnnouncements = async (req, res) => {
  try {
    // Ini sudah benar
    const now = moment.tz('Asia/Makassar').toDate();

    const announcements = await Announcement.find({
      start_date: { $lte: now },
      end_date: { $gte: now }
    }).sort({ createdAt: -1 });
    
    res.status(200).json(announcements);
  } catch (error) {
    console.error("Error fetching active announcements:", error); 
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateAnnouncement = async (req, res) => {
    const { announcementId } = req.params;
    const { content, start_date, end_date } = req.body;

    try {
        const updateData = { content };

        if (start_date) {
            updateData.start_date = moment.tz(start_date, 'Asia/Makassar').toDate();
        }
        if (end_date) {
            updateData.end_date = moment.tz(end_date, 'Asia/Makassar').toDate();
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            announcementId,
            updateData,
            { new: true, runValidators: true }
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