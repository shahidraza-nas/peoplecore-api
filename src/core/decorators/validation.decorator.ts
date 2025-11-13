import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

/**
 * Validate if value is equal to another field value
 */
export function IsEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isEqual',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: ({ property, constraints: [targetField] }) => {
          return `${property} should be equal to ${targetField}`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
      },
    });
  };
}

/**
 * Validate if value is not equal to another field value
 */
export function IsNotEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isNotEqual',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: ({ property, constraints: [targetField] }) => {
          return `${property} should not be equal to ${targetField}`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value !== relatedValue;
        },
      },
    });
  };
}

/**
 * Validate if value is greater than another field value
 */
export function IsGreaterThan(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isGreaterThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: ({ property, constraints: [targetField] }) => {
          return `${property} should be greater than ${targetField}`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return (
            typeof relatedValue === 'undefined' ||
            (typeof value === typeof relatedValue &&
              (relatedValue instanceof Date
                ? new Date(value).valueOf() > new Date(relatedValue).valueOf()
                : value > relatedValue))
          );
        },
      },
    });
  };
}

/**
 * Validate if value is greater than or equal to another field value
 */
export function IsGreaterThanEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isGreaterThanEqual',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: ({ property, constraints: [targetField] }) => {
          return `${property} should be greater than or equal to ${targetField}`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return (
            typeof relatedValue === 'undefined' ||
            (typeof value === typeof relatedValue &&
              (relatedValue instanceof Date
                ? new Date(value).valueOf() >= new Date(relatedValue).valueOf()
                : value >= relatedValue))
          );
        },
      },
    });
  };
}

/**
 * Validate if value is less than another field value
 */
export function IsLessThan(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isLessThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: ({ property, constraints: [targetField] }) => {
          return `${property} should be less than ${targetField}`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return (
            typeof relatedValue === 'undefined' ||
            (typeof value === typeof relatedValue &&
              (relatedValue instanceof Date
                ? new Date(value).valueOf() < new Date(relatedValue).valueOf()
                : value < relatedValue))
          );
        },
      },
    });
  };
}

/**
 * Validate if value is less than or equal to another field value
 */
export function IsLessThanEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isLessThanEqual',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: ({ property, constraints: [targetField] }) => {
          return `${property} should be less than or equal to ${targetField}`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return (
            typeof relatedValue === 'undefined' ||
            (typeof value === typeof relatedValue &&
              (relatedValue instanceof Date
                ? new Date(value).valueOf() <= new Date(relatedValue).valueOf()
                : value <= relatedValue))
          );
        },
      },
    });
  };
}

export function IsValidScope(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidScope',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown[]) {
          if (!Array.isArray(value)) return false;
          return value.every(
            (v) =>
              typeof v === 'string' ||
              (Array.isArray(v) &&
                v.length > 0 &&
                typeof v[0] === 'string' &&
                v
                  .slice(1)
                  .every(
                    (item) =>
                      typeof item === 'string' || typeof item === 'number',
                  )),
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be in valid format`;
        },
      },
    });
  };
}

export function IsStringOrStringArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStringOrStringArray',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return (
            typeof value === 'string' ||
            (Array.isArray(value) &&
              value.length > 0 &&
              value.every((item) => typeof item === 'string'))
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be in valid format`;
        },
      },
    });
  };
}

function validateValue(value: any): boolean {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(validateValue);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).every(
      ([key, val]) => typeof key === 'string' && validateValue(val),
    );
  }
  return false;
}

export function IsValidWhere(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidWhere',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value || typeof value !== 'object' || Array.isArray(value))
            return false;
          return Object.entries(value).every(
            ([key, val]) => typeof key === 'string' && validateValue(val),
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with string keys and values of type string | number | array | object (recursively)`;
        },
      },
    });
  };
}
