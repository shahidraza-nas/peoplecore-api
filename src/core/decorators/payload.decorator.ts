import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator for fetching payload from Request query object
 *
 *```js
 * @Payload() payload: any
 * ```
 * @return {object} payload
 */
export const Payload = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.payload;
  },
);
