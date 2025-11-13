import { RootFilterQuery } from 'mongoose';

export interface SeedReferenceProps {
  model: string;
  where: any;
}

export class SeedReference {
  model: string;
  where: any;

  constructor(ref: SeedReferenceProps) {
    this.model = ref.model;
    this.where = ref.where;
  }
}

export interface SeedRecord {
  [key: string]:
    | null
    | boolean
    | number
    | string
    | Date
    | SeedReference
    | SeedRecord;
}

export type SeedItem<T> = Partial<T> & SeedRecord;

export type Seed<T> =
  | {
      model: string;
      data: SeedItem<T>[];
      action: 'never' | 'once';
    }
  | {
      model: string;
      data: SeedItem<T>[];
      action: 'always';
      alwaysRule: 'truncate' | 'delete';
    }
  | {
      model: string;
      data: SeedItem<T>[];
      action: 'always';
      alwaysRule: 'create' | 'update';
      alwaysWhere: (item: SeedItem<T>) => RootFilterQuery<unknown>;
    };
