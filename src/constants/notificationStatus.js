export const notificationReadStatusMap = {
  read: {
    label: '읽음',
    tone: 'read',
  },
  unread: {
    label: '읽지 않음',
    tone: 'unread',
  },
}

export function normalizeNotificationReadStatus(isRead) {
  return isRead ? 'read' : 'unread'
}
