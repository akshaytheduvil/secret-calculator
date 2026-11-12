import { Request, Response } from 'express';
import { BookingService } from '../services/booking.service.js';

export class BookingController {
  static async submit(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { customerName, gameCode, items } = req.body;
      const result = await BookingService.submitBooking({
        userId: req.user.id,
        customerName,
        gameCode,
        items
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Booking submission failed' });
    }
  }

  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { billId } = req.params;
      await BookingService.cancelBill(billId, req.user.id, req.user.role);
      res.json({ success: true, message: 'Bill cancelled successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Cancellation failed' });
    }
  }

  static async edit(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { billId } = req.params;
      const { customerName, items } = req.body;
      const result = await BookingService.editBill(billId, req.user.id, req.user.role, {
        customerName,
        items
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Booking update failed' });
    }
  }

  static async lastSale(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { gameCode } = req.params;
      const records = await BookingService.getLastSale(req.user.id, gameCode, req.user.role);
      res.json({ records });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to fetch last sale' });
    }
  }
}
