export class PresenceManager {
  private userSockets: Map<string, Set<string>> = new Map();

  /**
   * Adds a socket connection for a user.
   * Returns true if the user transitioned from OFFLINE to ONLINE.
   */
  addUserSocket(userId: string, socketId: string): boolean {
    let sockets = this.userSockets.get(userId);
    const isNewOnline = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
    }
    sockets.add(socketId);

    return isNewOnline;
  }

  /**
   * Removes a socket connection for a user.
   * Returns true if the user transitioned from ONLINE to OFFLINE.
   */
  removeUserSocket(userId: string, socketId: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
      return true;
    }

    return false;
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}

export const presence = new PresenceManager();
