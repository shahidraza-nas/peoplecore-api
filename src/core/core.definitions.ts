import { ApiHeaderOptions, ApiResponseOptions } from '@nestjs/swagger';
import { getVersions } from './core.utils';

export const ResponseBadRequest: ApiResponseOptions = {
  description: 'Bad Request',
  schema: {
    properties: {
      statusCode: {
        type: 'number',
        example: 400,
      },
      error: {
        type: 'string',
        example: 'Bad Request',
      },
      message: {
        type: 'array',
        items: {
          properties: {
            property: {
              type: 'string',
              example: 'email',
            },
            value: {
              type: 'string',
              example: 'invalid@email',
            },
            constraints: {
              type: 'object',
              example: {
                isEmail: 'email should be a valid email',
              },
            },
          },
        },
      },
    },
  },
};

export const ResponseUnauthorized: ApiResponseOptions = {
  description: 'Unauthorized',
  schema: {
    properties: {
      statusCode: {
        type: 'number',
        example: 401,
      },
      error: {
        type: 'string',
        example: 'Unauthorized',
      },
      message: {
        type: 'string',
        example: 'Invalid credentials',
      },
    },
  },
};

export const ResponseForbidden: ApiResponseOptions = {
  description: 'Forbidden',
  schema: {
    properties: {
      statusCode: {
        type: 'number',
        example: 403,
      },
      error: {
        type: 'string',
        example: 'Forbidden',
      },
      message: {
        type: 'string',
      },
    },
  },
};

export const ResponseInternalServerError: ApiResponseOptions = {
  description: 'Internal Server Error',
  schema: {
    properties: {
      statusCode: {
        type: 'number',
        example: 500,
      },
      error: {
        type: 'string',
        example: 'Internal Server Error',
      },
      message: {
        type: 'string',
      },
    },
  },
};

export const VersionHeader: ApiHeaderOptions = {
  name: 'X-Application-Version',
  description: 'Application Version',
  enum: getVersions(),
};
