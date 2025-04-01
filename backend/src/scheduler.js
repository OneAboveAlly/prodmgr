const cron = require('node-cron');
const { dispatchScheduledNotifications } = require('./controllers/notification.controller');

let ioInstance;

function startScheduler(io) {
  ioInstance = io;

  cron.schedule('* * * * *', async () => {
    await dispatchScheduledNotifications(ioInstance);
    console.log('⏰ Cron: sprawdzam zaplanowane powiadomienia');
  });
}

module.exports = { startScheduler };