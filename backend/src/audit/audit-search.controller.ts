import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('audit')
@UseGuards(RolesGuard)
export class AuditSearchController {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  @Get('search')
  @Roles(UserRole.SuperAdmin)
  async search(
    @Query('actorId') actorId?: string,
    @Query('labId') labId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = Math.min(Math.max(parseInt(limit || '50', 10), 1), 200);
    const match: any = {};
    if (actorId) match.actorId = actorId;
    if (labId) match.labId = new Types.ObjectId(labId);
    if (action) match.action = action;
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    if (cursor) match._id = { $lt: new Types.ObjectId(cursor) };

    // Aggregation: page + join actor user + join lab so the UI can show names
    // rather than opaque object-id prefixes. $convert tolerates non-ObjectId
    // actorIds (e.g. the "system" sentinel) by returning null on failure.
    const rows = await this.auditModel
      .aggregate([
        { $match: match },
        { $sort: { _id: -1 } },
        { $limit: lim + 1 },
        {
          $lookup: {
            from: 'users',
            let: { actorIdStr: '$actorId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$actorIdStr',
                          to: 'objectId',
                          onError: null,
                          onNull: null,
                        },
                      },
                    ],
                  },
                },
              },
              { $project: { name: 1, role: 1, phone: 1 } },
            ],
            as: 'actor',
          },
        },
        {
          $lookup: {
            from: 'labs',
            localField: 'labId',
            foreignField: '_id',
            as: 'lab',
            pipeline: [{ $project: { name: 1, licenseNumber: 1 } }],
          },
        },
        {
          $addFields: {
            actor: { $arrayElemAt: ['$actor', 0] },
            lab: { $arrayElemAt: ['$lab', 0] },
          },
        },
      ])
      .exec();

    const hasMore = rows.length > lim;
    const page = hasMore ? rows.slice(0, lim) : rows;
    return {
      items: page,
      nextCursor: hasMore ? page[page.length - 1]._id.toString() : null,
    };
  }
}
