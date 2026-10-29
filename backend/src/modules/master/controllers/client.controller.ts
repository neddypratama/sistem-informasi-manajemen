import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientService } from '../services/client.service.js';
import { QueryClientDto } from '../dto/query-client.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('master/clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  async findAll(@Query() query: QueryClientDto) {
    return this.clientService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clientService.findOne(Number(id));
  }

  @Post()
  async create(
    @Body() body: { name: string; type: any; phone?: string; alamat?: string; keterangan?: string; code?: string },
  ) {
    return this.clientService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: { name?: string; type?: any; phone?: string; alamat?: string; keterangan?: string; code?: string },
  ) {
    return this.clientService.update(Number(id), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.clientService.remove(Number(id));
  }
}
