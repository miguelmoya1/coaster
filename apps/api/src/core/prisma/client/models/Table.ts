import type * as runtime from '@prisma/client/runtime/client';

import type * as $Enums from '../enums.js';
import type * as Prisma from '../internal/prismaNamespace.js';

/**
 * Model Table
 *
 */
export type TableModel = runtime.Types.Result.DefaultSelection<Prisma.$TablePayload>;

export type AggregateTable = {
  _count: TableCountAggregateOutputType | null;
  _min: TableMinAggregateOutputType | null;
  _max: TableMaxAggregateOutputType | null;
};

export type TableMinAggregateOutputType = {
  id: string | null;
  name: string | null;
  status: $Enums.TableStatus | null;
  barId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type TableMaxAggregateOutputType = {
  id: string | null;
  name: string | null;
  status: $Enums.TableStatus | null;
  barId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type TableCountAggregateOutputType = {
  id: number;
  name: number;
  status: number;
  barId: number;
  createdAt: number;
  updatedAt: number;
  _all: number;
};

export type TableMinAggregateInputType = {
  id?: true;
  name?: true;
  status?: true;
  barId?: true;
  createdAt?: true;
  updatedAt?: true;
};

export type TableMaxAggregateInputType = {
  id?: true;
  name?: true;
  status?: true;
  barId?: true;
  createdAt?: true;
  updatedAt?: true;
};

export type TableCountAggregateInputType = {
  id?: true;
  name?: true;
  status?: true;
  barId?: true;
  createdAt?: true;
  updatedAt?: true;
  _all?: true;
};

export type TableAggregateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which Table to aggregate.
   */
  where?: Prisma.TableWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of Tables to fetch.
   */
  orderBy?: Prisma.TableOrderByWithRelationInput | Prisma.TableOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the start position
   */
  cursor?: Prisma.TableWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` Tables from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` Tables.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Count returned Tables
   **/
  _count?: true | TableCountAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the minimum value
   **/
  _min?: TableMinAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the maximum value
   **/
  _max?: TableMaxAggregateInputType;
};

export type GetTableAggregateType<T extends TableAggregateArgs> = {
  [P in keyof T & keyof AggregateTable]: P extends '_count' | 'count'
    ? T[P] extends true
      ? number
      : Prisma.GetScalarType<T[P], AggregateTable[P]>
    : Prisma.GetScalarType<T[P], AggregateTable[P]>;
};

export type TableGroupByArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  where?: Prisma.TableWhereInput;
  orderBy?: Prisma.TableOrderByWithAggregationInput | Prisma.TableOrderByWithAggregationInput[];
  by: Prisma.TableScalarFieldEnum[] | Prisma.TableScalarFieldEnum;
  having?: Prisma.TableScalarWhereWithAggregatesInput;
  take?: number;
  skip?: number;
  _count?: TableCountAggregateInputType | true;
  _min?: TableMinAggregateInputType;
  _max?: TableMaxAggregateInputType;
};

export type TableGroupByOutputType = {
  id: string;
  name: string;
  status: $Enums.TableStatus;
  barId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: TableCountAggregateOutputType | null;
  _min: TableMinAggregateOutputType | null;
  _max: TableMaxAggregateOutputType | null;
};

export type GetTableGroupByPayload<T extends TableGroupByArgs> = Prisma.PrismaPromise<
  Array<
    Prisma.PickEnumerable<TableGroupByOutputType, T['by']> & {
      [P in keyof T & keyof TableGroupByOutputType]: P extends '_count'
        ? T[P] extends boolean
          ? number
          : Prisma.GetScalarType<T[P], TableGroupByOutputType[P]>
        : Prisma.GetScalarType<T[P], TableGroupByOutputType[P]>;
    }
  >
>;

export type TableWhereInput = {
  AND?: Prisma.TableWhereInput | Prisma.TableWhereInput[];
  OR?: Prisma.TableWhereInput[];
  NOT?: Prisma.TableWhereInput | Prisma.TableWhereInput[];
  id?: Prisma.StringFilter<'Table'> | string;
  name?: Prisma.StringFilter<'Table'> | string;
  status?: Prisma.EnumTableStatusFilter<'Table'> | $Enums.TableStatus;
  barId?: Prisma.StringFilter<'Table'> | string;
  createdAt?: Prisma.DateTimeFilter<'Table'> | Date | string;
  updatedAt?: Prisma.DateTimeFilter<'Table'> | Date | string;
  bar?: Prisma.XOR<Prisma.BarScalarRelationFilter, Prisma.BarWhereInput>;
  orders?: Prisma.OrderListRelationFilter;
};

export type TableOrderByWithRelationInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
  bar?: Prisma.BarOrderByWithRelationInput;
  orders?: Prisma.OrderOrderByRelationAggregateInput;
};

export type TableWhereUniqueInput = Prisma.AtLeast<
  {
    id?: string;
    AND?: Prisma.TableWhereInput | Prisma.TableWhereInput[];
    OR?: Prisma.TableWhereInput[];
    NOT?: Prisma.TableWhereInput | Prisma.TableWhereInput[];
    name?: Prisma.StringFilter<'Table'> | string;
    status?: Prisma.EnumTableStatusFilter<'Table'> | $Enums.TableStatus;
    barId?: Prisma.StringFilter<'Table'> | string;
    createdAt?: Prisma.DateTimeFilter<'Table'> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<'Table'> | Date | string;
    bar?: Prisma.XOR<Prisma.BarScalarRelationFilter, Prisma.BarWhereInput>;
    orders?: Prisma.OrderListRelationFilter;
  },
  'id'
>;

export type TableOrderByWithAggregationInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
  _count?: Prisma.TableCountOrderByAggregateInput;
  _max?: Prisma.TableMaxOrderByAggregateInput;
  _min?: Prisma.TableMinOrderByAggregateInput;
};

export type TableScalarWhereWithAggregatesInput = {
  AND?: Prisma.TableScalarWhereWithAggregatesInput | Prisma.TableScalarWhereWithAggregatesInput[];
  OR?: Prisma.TableScalarWhereWithAggregatesInput[];
  NOT?: Prisma.TableScalarWhereWithAggregatesInput | Prisma.TableScalarWhereWithAggregatesInput[];
  id?: Prisma.StringWithAggregatesFilter<'Table'> | string;
  name?: Prisma.StringWithAggregatesFilter<'Table'> | string;
  status?: Prisma.EnumTableStatusWithAggregatesFilter<'Table'> | $Enums.TableStatus;
  barId?: Prisma.StringWithAggregatesFilter<'Table'> | string;
  createdAt?: Prisma.DateTimeWithAggregatesFilter<'Table'> | Date | string;
  updatedAt?: Prisma.DateTimeWithAggregatesFilter<'Table'> | Date | string;
};

export type TableCreateInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  bar: Prisma.BarCreateNestedOneWithoutTablesInput;
  orders?: Prisma.OrderCreateNestedManyWithoutTableInput;
};

export type TableUncheckedCreateInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  barId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  orders?: Prisma.OrderUncheckedCreateNestedManyWithoutTableInput;
};

export type TableUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  bar?: Prisma.BarUpdateOneRequiredWithoutTablesNestedInput;
  orders?: Prisma.OrderUpdateManyWithoutTableNestedInput;
};

export type TableUncheckedUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  barId?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  orders?: Prisma.OrderUncheckedUpdateManyWithoutTableNestedInput;
};

export type TableCreateManyInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  barId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type TableUpdateManyMutationInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type TableUncheckedUpdateManyInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  barId?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type TableListRelationFilter = {
  every?: Prisma.TableWhereInput;
  some?: Prisma.TableWhereInput;
  none?: Prisma.TableWhereInput;
};

export type TableOrderByRelationAggregateInput = {
  _count?: Prisma.SortOrder;
};

export type TableCountOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type TableMaxOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type TableMinOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type TableNullableScalarRelationFilter = {
  is?: Prisma.TableWhereInput | null;
  isNot?: Prisma.TableWhereInput | null;
};

export type TableCreateNestedManyWithoutBarInput = {
  create?:
    | Prisma.XOR<Prisma.TableCreateWithoutBarInput, Prisma.TableUncheckedCreateWithoutBarInput>
    | Prisma.TableCreateWithoutBarInput[]
    | Prisma.TableUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.TableCreateOrConnectWithoutBarInput | Prisma.TableCreateOrConnectWithoutBarInput[];
  createMany?: Prisma.TableCreateManyBarInputEnvelope;
  connect?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
};

export type TableUncheckedCreateNestedManyWithoutBarInput = {
  create?:
    | Prisma.XOR<Prisma.TableCreateWithoutBarInput, Prisma.TableUncheckedCreateWithoutBarInput>
    | Prisma.TableCreateWithoutBarInput[]
    | Prisma.TableUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.TableCreateOrConnectWithoutBarInput | Prisma.TableCreateOrConnectWithoutBarInput[];
  createMany?: Prisma.TableCreateManyBarInputEnvelope;
  connect?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
};

export type TableUpdateManyWithoutBarNestedInput = {
  create?:
    | Prisma.XOR<Prisma.TableCreateWithoutBarInput, Prisma.TableUncheckedCreateWithoutBarInput>
    | Prisma.TableCreateWithoutBarInput[]
    | Prisma.TableUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.TableCreateOrConnectWithoutBarInput | Prisma.TableCreateOrConnectWithoutBarInput[];
  upsert?: Prisma.TableUpsertWithWhereUniqueWithoutBarInput | Prisma.TableUpsertWithWhereUniqueWithoutBarInput[];
  createMany?: Prisma.TableCreateManyBarInputEnvelope;
  set?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  disconnect?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  delete?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  connect?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  update?: Prisma.TableUpdateWithWhereUniqueWithoutBarInput | Prisma.TableUpdateWithWhereUniqueWithoutBarInput[];
  updateMany?: Prisma.TableUpdateManyWithWhereWithoutBarInput | Prisma.TableUpdateManyWithWhereWithoutBarInput[];
  deleteMany?: Prisma.TableScalarWhereInput | Prisma.TableScalarWhereInput[];
};

export type TableUncheckedUpdateManyWithoutBarNestedInput = {
  create?:
    | Prisma.XOR<Prisma.TableCreateWithoutBarInput, Prisma.TableUncheckedCreateWithoutBarInput>
    | Prisma.TableCreateWithoutBarInput[]
    | Prisma.TableUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.TableCreateOrConnectWithoutBarInput | Prisma.TableCreateOrConnectWithoutBarInput[];
  upsert?: Prisma.TableUpsertWithWhereUniqueWithoutBarInput | Prisma.TableUpsertWithWhereUniqueWithoutBarInput[];
  createMany?: Prisma.TableCreateManyBarInputEnvelope;
  set?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  disconnect?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  delete?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  connect?: Prisma.TableWhereUniqueInput | Prisma.TableWhereUniqueInput[];
  update?: Prisma.TableUpdateWithWhereUniqueWithoutBarInput | Prisma.TableUpdateWithWhereUniqueWithoutBarInput[];
  updateMany?: Prisma.TableUpdateManyWithWhereWithoutBarInput | Prisma.TableUpdateManyWithWhereWithoutBarInput[];
  deleteMany?: Prisma.TableScalarWhereInput | Prisma.TableScalarWhereInput[];
};

export type EnumTableStatusFieldUpdateOperationsInput = {
  set?: $Enums.TableStatus;
};

export type TableCreateNestedOneWithoutOrdersInput = {
  create?: Prisma.XOR<Prisma.TableCreateWithoutOrdersInput, Prisma.TableUncheckedCreateWithoutOrdersInput>;
  connectOrCreate?: Prisma.TableCreateOrConnectWithoutOrdersInput;
  connect?: Prisma.TableWhereUniqueInput;
};

export type TableUpdateOneWithoutOrdersNestedInput = {
  create?: Prisma.XOR<Prisma.TableCreateWithoutOrdersInput, Prisma.TableUncheckedCreateWithoutOrdersInput>;
  connectOrCreate?: Prisma.TableCreateOrConnectWithoutOrdersInput;
  upsert?: Prisma.TableUpsertWithoutOrdersInput;
  disconnect?: Prisma.TableWhereInput | boolean;
  delete?: Prisma.TableWhereInput | boolean;
  connect?: Prisma.TableWhereUniqueInput;
  update?: Prisma.XOR<
    Prisma.XOR<Prisma.TableUpdateToOneWithWhereWithoutOrdersInput, Prisma.TableUpdateWithoutOrdersInput>,
    Prisma.TableUncheckedUpdateWithoutOrdersInput
  >;
};

export type TableCreateWithoutBarInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  orders?: Prisma.OrderCreateNestedManyWithoutTableInput;
};

export type TableUncheckedCreateWithoutBarInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  orders?: Prisma.OrderUncheckedCreateNestedManyWithoutTableInput;
};

export type TableCreateOrConnectWithoutBarInput = {
  where: Prisma.TableWhereUniqueInput;
  create: Prisma.XOR<Prisma.TableCreateWithoutBarInput, Prisma.TableUncheckedCreateWithoutBarInput>;
};

export type TableCreateManyBarInputEnvelope = {
  data: Prisma.TableCreateManyBarInput | Prisma.TableCreateManyBarInput[];
  skipDuplicates?: boolean;
};

export type TableUpsertWithWhereUniqueWithoutBarInput = {
  where: Prisma.TableWhereUniqueInput;
  update: Prisma.XOR<Prisma.TableUpdateWithoutBarInput, Prisma.TableUncheckedUpdateWithoutBarInput>;
  create: Prisma.XOR<Prisma.TableCreateWithoutBarInput, Prisma.TableUncheckedCreateWithoutBarInput>;
};

export type TableUpdateWithWhereUniqueWithoutBarInput = {
  where: Prisma.TableWhereUniqueInput;
  data: Prisma.XOR<Prisma.TableUpdateWithoutBarInput, Prisma.TableUncheckedUpdateWithoutBarInput>;
};

export type TableUpdateManyWithWhereWithoutBarInput = {
  where: Prisma.TableScalarWhereInput;
  data: Prisma.XOR<Prisma.TableUpdateManyMutationInput, Prisma.TableUncheckedUpdateManyWithoutBarInput>;
};

export type TableScalarWhereInput = {
  AND?: Prisma.TableScalarWhereInput | Prisma.TableScalarWhereInput[];
  OR?: Prisma.TableScalarWhereInput[];
  NOT?: Prisma.TableScalarWhereInput | Prisma.TableScalarWhereInput[];
  id?: Prisma.StringFilter<'Table'> | string;
  name?: Prisma.StringFilter<'Table'> | string;
  status?: Prisma.EnumTableStatusFilter<'Table'> | $Enums.TableStatus;
  barId?: Prisma.StringFilter<'Table'> | string;
  createdAt?: Prisma.DateTimeFilter<'Table'> | Date | string;
  updatedAt?: Prisma.DateTimeFilter<'Table'> | Date | string;
};

export type TableCreateWithoutOrdersInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  bar: Prisma.BarCreateNestedOneWithoutTablesInput;
};

export type TableUncheckedCreateWithoutOrdersInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  barId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type TableCreateOrConnectWithoutOrdersInput = {
  where: Prisma.TableWhereUniqueInput;
  create: Prisma.XOR<Prisma.TableCreateWithoutOrdersInput, Prisma.TableUncheckedCreateWithoutOrdersInput>;
};

export type TableUpsertWithoutOrdersInput = {
  update: Prisma.XOR<Prisma.TableUpdateWithoutOrdersInput, Prisma.TableUncheckedUpdateWithoutOrdersInput>;
  create: Prisma.XOR<Prisma.TableCreateWithoutOrdersInput, Prisma.TableUncheckedCreateWithoutOrdersInput>;
  where?: Prisma.TableWhereInput;
};

export type TableUpdateToOneWithWhereWithoutOrdersInput = {
  where?: Prisma.TableWhereInput;
  data: Prisma.XOR<Prisma.TableUpdateWithoutOrdersInput, Prisma.TableUncheckedUpdateWithoutOrdersInput>;
};

export type TableUpdateWithoutOrdersInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  bar?: Prisma.BarUpdateOneRequiredWithoutTablesNestedInput;
};

export type TableUncheckedUpdateWithoutOrdersInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  barId?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type TableCreateManyBarInput = {
  id?: string;
  name: string;
  status?: $Enums.TableStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type TableUpdateWithoutBarInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  orders?: Prisma.OrderUpdateManyWithoutTableNestedInput;
};

export type TableUncheckedUpdateWithoutBarInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  orders?: Prisma.OrderUncheckedUpdateManyWithoutTableNestedInput;
};

export type TableUncheckedUpdateManyWithoutBarInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.EnumTableStatusFieldUpdateOperationsInput | $Enums.TableStatus;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

/**
 * Count Type TableCountOutputType
 */

export type TableCountOutputType = {
  orders: number;
};

export type TableCountOutputTypeSelect<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  orders?: boolean | TableCountOutputTypeCountOrdersArgs;
};

/**
 * TableCountOutputType without action
 */
export type TableCountOutputTypeDefaultArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the TableCountOutputType
   */
  select?: Prisma.TableCountOutputTypeSelect<ExtArgs> | null;
};

/**
 * TableCountOutputType without action
 */
export type TableCountOutputTypeCountOrdersArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  where?: Prisma.OrderWhereInput;
};

export type TableSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
  runtime.Types.Extensions.GetSelect<
    {
      id?: boolean;
      name?: boolean;
      status?: boolean;
      barId?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
      orders?: boolean | Prisma.Table$ordersArgs<ExtArgs>;
      _count?: boolean | Prisma.TableCountOutputTypeDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['table']
  >;

export type TableSelectCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    name?: boolean;
    status?: boolean;
    barId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
  },
  ExtArgs['result']['table']
>;

export type TableSelectUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    name?: boolean;
    status?: boolean;
    barId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
  },
  ExtArgs['result']['table']
>;

export type TableSelectScalar = {
  id?: boolean;
  name?: boolean;
  status?: boolean;
  barId?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
};

export type TableOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
  runtime.Types.Extensions.GetOmit<
    'id' | 'name' | 'status' | 'barId' | 'createdAt' | 'updatedAt',
    ExtArgs['result']['table']
  >;
export type TableInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
  {
    bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
    orders?: boolean | Prisma.Table$ordersArgs<ExtArgs>;
    _count?: boolean | Prisma.TableCountOutputTypeDefaultArgs<ExtArgs>;
  };
export type TableIncludeCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
};
export type TableIncludeUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
};

export type $TablePayload<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  name: 'Table';
  objects: {
    bar: Prisma.$BarPayload<ExtArgs>;
    orders: Prisma.$OrderPayload<ExtArgs>[];
  };
  scalars: runtime.Types.Extensions.GetPayloadResult<
    {
      id: string;
      name: string;
      status: $Enums.TableStatus;
      barId: string;
      createdAt: Date;
      updatedAt: Date;
    },
    ExtArgs['result']['table']
  >;
  composites: {};
};

export type TableGetPayload<S extends boolean | null | undefined | TableDefaultArgs> = runtime.Types.Result.GetResult<
  Prisma.$TablePayload,
  S
>;

export type TableCountArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = Omit<TableFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
  select?: TableCountAggregateInputType | true;
};

export interface TableDelegate<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Table']; meta: { name: 'Table' } };
  /**
   * Find zero or one Table that matches the filter.
   * @param {TableFindUniqueArgs} args - Arguments to find a Table
   * @example
   * // Get one Table
   * const table = await prisma.table.findUnique({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUnique<T extends TableFindUniqueArgs>(
    args: Prisma.SelectSubset<T, TableFindUniqueArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'findUnique', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find one Table that matches the filter or throw an error with `error.code='P2025'`
   * if no matches were found.
   * @param {TableFindUniqueOrThrowArgs} args - Arguments to find a Table
   * @example
   * // Get one Table
   * const table = await prisma.table.findUniqueOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUniqueOrThrow<T extends TableFindUniqueOrThrowArgs>(
    args: Prisma.SelectSubset<T, TableFindUniqueOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first Table that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {TableFindFirstArgs} args - Arguments to find a Table
   * @example
   * // Get one Table
   * const table = await prisma.table.findFirst({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirst<T extends TableFindFirstArgs>(
    args?: Prisma.SelectSubset<T, TableFindFirstArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'findFirst', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first Table that matches the filter or
   * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {TableFindFirstOrThrowArgs} args - Arguments to find a Table
   * @example
   * // Get one Table
   * const table = await prisma.table.findFirstOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirstOrThrow<T extends TableFindFirstOrThrowArgs>(
    args?: Prisma.SelectSubset<T, TableFindFirstOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'findFirstOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find zero or more Tables that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {TableFindManyArgs} args - Arguments to filter and select certain fields only.
   * @example
   * // Get all Tables
   * const tables = await prisma.table.findMany()
   *
   * // Get first 10 Tables
   * const tables = await prisma.table.findMany({ take: 10 })
   *
   * // Only select the `id`
   * const tableWithIdOnly = await prisma.table.findMany({ select: { id: true } })
   *
   */
  findMany<T extends TableFindManyArgs>(
    args?: Prisma.SelectSubset<T, TableFindManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'findMany', GlobalOmitOptions>
  >;

  /**
   * Create a Table.
   * @param {TableCreateArgs} args - Arguments to create a Table.
   * @example
   * // Create one Table
   * const Table = await prisma.table.create({
   *   data: {
   *     // ... data to create a Table
   *   }
   * })
   *
   */
  create<T extends TableCreateArgs>(
    args: Prisma.SelectSubset<T, TableCreateArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'create', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Create many Tables.
   * @param {TableCreateManyArgs} args - Arguments to create many Tables.
   * @example
   * // Create many Tables
   * const table = await prisma.table.createMany({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   */
  createMany<T extends TableCreateManyArgs>(
    args?: Prisma.SelectSubset<T, TableCreateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Create many Tables and returns the data saved in the database.
   * @param {TableCreateManyAndReturnArgs} args - Arguments to create many Tables.
   * @example
   * // Create many Tables
   * const table = await prisma.table.createManyAndReturn({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Create many Tables and only return the `id`
   * const tableWithIdOnly = await prisma.table.createManyAndReturn({
   *   select: { id: true },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   *
   */
  createManyAndReturn<T extends TableCreateManyAndReturnArgs>(
    args?: Prisma.SelectSubset<T, TableCreateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'createManyAndReturn', GlobalOmitOptions>
  >;

  /**
   * Delete a Table.
   * @param {TableDeleteArgs} args - Arguments to delete one Table.
   * @example
   * // Delete one Table
   * const Table = await prisma.table.delete({
   *   where: {
   *     // ... filter to delete one Table
   *   }
   * })
   *
   */
  delete<T extends TableDeleteArgs>(
    args: Prisma.SelectSubset<T, TableDeleteArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'delete', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Update one Table.
   * @param {TableUpdateArgs} args - Arguments to update one Table.
   * @example
   * // Update one Table
   * const table = await prisma.table.update({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  update<T extends TableUpdateArgs>(
    args: Prisma.SelectSubset<T, TableUpdateArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'update', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Delete zero or more Tables.
   * @param {TableDeleteManyArgs} args - Arguments to filter Tables to delete.
   * @example
   * // Delete a few Tables
   * const { count } = await prisma.table.deleteMany({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   *
   */
  deleteMany<T extends TableDeleteManyArgs>(
    args?: Prisma.SelectSubset<T, TableDeleteManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more Tables.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {TableUpdateManyArgs} args - Arguments to update one or more rows.
   * @example
   * // Update many Tables
   * const table = await prisma.table.updateMany({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  updateMany<T extends TableUpdateManyArgs>(
    args: Prisma.SelectSubset<T, TableUpdateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more Tables and returns the data updated in the database.
   * @param {TableUpdateManyAndReturnArgs} args - Arguments to update many Tables.
   * @example
   * // Update many Tables
   * const table = await prisma.table.updateManyAndReturn({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Update zero or more Tables and only return the `id`
   * const tableWithIdOnly = await prisma.table.updateManyAndReturn({
   *   select: { id: true },
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   *
   */
  updateManyAndReturn<T extends TableUpdateManyAndReturnArgs>(
    args: Prisma.SelectSubset<T, TableUpdateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'updateManyAndReturn', GlobalOmitOptions>
  >;

  /**
   * Create or update one Table.
   * @param {TableUpsertArgs} args - Arguments to update or create a Table.
   * @example
   * // Update or create a Table
   * const table = await prisma.table.upsert({
   *   create: {
   *     // ... data to create a Table
   *   },
   *   update: {
   *     // ... in case it already exists, update
   *   },
   *   where: {
   *     // ... the filter for the Table we want to update
   *   }
   * })
   */
  upsert<T extends TableUpsertArgs>(
    args: Prisma.SelectSubset<T, TableUpsertArgs<ExtArgs>>,
  ): Prisma.Prisma__TableClient<
    runtime.Types.Result.GetResult<Prisma.$TablePayload<ExtArgs>, T, 'upsert', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Count the number of Tables.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {TableCountArgs} args - Arguments to filter Tables to count.
   * @example
   * // Count the number of Tables
   * const count = await prisma.table.count({
   *   where: {
   *     // ... the filter for the Tables we want to count
   *   }
   * })
   **/
  count<T extends TableCountArgs>(
    args?: Prisma.Subset<T, TableCountArgs>,
  ): Prisma.PrismaPromise<
    T extends runtime.Types.Utils.Record<'select', any>
      ? T['select'] extends true
        ? number
        : Prisma.GetScalarType<T['select'], TableCountAggregateOutputType>
      : number
  >;

  /**
   * Allows you to perform aggregations operations on a Table.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {TableAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
   * @example
   * // Ordered by age ascending
   * // Where email contains prisma.io
   * // Limited to the 10 users
   * const aggregations = await prisma.user.aggregate({
   *   _avg: {
   *     age: true,
   *   },
   *   where: {
   *     email: {
   *       contains: "prisma.io",
   *     },
   *   },
   *   orderBy: {
   *     age: "asc",
   *   },
   *   take: 10,
   * })
   **/
  aggregate<T extends TableAggregateArgs>(
    args: Prisma.Subset<T, TableAggregateArgs>,
  ): Prisma.PrismaPromise<GetTableAggregateType<T>>;

  /**
   * Group by Table.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {TableGroupByArgs} args - Group by arguments.
   * @example
   * // Group by city, order by createdAt, get count
   * const result = await prisma.user.groupBy({
   *   by: ['city', 'createdAt'],
   *   orderBy: {
   *     createdAt: true
   *   },
   *   _count: {
   *     _all: true
   *   },
   * })
   *
   **/
  groupBy<
    T extends TableGroupByArgs,
    HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>,
    OrderByArg extends Prisma.True extends HasSelectOrTake
      ? { orderBy: TableGroupByArgs['orderBy'] }
      : { orderBy?: TableGroupByArgs['orderBy'] },
    OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>,
    ByFields extends Prisma.MaybeTupleToUnion<T['by']>,
    ByValid extends Prisma.Has<ByFields, OrderFields>,
    HavingFields extends Prisma.GetHavingFields<T['having']>,
    HavingValid extends Prisma.Has<ByFields, HavingFields>,
    ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False,
    InputErrors extends ByEmpty extends Prisma.True
      ? `Error: "by" must not be empty.`
      : HavingValid extends Prisma.False
        ? {
            [P in HavingFields]: P extends ByFields
              ? never
              : P extends string
                ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
          }[HavingFields]
        : 'take' extends Prisma.Keys<T>
          ? 'orderBy' extends Prisma.Keys<T>
            ? ByValid extends Prisma.True
              ? {}
              : {
                  [P in OrderFields]: P extends ByFields
                    ? never
                    : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                }[OrderFields]
            : 'Error: If you provide "take", you also need to provide "orderBy"'
          : 'skip' extends Prisma.Keys<T>
            ? 'orderBy' extends Prisma.Keys<T>
              ? ByValid extends Prisma.True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "skip", you also need to provide "orderBy"'
            : ByValid extends Prisma.True
              ? {}
              : {
                  [P in OrderFields]: P extends ByFields
                    ? never
                    : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                }[OrderFields],
  >(
    args: Prisma.SubsetIntersection<T, TableGroupByArgs, OrderByArg> & InputErrors,
  ): {} extends InputErrors ? GetTableGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
  /**
   * Fields of the Table model
   */
  readonly fields: TableFieldRefs;
}

/**
 * The delegate class that acts as a "Promise-like" for Table.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__TableClient<
  T,
  Null = never,
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> extends Prisma.PrismaPromise<T> {
  readonly [Symbol.toStringTag]: 'PrismaPromise';
  bar<T extends Prisma.BarDefaultArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.BarDefaultArgs<ExtArgs>>,
  ): Prisma.Prisma__BarClient<
    runtime.Types.Result.GetResult<Prisma.$BarPayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions> | Null,
    Null,
    ExtArgs,
    GlobalOmitOptions
  >;
  orders<T extends Prisma.Table$ordersArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.Table$ordersArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, 'findMany', GlobalOmitOptions> | Null
  >;
  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * @param onfulfilled The callback to execute when the Promise is resolved.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of which ever callback is executed.
   */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): runtime.Types.Utils.JsPromise<T | TResult>;
  /**
   * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
   * resolved value cannot be modified from the callback.
   * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
   * @returns A Promise for the completion of the callback.
   */
  finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}

/**
 * Fields of the Table model
 */
export interface TableFieldRefs {
  readonly id: Prisma.FieldRef<'Table', 'String'>;
  readonly name: Prisma.FieldRef<'Table', 'String'>;
  readonly status: Prisma.FieldRef<'Table', 'TableStatus'>;
  readonly barId: Prisma.FieldRef<'Table', 'String'>;
  readonly createdAt: Prisma.FieldRef<'Table', 'DateTime'>;
  readonly updatedAt: Prisma.FieldRef<'Table', 'DateTime'>;
}

// Custom InputTypes
/**
 * Table findUnique
 */
export type TableFindUniqueArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * Filter, which Table to fetch.
   */
  where: Prisma.TableWhereUniqueInput;
};

/**
 * Table findUniqueOrThrow
 */
export type TableFindUniqueOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * Filter, which Table to fetch.
   */
  where: Prisma.TableWhereUniqueInput;
};

/**
 * Table findFirst
 */
export type TableFindFirstArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * Filter, which Table to fetch.
   */
  where?: Prisma.TableWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of Tables to fetch.
   */
  orderBy?: Prisma.TableOrderByWithRelationInput | Prisma.TableOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for Tables.
   */
  cursor?: Prisma.TableWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` Tables from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` Tables.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of Tables.
   */
  distinct?: Prisma.TableScalarFieldEnum | Prisma.TableScalarFieldEnum[];
};

/**
 * Table findFirstOrThrow
 */
export type TableFindFirstOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * Filter, which Table to fetch.
   */
  where?: Prisma.TableWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of Tables to fetch.
   */
  orderBy?: Prisma.TableOrderByWithRelationInput | Prisma.TableOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for Tables.
   */
  cursor?: Prisma.TableWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` Tables from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` Tables.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of Tables.
   */
  distinct?: Prisma.TableScalarFieldEnum | Prisma.TableScalarFieldEnum[];
};

/**
 * Table findMany
 */
export type TableFindManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * Filter, which Tables to fetch.
   */
  where?: Prisma.TableWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of Tables to fetch.
   */
  orderBy?: Prisma.TableOrderByWithRelationInput | Prisma.TableOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for listing Tables.
   */
  cursor?: Prisma.TableWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` Tables from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` Tables.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of Tables.
   */
  distinct?: Prisma.TableScalarFieldEnum | Prisma.TableScalarFieldEnum[];
};

/**
 * Table create
 */
export type TableCreateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * The data needed to create a Table.
   */
  data: Prisma.XOR<Prisma.TableCreateInput, Prisma.TableUncheckedCreateInput>;
};

/**
 * Table createMany
 */
export type TableCreateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to create many Tables.
   */
  data: Prisma.TableCreateManyInput | Prisma.TableCreateManyInput[];
  skipDuplicates?: boolean;
};

/**
 * Table createManyAndReturn
 */
export type TableCreateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelectCreateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * The data used to create many Tables.
   */
  data: Prisma.TableCreateManyInput | Prisma.TableCreateManyInput[];
  skipDuplicates?: boolean;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableIncludeCreateManyAndReturn<ExtArgs> | null;
};

/**
 * Table update
 */
export type TableUpdateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * The data needed to update a Table.
   */
  data: Prisma.XOR<Prisma.TableUpdateInput, Prisma.TableUncheckedUpdateInput>;
  /**
   * Choose, which Table to update.
   */
  where: Prisma.TableWhereUniqueInput;
};

/**
 * Table updateMany
 */
export type TableUpdateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to update Tables.
   */
  data: Prisma.XOR<Prisma.TableUpdateManyMutationInput, Prisma.TableUncheckedUpdateManyInput>;
  /**
   * Filter which Tables to update
   */
  where?: Prisma.TableWhereInput;
  /**
   * Limit how many Tables to update.
   */
  limit?: number;
};

/**
 * Table updateManyAndReturn
 */
export type TableUpdateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelectUpdateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * The data used to update Tables.
   */
  data: Prisma.XOR<Prisma.TableUpdateManyMutationInput, Prisma.TableUncheckedUpdateManyInput>;
  /**
   * Filter which Tables to update
   */
  where?: Prisma.TableWhereInput;
  /**
   * Limit how many Tables to update.
   */
  limit?: number;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableIncludeUpdateManyAndReturn<ExtArgs> | null;
};

/**
 * Table upsert
 */
export type TableUpsertArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * The filter to search for the Table to update in case it exists.
   */
  where: Prisma.TableWhereUniqueInput;
  /**
   * In case the Table found by the `where` argument doesn't exist, create a new Table with this data.
   */
  create: Prisma.XOR<Prisma.TableCreateInput, Prisma.TableUncheckedCreateInput>;
  /**
   * In case the Table was found with the provided `where` argument, update it with this data.
   */
  update: Prisma.XOR<Prisma.TableUpdateInput, Prisma.TableUncheckedUpdateInput>;
};

/**
 * Table delete
 */
export type TableDeleteArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
  /**
   * Filter which Table to delete.
   */
  where: Prisma.TableWhereUniqueInput;
};

/**
 * Table deleteMany
 */
export type TableDeleteManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which Tables to delete
   */
  where?: Prisma.TableWhereInput;
  /**
   * Limit how many Tables to delete.
   */
  limit?: number;
};

/**
 * Table.orders
 */
export type Table$ordersArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Order
   */
  select?: Prisma.OrderSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Order
   */
  omit?: Prisma.OrderOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.OrderInclude<ExtArgs> | null;
  where?: Prisma.OrderWhereInput;
  orderBy?: Prisma.OrderOrderByWithRelationInput | Prisma.OrderOrderByWithRelationInput[];
  cursor?: Prisma.OrderWhereUniqueInput;
  take?: number;
  skip?: number;
  distinct?: Prisma.OrderScalarFieldEnum | Prisma.OrderScalarFieldEnum[];
};

/**
 * Table without action
 */
export type TableDefaultArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the Table
   */
  select?: Prisma.TableSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the Table
   */
  omit?: Prisma.TableOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.TableInclude<ExtArgs> | null;
};
