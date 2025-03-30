const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getConversations = async (req, res) => {
  const userId = req.user.id;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(messages);
};

exports.getMessagesWithUser = async (req, res) => {
  const userId = req.user.id;
  const targetUserId = req.params.userId;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        {
          senderId: userId,
          receiverId: targetUserId
        },
        {
          senderId: targetUserId,
          receiverId: userId
        }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  res.json(messages);
};

exports.sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;
  const { content } = req.body;

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      content
    }
  });

  res.status(201).json(message);
};

exports.deleteMessage = async (req, res) => {
  const userId = req.user.id;
  const messageId = req.params.messageId;

  const message = await prisma.message.findUnique({
    where: { id: messageId }
  });

  if (!message) return res.status(404).json({ message: 'Message not found' });

  const updateData = {};

  if (message.senderId === userId) updateData.deletedBySender = true;
  if (message.receiverId === userId) updateData.deletedByReceiver = true;

  await prisma.message.update({
    where: { id: messageId },
    data: updateData
  });

  res.json({ success: true });
};
