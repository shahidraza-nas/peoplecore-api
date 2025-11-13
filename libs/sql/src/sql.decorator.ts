import { BadRequestException } from '@nestjs/common';
import { isObject, isString } from 'class-validator';
import { IncludeOptions, Op } from 'sequelize';
import { SqlDialect, sqlDialect } from 'src/app.config';
import { SqlJob } from './sql.job';
import { SqlModel } from './sql.model';
import { convertPopulate, convertWhere, populateSelect } from './sql.utils';

/**
 * Decorator for converting request job.payload to job.options
 *
 * job object will be available for model's methods as a parameter
 */
export const ReadPayload = <M extends SqlModel>(
  _target: any,
  _methodName: string,
  descriptor: PropertyDescriptor,
) => {
  const original = descriptor.value;
  descriptor.value = function wrapper(job: SqlJob<M>) {
    const { payload, options } = job;
    if (payload) {
      const select = payload.select || [];
      const where = convertWhere(payload.where || {});

      // set attributes and populated attributes
      const { attributes, populateAttributes } = populateSelect(
        select.map((x: string) => x.replace(/[^a-zA-Z0-9_.]/g, '')),
      );

      // set up populate with the select attributes
      const populate = [
        ...(payload.populate || []),
        ...populateAttributes.map((x) => x.association),
      ].filter((x: any, i: any, a: string | any[]) => a.indexOf(x) === i);

      /* add populate to sequelize include option */
      const include =
        options.include || convertPopulate(populate || [], populateAttributes);

      /* Search from searchFields, if payload.search key is set */
      where[Op.and] = where[Op.and] || [];
      if (payload.search && this.searchFields) {
        if (
          Array.isArray(payload.search) &&
          (!isObject(this.searchFields) ||
            !this.searchFields[payload.search[0]])
        ) {
          throw new BadRequestException([
            {
              value: payload.search,
              property: 'search',
              children: [],
              constraints: {
                isString: `Search must be a string`,
              },
            },
          ]);
        }

        const searchScope = Array.isArray(payload.search)
          ? payload.search[0]
          : 'default';
        const searchKey = Array.isArray(payload.search)
          ? payload.search[1]
          : payload.search;
        const searchFields =
          isObject(this.searchFields) && this.searchFields[searchScope]
            ? Array.isArray(this.searchFields[searchScope])
              ? this.searchFields[searchScope]
              : this.searchFields[searchScope].fields
            : this.searchFields;
        const whereOR = [];

        for (let index = 0; index < searchFields.length; index++) {
          const field = searchFields[index];
          if (sqlDialect === SqlDialect.Postgres) {
            whereOR.push({ [field]: { [Op.iLike]: `%${payload.search}%` } });
          } else {
            whereOR.push({ [field]: { [Op.substring]: searchKey } });
          }
        }

        where[Op.and].push({ [Op.or]: whereOR });

        const searchPopulate =
          isObject(this.searchFields) &&
          isObject(this.searchFields[searchScope])
            ? (this.searchFields[searchScope] as any).populate
            : this.searchPopulate;

        if (searchPopulate.length) {
          for (let index = 0; index < searchPopulate.length; index++) {
            const association = searchPopulate[index];
            if (isObject(association)) {
              include.push(association);
            } else if (isString(association)) {
              const associationIndex = include.findIndex(
                (x) => (x.association || x) === association,
              );
              if (associationIndex === -1) {
                include.push({ association, include: [] });
              }
            }
          }
        }
      }

      job.options = {
        where: where || undefined,
        include: include || undefined,
        attributes: attributes.length ? attributes : undefined,
        offset: payload.offset ? +payload.offset : 0,
        limit: payload.limit,
        order: payload.sort || undefined,
        scope: payload.scope || [],
        pagination: true,
        ...options,
      };
    }

    return original.apply(this, [job]);
  };
};

/**
 * Decorator for converting request job.payload to job.options
 *
 * job object will be available for model's methods as a parameter
 */
export const WritePayload = <M extends SqlModel>(
  _target: any,
  _methodName: string,
  descriptor: PropertyDescriptor,
) => {
  const original = descriptor.value;
  descriptor.value = function wrapper(job: SqlJob<M>) {
    const { payload, options } = job;
    if (payload) {
      const select = payload.select || [];

      // set attributes and populated attributes
      const { attributes, populateAttributes } = populateSelect(
        select.map((x: string) => x.replace(/[^a-zA-Z0-9_.]/g, '')),
      );

      // set up populate with the select attributes
      const populate = [
        ...(payload.populate || []),
        ...populateAttributes.map((x) => x.association),
      ].filter((x: any, i: any, a: string | any[]) => a.indexOf(x) === i);

      /* add populate to sequelize include option */
      const include =
        options.include || convertPopulate(populate, populateAttributes);

      job.options = {
        where: payload.where || undefined,
        include: include || undefined,
        attributes: attributes.length ? attributes : undefined,
        ...options,
      };
    }

    return original.apply(this, [job]);
  };
};

/**
 * Decorator for converting request job.payload to job.options
 *
 * job object will be available for model's methods as a parameter
 */
export const DeletePayload = <M extends SqlModel>(
  _target: any,
  _methodName: string,
  descriptor: PropertyDescriptor,
) => {
  const original = descriptor.value;
  descriptor.value = function wrapper(job: SqlJob<M>) {
    const { payload, options } = job;
    if (payload) {
      /* Check if hard delete */
      const force = payload.mode && payload.mode === 'hard';
      job.options = {
        where: payload.where || undefined,
        force,
        ...options,
      };
    }
    return original.apply(this, [job]);
  };
};

const INCLUDE_OPTIONS_KEY = 'INCLUDE_OPTIONS';

export function Include(options: IncludeOptions) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(INCLUDE_OPTIONS_KEY, options, target, propertyKey);
  };
}

export function getIncludeOptions(
  model: any,
  propertyKey: string,
): IncludeOptions {
  return Reflect.getMetadata(INCLUDE_OPTIONS_KEY, new model(), propertyKey);
}
