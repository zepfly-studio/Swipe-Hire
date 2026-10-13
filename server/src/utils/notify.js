import { config } from '../config/index.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { sendMail } from './mailer.js';

// Everyone on a company's team (owner + invited recruiters) gets the notification.
export async function notifyCompany(companyId, payload) {
  const team = await User.find({ $or: [{ _id: companyId }, { companyId }] }).select('_id').lean();
  await Promise.all(team.map((u) => notify(u._id, payload)));
}

// Creates an in-app notification and, when `email` is set, also emails the user.
// Failures here must never break the action that triggered them.
export async function notify(userId, { type, title, body = '', link = '', from, email = false }) {
  try {
    await Notification.create({ user: userId, type, title, body, link, from });
    if (email) {
      const user = await User.findById(userId).select('email name').lean();
      if (user) {
        await sendMail({
          to: user.email,
          subject: `${title} · Swipe Hire`,
          text: `Hi ${user.name.split(' ')[0]},\n\n${body}\n\nOpen Swipe Hire: ${config.clientUrls[0]}${link}\n\n— Team Swipe Hire`,
        });
      }
    }
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}
