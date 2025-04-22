
import { prisma } from '../db';

export class PlannerService {
  async searchInventory(query: string) {
    // Search across inventory items
    const items = await prisma.inventoryItem.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { tags: { has: query } }
        ]
      }
    });
    return items;
  }

  async searchContent(query: string) {
    // Search across content items
    const content = await prisma.contentItem.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { tags: { has: query } }
        ]
      }
    });
    return content;
  }

  async searchOrders(query: string) {
    // Search across orders
    const orders = await prisma.clientOrder.findMany({
      where: {
        OR: [
          { clientName: { contains: query } },
          { orderType: { contains: query } },
          { status: { contains: query } }
        ]
      }
    });
    return orders;
  }

  async getInventoryStats() {
    const stats = await prisma.inventoryItem.groupBy({
      by: ['category'],
      _count: true,
      _sum: {
        quantity: true
      }
    });
    return stats;
  }

  async getUpcomingContent() {
    const content = await prisma.contentItem.findMany({
      where: {
        publishDate: {
          gte: new Date()
        }
      },
      orderBy: {
        publishDate: 'asc'
      },
      take: 5
    });
    return content;
  }

  async getPendingOrders() {
    const orders = await prisma.clientOrder.findMany({
      where: {
        status: 'pending'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return orders;
  }
}
