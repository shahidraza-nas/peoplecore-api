import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';
import { Sample } from './entities/sample.entity';
import { SampleController } from './sample.controller';
import { SampleService } from './sample.service';

@Module({
  imports: [SqlModule.register(Sample)],
  controllers: [SampleController],
  providers: [SampleService],
})
export class SampleModule {}
