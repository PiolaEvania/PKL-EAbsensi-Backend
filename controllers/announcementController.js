import Announcement from '../models/Announcement.js';

export const createAnnouncement = async (req, res) => {
  const { content, start_date, end_date } = req.body;
  
  try {
    const newAnnouncement = new Announcement({
      content,
      start_date,
      end_date,
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
    const now = new Date();
    const announcements = await Announcement.find({
      start_date: { $lte: now },
      end_date: { $gte: now }
    }).sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};