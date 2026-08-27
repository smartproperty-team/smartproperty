// ===========================================
// SmartProperty - Accounting Controller
// ===========================================

import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ACCOUNTING_ROLES } from '../users/role-groups';
import { UserRole } from '../users/entities/user.entity';
import { AccountingService } from './accounting.service';
import {
  AnalyticsQueryDto,
  BreakdownQueryDto,
} from './dto/analytics-query.dto';
import { toCsv } from './exporters/csv-exporter';
import { writeXlsx } from './exporters/xlsx-exporter';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
  agencyId?: string;
}

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('analytics/kpis')
  @Roles(...ACCOUNTING_ROLES)
  @ApiOperation({
    summary:
      'Aggregate KPIs for the accountant agency (gross, net, fees, refunds, counts).',
  })
  @ApiResponse({ status: 200, description: 'KPI summary returned.' })
  getKpis(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.accountingService.getKpis(user, query);
  }

  @Get('analytics/timeseries')
  @Roles(...ACCOUNTING_ROLES)
  @ApiOperation({
    summary:
      'Gross/net/fees/count bucketed by day|week|month|quarter|year (Europe/Paris).',
  })
  @ApiResponse({ status: 200, description: 'Time-series buckets returned.' })
  getTimeseries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.accountingService.getTimeseries(user, query);
  }

  @Get('analytics/breakdown')
  @Roles(...ACCOUNTING_ROLES)
  @ApiOperation({
    summary: 'Top-N breakdown by method, type, property, or tenant.',
  })
  @ApiResponse({ status: 200, description: 'Top-N entries returned.' })
  getBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BreakdownQueryDto,
  ) {
    return this.accountingService.getBreakdown(user, query);
  }

  @Get('exports/payments.csv')
  @Roles(...ACCOUNTING_ROLES)
  @ApiOperation({
    summary: 'Export filtered payments as CSV (UTF-8 with BOM).',
  })
  @ApiResponse({ status: 200, description: 'CSV file streamed.' })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.accountingService.getExportRows(user, query);
    const csv = toCsv(rows);
    const filename = this.buildFilename('csv', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(csv);
  }

  @Get('exports/payments.xlsx')
  @Roles(...ACCOUNTING_ROLES)
  @ApiOperation({
    summary: 'Export filtered payments as an Excel workbook (.xlsx).',
  })
  @ApiResponse({ status: 200, description: 'XLSX file streamed.' })
  async exportXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.accountingService.getExportRows(user, query);
    const filename = this.buildFilename('xlsx', query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    await writeXlsx(rows, res);
    res.end();
  }

  private buildFilename(ext: string, query: AnalyticsQueryDto): string {
    const today = new Date().toISOString().slice(0, 10);
    const range =
      query.startDate || query.endDate
        ? `_${query.startDate ?? 'start'}_${query.endDate ?? 'end'}`
        : '';
    return `payments${range}_${today}.${ext}`;
  }
}
