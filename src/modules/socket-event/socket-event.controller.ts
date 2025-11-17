import { Controller } from '@nestjs/common';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { SocketEventService } from './socket-event.service';
import { MsListener } from 'src/core/core.decorators';
import { APPEVENTS } from 'src/constants/events.constants';
import { Job, JobResponse } from 'src/core/core.job';

@Controller('socket-event')
export class SocketEventController {
  constructor(
    private readonly socketEventService: SocketEventService,
    private client: MsClientService,
  ) {}

  /**
   * Queue listener for SocketEvent
   */
  @MsListener(APPEVENTS.SOCKET)
  async execute(job: Job): Promise<void> {
    const response = await this.socketEventService[job.action]<JobResponse>(
      new Job(job),
    );
    await this.client.jobDone(job, response);
  }
}
