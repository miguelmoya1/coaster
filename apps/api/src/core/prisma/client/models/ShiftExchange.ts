import type * as runtime from '@prisma/client/runtime/client';

import type * as $Enums from '../enums.js';
import type * as Prisma from '../internal/prismaNamespace.js';

/**
 * Model ShiftExchange
 *
 */
export type ShiftExchangeModel = runtime.Types.Result.DefaultSelection<Prisma.$ShiftExchangePayload>;

export type AggregateShiftExchange = {
  _count: ShiftExchangeCountAggregateOutputType | null;
  _min: ShiftExchangeMinAggregateOutputType | null;
  _max: ShiftExchangeMaxAggregateOutputType | null;
};

export type ShiftExchangeMinAggregateOutputType = {
  id: string | null;
  shiftId: string | null;
  requesterId: string | null;
  targetId: string | null;
  status: string | null;
  createdAt: Date | null;
};

export type ShiftExchangeMaxAggregateOutputType = {
  id: string | null;
  shiftId: string | null;
  requesterId: string | null;
  targetId: string | null;
  status: string | null;
  createdAt: Date | null;
};

export type ShiftExchangeCountAggregateOutputType = {
  id: number;
  shiftId: number;
  requesterId: number;
  targetId: number;
  status: number;
  createdAt: number;
  _all: number;
};

export type ShiftExchangeMinAggregateInputType = {
  id?: true;
  shiftId?: true;
  requesterId?: true;
  targetId?: true;
  status?: true;
  createdAt?: true;
};

export type ShiftExchangeMaxAggregateInputType = {
  id?: true;
  shiftId?: true;
  requesterId?: true;
  targetId?: true;
  status?: true;
  createdAt?: true;
};

export type ShiftExchangeCountAggregateInputType = {
  id?: true;
  shiftId?: true;
  requesterId?: true;
  targetId?: true;
  status?: true;
  createdAt?: true;
  _all?: true;
};

export type ShiftExchangeAggregateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which ShiftExchange to aggregate.
   */
  where?: Prisma.ShiftExchangeWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of ShiftExchanges to fetch.
   */
  orderBy?: Prisma.ShiftExchangeOrderByWithRelationInput | Prisma.ShiftExchangeOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the start position
   */
  cursor?: Prisma.ShiftExchangeWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` ShiftExchanges from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` ShiftExchanges.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Count returned ShiftExchanges
   **/
  _count?: true | ShiftExchangeCountAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the minimum value
   **/
  _min?: ShiftExchangeMinAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the maximum value
   **/
  _max?: ShiftExchangeMaxAggregateInputType;
};

export type GetShiftExchangeAggregateType<T extends ShiftExchangeAggregateArgs> = {
  [P in keyof T & keyof AggregateShiftExchange]: P extends '_count' | 'count'
    ? T[P] extends true
      ? number
      : Prisma.GetScalarType<T[P], AggregateShiftExchange[P]>
    : Prisma.GetScalarType<T[P], AggregateShiftExchange[P]>;
};

export type ShiftExchangeGroupByArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  where?: Prisma.ShiftExchangeWhereInput;
  orderBy?: Prisma.ShiftExchangeOrderByWithAggregationInput | Prisma.ShiftExchangeOrderByWithAggregationInput[];
  by: Prisma.ShiftExchangeScalarFieldEnum[] | Prisma.ShiftExchangeScalarFieldEnum;
  having?: Prisma.ShiftExchangeScalarWhereWithAggregatesInput;
  take?: number;
  skip?: number;
  _count?: ShiftExchangeCountAggregateInputType | true;
  _min?: ShiftExchangeMinAggregateInputType;
  _max?: ShiftExchangeMaxAggregateInputType;
};

export type ShiftExchangeGroupByOutputType = {
  id: string;
  shiftId: string;
  requesterId: string;
  targetId: string | null;
  status: string;
  createdAt: Date;
  _count: ShiftExchangeCountAggregateOutputType | null;
  _min: ShiftExchangeMinAggregateOutputType | null;
  _max: ShiftExchangeMaxAggregateOutputType | null;
};

export type GetShiftExchangeGroupByPayload<T extends ShiftExchangeGroupByArgs> = Prisma.PrismaPromise<
  Array<
    Prisma.PickEnumerable<ShiftExchangeGroupByOutputType, T['by']> & {
      [P in keyof T & keyof ShiftExchangeGroupByOutputType]: P extends '_count'
        ? T[P] extends boolean
          ? number
          : Prisma.GetScalarType<T[P], ShiftExchangeGroupByOutputType[P]>
        : Prisma.GetScalarType<T[P], ShiftExchangeGroupByOutputType[P]>;
    }
  >
>;

export type ShiftExchangeWhereInput = {
  AND?: Prisma.ShiftExchangeWhereInput | Prisma.ShiftExchangeWhereInput[];
  OR?: Prisma.ShiftExchangeWhereInput[];
  NOT?: Prisma.ShiftExchangeWhereInput | Prisma.ShiftExchangeWhereInput[];
  id?: Prisma.StringFilter<'ShiftExchange'> | string;
  shiftId?: Prisma.StringFilter<'ShiftExchange'> | string;
  requesterId?: Prisma.StringFilter<'ShiftExchange'> | string;
  targetId?: Prisma.StringNullableFilter<'ShiftExchange'> | string | null;
  status?: Prisma.StringFilter<'ShiftExchange'> | string;
  createdAt?: Prisma.DateTimeFilter<'ShiftExchange'> | Date | string;
  shift?: Prisma.XOR<Prisma.ShiftScalarRelationFilter, Prisma.ShiftWhereInput>;
  requester?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
  target?: Prisma.XOR<Prisma.UserNullableScalarRelationFilter, Prisma.UserWhereInput> | null;
};

export type ShiftExchangeOrderByWithRelationInput = {
  id?: Prisma.SortOrder;
  shiftId?: Prisma.SortOrder;
  requesterId?: Prisma.SortOrder;
  targetId?: Prisma.SortOrderInput | Prisma.SortOrder;
  status?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  shift?: Prisma.ShiftOrderByWithRelationInput;
  requester?: Prisma.UserOrderByWithRelationInput;
  target?: Prisma.UserOrderByWithRelationInput;
};

export type ShiftExchangeWhereUniqueInput = Prisma.AtLeast<
  {
    id?: string;
    shiftId?: string;
    AND?: Prisma.ShiftExchangeWhereInput | Prisma.ShiftExchangeWhereInput[];
    OR?: Prisma.ShiftExchangeWhereInput[];
    NOT?: Prisma.ShiftExchangeWhereInput | Prisma.ShiftExchangeWhereInput[];
    requesterId?: Prisma.StringFilter<'ShiftExchange'> | string;
    targetId?: Prisma.StringNullableFilter<'ShiftExchange'> | string | null;
    status?: Prisma.StringFilter<'ShiftExchange'> | string;
    createdAt?: Prisma.DateTimeFilter<'ShiftExchange'> | Date | string;
    shift?: Prisma.XOR<Prisma.ShiftScalarRelationFilter, Prisma.ShiftWhereInput>;
    requester?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    target?: Prisma.XOR<Prisma.UserNullableScalarRelationFilter, Prisma.UserWhereInput> | null;
  },
  'id' | 'shiftId'
>;

export type ShiftExchangeOrderByWithAggregationInput = {
  id?: Prisma.SortOrder;
  shiftId?: Prisma.SortOrder;
  requesterId?: Prisma.SortOrder;
  targetId?: Prisma.SortOrderInput | Prisma.SortOrder;
  status?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  _count?: Prisma.ShiftExchangeCountOrderByAggregateInput;
  _max?: Prisma.ShiftExchangeMaxOrderByAggregateInput;
  _min?: Prisma.ShiftExchangeMinOrderByAggregateInput;
};

export type ShiftExchangeScalarWhereWithAggregatesInput = {
  AND?: Prisma.ShiftExchangeScalarWhereWithAggregatesInput | Prisma.ShiftExchangeScalarWhereWithAggregatesInput[];
  OR?: Prisma.ShiftExchangeScalarWhereWithAggregatesInput[];
  NOT?: Prisma.ShiftExchangeScalarWhereWithAggregatesInput | Prisma.ShiftExchangeScalarWhereWithAggregatesInput[];
  id?: Prisma.StringWithAggregatesFilter<'ShiftExchange'> | string;
  shiftId?: Prisma.StringWithAggregatesFilter<'ShiftExchange'> | string;
  requesterId?: Prisma.StringWithAggregatesFilter<'ShiftExchange'> | string;
  targetId?: Prisma.StringNullableWithAggregatesFilter<'ShiftExchange'> | string | null;
  status?: Prisma.StringWithAggregatesFilter<'ShiftExchange'> | string;
  createdAt?: Prisma.DateTimeWithAggregatesFilter<'ShiftExchange'> | Date | string;
};

export type ShiftExchangeCreateInput = {
  id?: string;
  status?: string;
  createdAt?: Date | string;
  shift: Prisma.ShiftCreateNestedOneWithoutExchangeInput;
  requester: Prisma.UserCreateNestedOneWithoutShiftRequestsInput;
  target?: Prisma.UserCreateNestedOneWithoutShiftApprovalsInput;
};

export type ShiftExchangeUncheckedCreateInput = {
  id?: string;
  shiftId: string;
  requesterId: string;
  targetId?: string | null;
  status?: string;
  createdAt?: Date | string;
};

export type ShiftExchangeUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  shift?: Prisma.ShiftUpdateOneRequiredWithoutExchangeNestedInput;
  requester?: Prisma.UserUpdateOneRequiredWithoutShiftRequestsNestedInput;
  target?: Prisma.UserUpdateOneWithoutShiftApprovalsNestedInput;
};

export type ShiftExchangeUncheckedUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  shiftId?: Prisma.StringFieldUpdateOperationsInput | string;
  requesterId?: Prisma.StringFieldUpdateOperationsInput | string;
  targetId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeCreateManyInput = {
  id?: string;
  shiftId: string;
  requesterId: string;
  targetId?: string | null;
  status?: string;
  createdAt?: Date | string;
};

export type ShiftExchangeUpdateManyMutationInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeUncheckedUpdateManyInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  shiftId?: Prisma.StringFieldUpdateOperationsInput | string;
  requesterId?: Prisma.StringFieldUpdateOperationsInput | string;
  targetId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeListRelationFilter = {
  every?: Prisma.ShiftExchangeWhereInput;
  some?: Prisma.ShiftExchangeWhereInput;
  none?: Prisma.ShiftExchangeWhereInput;
};

export type ShiftExchangeOrderByRelationAggregateInput = {
  _count?: Prisma.SortOrder;
};

export type ShiftExchangeNullableScalarRelationFilter = {
  is?: Prisma.ShiftExchangeWhereInput | null;
  isNot?: Prisma.ShiftExchangeWhereInput | null;
};

export type ShiftExchangeCountOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  shiftId?: Prisma.SortOrder;
  requesterId?: Prisma.SortOrder;
  targetId?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
};

export type ShiftExchangeMaxOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  shiftId?: Prisma.SortOrder;
  requesterId?: Prisma.SortOrder;
  targetId?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
};

export type ShiftExchangeMinOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  shiftId?: Prisma.SortOrder;
  requesterId?: Prisma.SortOrder;
  targetId?: Prisma.SortOrder;
  status?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
};

export type ShiftExchangeCreateNestedManyWithoutRequesterInput = {
  create?:
    | Prisma.XOR<
        Prisma.ShiftExchangeCreateWithoutRequesterInput,
        Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput
      >
    | Prisma.ShiftExchangeCreateWithoutRequesterInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput[];
  createMany?: Prisma.ShiftExchangeCreateManyRequesterInputEnvelope;
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
};

export type ShiftExchangeCreateNestedManyWithoutTargetInput = {
  create?:
    | Prisma.XOR<Prisma.ShiftExchangeCreateWithoutTargetInput, Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput>
    | Prisma.ShiftExchangeCreateWithoutTargetInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput[];
  createMany?: Prisma.ShiftExchangeCreateManyTargetInputEnvelope;
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
};

export type ShiftExchangeUncheckedCreateNestedManyWithoutRequesterInput = {
  create?:
    | Prisma.XOR<
        Prisma.ShiftExchangeCreateWithoutRequesterInput,
        Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput
      >
    | Prisma.ShiftExchangeCreateWithoutRequesterInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput[];
  createMany?: Prisma.ShiftExchangeCreateManyRequesterInputEnvelope;
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
};

export type ShiftExchangeUncheckedCreateNestedManyWithoutTargetInput = {
  create?:
    | Prisma.XOR<Prisma.ShiftExchangeCreateWithoutTargetInput, Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput>
    | Prisma.ShiftExchangeCreateWithoutTargetInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput[];
  createMany?: Prisma.ShiftExchangeCreateManyTargetInputEnvelope;
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
};

export type ShiftExchangeUpdateManyWithoutRequesterNestedInput = {
  create?:
    | Prisma.XOR<
        Prisma.ShiftExchangeCreateWithoutRequesterInput,
        Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput
      >
    | Prisma.ShiftExchangeCreateWithoutRequesterInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput[];
  upsert?:
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutRequesterInput
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutRequesterInput[];
  createMany?: Prisma.ShiftExchangeCreateManyRequesterInputEnvelope;
  set?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  disconnect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  delete?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  update?:
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutRequesterInput
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutRequesterInput[];
  updateMany?:
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutRequesterInput
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutRequesterInput[];
  deleteMany?: Prisma.ShiftExchangeScalarWhereInput | Prisma.ShiftExchangeScalarWhereInput[];
};

export type ShiftExchangeUpdateManyWithoutTargetNestedInput = {
  create?:
    | Prisma.XOR<Prisma.ShiftExchangeCreateWithoutTargetInput, Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput>
    | Prisma.ShiftExchangeCreateWithoutTargetInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput[];
  upsert?:
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutTargetInput
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutTargetInput[];
  createMany?: Prisma.ShiftExchangeCreateManyTargetInputEnvelope;
  set?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  disconnect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  delete?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  update?:
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutTargetInput
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutTargetInput[];
  updateMany?:
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutTargetInput
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutTargetInput[];
  deleteMany?: Prisma.ShiftExchangeScalarWhereInput | Prisma.ShiftExchangeScalarWhereInput[];
};

export type ShiftExchangeUncheckedUpdateManyWithoutRequesterNestedInput = {
  create?:
    | Prisma.XOR<
        Prisma.ShiftExchangeCreateWithoutRequesterInput,
        Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput
      >
    | Prisma.ShiftExchangeCreateWithoutRequesterInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutRequesterInput[];
  upsert?:
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutRequesterInput
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutRequesterInput[];
  createMany?: Prisma.ShiftExchangeCreateManyRequesterInputEnvelope;
  set?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  disconnect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  delete?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  update?:
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutRequesterInput
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutRequesterInput[];
  updateMany?:
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutRequesterInput
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutRequesterInput[];
  deleteMany?: Prisma.ShiftExchangeScalarWhereInput | Prisma.ShiftExchangeScalarWhereInput[];
};

export type ShiftExchangeUncheckedUpdateManyWithoutTargetNestedInput = {
  create?:
    | Prisma.XOR<Prisma.ShiftExchangeCreateWithoutTargetInput, Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput>
    | Prisma.ShiftExchangeCreateWithoutTargetInput[]
    | Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput[];
  connectOrCreate?:
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput
    | Prisma.ShiftExchangeCreateOrConnectWithoutTargetInput[];
  upsert?:
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutTargetInput
    | Prisma.ShiftExchangeUpsertWithWhereUniqueWithoutTargetInput[];
  createMany?: Prisma.ShiftExchangeCreateManyTargetInputEnvelope;
  set?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  disconnect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  delete?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  connect?: Prisma.ShiftExchangeWhereUniqueInput | Prisma.ShiftExchangeWhereUniqueInput[];
  update?:
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutTargetInput
    | Prisma.ShiftExchangeUpdateWithWhereUniqueWithoutTargetInput[];
  updateMany?:
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutTargetInput
    | Prisma.ShiftExchangeUpdateManyWithWhereWithoutTargetInput[];
  deleteMany?: Prisma.ShiftExchangeScalarWhereInput | Prisma.ShiftExchangeScalarWhereInput[];
};

export type ShiftExchangeCreateNestedOneWithoutShiftInput = {
  create?: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutShiftInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutShiftInput
  >;
  connectOrCreate?: Prisma.ShiftExchangeCreateOrConnectWithoutShiftInput;
  connect?: Prisma.ShiftExchangeWhereUniqueInput;
};

export type ShiftExchangeUncheckedCreateNestedOneWithoutShiftInput = {
  create?: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutShiftInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutShiftInput
  >;
  connectOrCreate?: Prisma.ShiftExchangeCreateOrConnectWithoutShiftInput;
  connect?: Prisma.ShiftExchangeWhereUniqueInput;
};

export type ShiftExchangeUpdateOneWithoutShiftNestedInput = {
  create?: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutShiftInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutShiftInput
  >;
  connectOrCreate?: Prisma.ShiftExchangeCreateOrConnectWithoutShiftInput;
  upsert?: Prisma.ShiftExchangeUpsertWithoutShiftInput;
  disconnect?: Prisma.ShiftExchangeWhereInput | boolean;
  delete?: Prisma.ShiftExchangeWhereInput | boolean;
  connect?: Prisma.ShiftExchangeWhereUniqueInput;
  update?: Prisma.XOR<
    Prisma.XOR<Prisma.ShiftExchangeUpdateToOneWithWhereWithoutShiftInput, Prisma.ShiftExchangeUpdateWithoutShiftInput>,
    Prisma.ShiftExchangeUncheckedUpdateWithoutShiftInput
  >;
};

export type ShiftExchangeUncheckedUpdateOneWithoutShiftNestedInput = {
  create?: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutShiftInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutShiftInput
  >;
  connectOrCreate?: Prisma.ShiftExchangeCreateOrConnectWithoutShiftInput;
  upsert?: Prisma.ShiftExchangeUpsertWithoutShiftInput;
  disconnect?: Prisma.ShiftExchangeWhereInput | boolean;
  delete?: Prisma.ShiftExchangeWhereInput | boolean;
  connect?: Prisma.ShiftExchangeWhereUniqueInput;
  update?: Prisma.XOR<
    Prisma.XOR<Prisma.ShiftExchangeUpdateToOneWithWhereWithoutShiftInput, Prisma.ShiftExchangeUpdateWithoutShiftInput>,
    Prisma.ShiftExchangeUncheckedUpdateWithoutShiftInput
  >;
};

export type ShiftExchangeCreateWithoutRequesterInput = {
  id?: string;
  status?: string;
  createdAt?: Date | string;
  shift: Prisma.ShiftCreateNestedOneWithoutExchangeInput;
  target?: Prisma.UserCreateNestedOneWithoutShiftApprovalsInput;
};

export type ShiftExchangeUncheckedCreateWithoutRequesterInput = {
  id?: string;
  shiftId: string;
  targetId?: string | null;
  status?: string;
  createdAt?: Date | string;
};

export type ShiftExchangeCreateOrConnectWithoutRequesterInput = {
  where: Prisma.ShiftExchangeWhereUniqueInput;
  create: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutRequesterInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput
  >;
};

export type ShiftExchangeCreateManyRequesterInputEnvelope = {
  data: Prisma.ShiftExchangeCreateManyRequesterInput | Prisma.ShiftExchangeCreateManyRequesterInput[];
  skipDuplicates?: boolean;
};

export type ShiftExchangeCreateWithoutTargetInput = {
  id?: string;
  status?: string;
  createdAt?: Date | string;
  shift: Prisma.ShiftCreateNestedOneWithoutExchangeInput;
  requester: Prisma.UserCreateNestedOneWithoutShiftRequestsInput;
};

export type ShiftExchangeUncheckedCreateWithoutTargetInput = {
  id?: string;
  shiftId: string;
  requesterId: string;
  status?: string;
  createdAt?: Date | string;
};

export type ShiftExchangeCreateOrConnectWithoutTargetInput = {
  where: Prisma.ShiftExchangeWhereUniqueInput;
  create: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutTargetInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput
  >;
};

export type ShiftExchangeCreateManyTargetInputEnvelope = {
  data: Prisma.ShiftExchangeCreateManyTargetInput | Prisma.ShiftExchangeCreateManyTargetInput[];
  skipDuplicates?: boolean;
};

export type ShiftExchangeUpsertWithWhereUniqueWithoutRequesterInput = {
  where: Prisma.ShiftExchangeWhereUniqueInput;
  update: Prisma.XOR<
    Prisma.ShiftExchangeUpdateWithoutRequesterInput,
    Prisma.ShiftExchangeUncheckedUpdateWithoutRequesterInput
  >;
  create: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutRequesterInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutRequesterInput
  >;
};

export type ShiftExchangeUpdateWithWhereUniqueWithoutRequesterInput = {
  where: Prisma.ShiftExchangeWhereUniqueInput;
  data: Prisma.XOR<
    Prisma.ShiftExchangeUpdateWithoutRequesterInput,
    Prisma.ShiftExchangeUncheckedUpdateWithoutRequesterInput
  >;
};

export type ShiftExchangeUpdateManyWithWhereWithoutRequesterInput = {
  where: Prisma.ShiftExchangeScalarWhereInput;
  data: Prisma.XOR<
    Prisma.ShiftExchangeUpdateManyMutationInput,
    Prisma.ShiftExchangeUncheckedUpdateManyWithoutRequesterInput
  >;
};

export type ShiftExchangeScalarWhereInput = {
  AND?: Prisma.ShiftExchangeScalarWhereInput | Prisma.ShiftExchangeScalarWhereInput[];
  OR?: Prisma.ShiftExchangeScalarWhereInput[];
  NOT?: Prisma.ShiftExchangeScalarWhereInput | Prisma.ShiftExchangeScalarWhereInput[];
  id?: Prisma.StringFilter<'ShiftExchange'> | string;
  shiftId?: Prisma.StringFilter<'ShiftExchange'> | string;
  requesterId?: Prisma.StringFilter<'ShiftExchange'> | string;
  targetId?: Prisma.StringNullableFilter<'ShiftExchange'> | string | null;
  status?: Prisma.StringFilter<'ShiftExchange'> | string;
  createdAt?: Prisma.DateTimeFilter<'ShiftExchange'> | Date | string;
};

export type ShiftExchangeUpsertWithWhereUniqueWithoutTargetInput = {
  where: Prisma.ShiftExchangeWhereUniqueInput;
  update: Prisma.XOR<
    Prisma.ShiftExchangeUpdateWithoutTargetInput,
    Prisma.ShiftExchangeUncheckedUpdateWithoutTargetInput
  >;
  create: Prisma.XOR<
    Prisma.ShiftExchangeCreateWithoutTargetInput,
    Prisma.ShiftExchangeUncheckedCreateWithoutTargetInput
  >;
};

export type ShiftExchangeUpdateWithWhereUniqueWithoutTargetInput = {
  where: Prisma.ShiftExchangeWhereUniqueInput;
  data: Prisma.XOR<Prisma.ShiftExchangeUpdateWithoutTargetInput, Prisma.ShiftExchangeUncheckedUpdateWithoutTargetInput>;
};

export type ShiftExchangeUpdateManyWithWhereWithoutTargetInput = {
  where: Prisma.ShiftExchangeScalarWhereInput;
  data: Prisma.XOR<
    Prisma.ShiftExchangeUpdateManyMutationInput,
    Prisma.ShiftExchangeUncheckedUpdateManyWithoutTargetInput
  >;
};

export type ShiftExchangeCreateWithoutShiftInput = {
  id?: string;
  status?: string;
  createdAt?: Date | string;
  requester: Prisma.UserCreateNestedOneWithoutShiftRequestsInput;
  target?: Prisma.UserCreateNestedOneWithoutShiftApprovalsInput;
};

export type ShiftExchangeUncheckedCreateWithoutShiftInput = {
  id?: string;
  requesterId: string;
  targetId?: string | null;
  status?: string;
  createdAt?: Date | string;
};

export type ShiftExchangeCreateOrConnectWithoutShiftInput = {
  where: Prisma.ShiftExchangeWhereUniqueInput;
  create: Prisma.XOR<Prisma.ShiftExchangeCreateWithoutShiftInput, Prisma.ShiftExchangeUncheckedCreateWithoutShiftInput>;
};

export type ShiftExchangeUpsertWithoutShiftInput = {
  update: Prisma.XOR<Prisma.ShiftExchangeUpdateWithoutShiftInput, Prisma.ShiftExchangeUncheckedUpdateWithoutShiftInput>;
  create: Prisma.XOR<Prisma.ShiftExchangeCreateWithoutShiftInput, Prisma.ShiftExchangeUncheckedCreateWithoutShiftInput>;
  where?: Prisma.ShiftExchangeWhereInput;
};

export type ShiftExchangeUpdateToOneWithWhereWithoutShiftInput = {
  where?: Prisma.ShiftExchangeWhereInput;
  data: Prisma.XOR<Prisma.ShiftExchangeUpdateWithoutShiftInput, Prisma.ShiftExchangeUncheckedUpdateWithoutShiftInput>;
};

export type ShiftExchangeUpdateWithoutShiftInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  requester?: Prisma.UserUpdateOneRequiredWithoutShiftRequestsNestedInput;
  target?: Prisma.UserUpdateOneWithoutShiftApprovalsNestedInput;
};

export type ShiftExchangeUncheckedUpdateWithoutShiftInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  requesterId?: Prisma.StringFieldUpdateOperationsInput | string;
  targetId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeCreateManyRequesterInput = {
  id?: string;
  shiftId: string;
  targetId?: string | null;
  status?: string;
  createdAt?: Date | string;
};

export type ShiftExchangeCreateManyTargetInput = {
  id?: string;
  shiftId: string;
  requesterId: string;
  status?: string;
  createdAt?: Date | string;
};

export type ShiftExchangeUpdateWithoutRequesterInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  shift?: Prisma.ShiftUpdateOneRequiredWithoutExchangeNestedInput;
  target?: Prisma.UserUpdateOneWithoutShiftApprovalsNestedInput;
};

export type ShiftExchangeUncheckedUpdateWithoutRequesterInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  shiftId?: Prisma.StringFieldUpdateOperationsInput | string;
  targetId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeUncheckedUpdateManyWithoutRequesterInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  shiftId?: Prisma.StringFieldUpdateOperationsInput | string;
  targetId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeUpdateWithoutTargetInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  shift?: Prisma.ShiftUpdateOneRequiredWithoutExchangeNestedInput;
  requester?: Prisma.UserUpdateOneRequiredWithoutShiftRequestsNestedInput;
};

export type ShiftExchangeUncheckedUpdateWithoutTargetInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  shiftId?: Prisma.StringFieldUpdateOperationsInput | string;
  requesterId?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeUncheckedUpdateManyWithoutTargetInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  shiftId?: Prisma.StringFieldUpdateOperationsInput | string;
  requesterId?: Prisma.StringFieldUpdateOperationsInput | string;
  status?: Prisma.StringFieldUpdateOperationsInput | string;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type ShiftExchangeSelect<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    shiftId?: boolean;
    requesterId?: boolean;
    targetId?: boolean;
    status?: boolean;
    createdAt?: boolean;
    shift?: boolean | Prisma.ShiftDefaultArgs<ExtArgs>;
    requester?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    target?: boolean | Prisma.ShiftExchange$targetArgs<ExtArgs>;
  },
  ExtArgs['result']['shiftExchange']
>;

export type ShiftExchangeSelectCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    shiftId?: boolean;
    requesterId?: boolean;
    targetId?: boolean;
    status?: boolean;
    createdAt?: boolean;
    shift?: boolean | Prisma.ShiftDefaultArgs<ExtArgs>;
    requester?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    target?: boolean | Prisma.ShiftExchange$targetArgs<ExtArgs>;
  },
  ExtArgs['result']['shiftExchange']
>;

export type ShiftExchangeSelectUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    shiftId?: boolean;
    requesterId?: boolean;
    targetId?: boolean;
    status?: boolean;
    createdAt?: boolean;
    shift?: boolean | Prisma.ShiftDefaultArgs<ExtArgs>;
    requester?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    target?: boolean | Prisma.ShiftExchange$targetArgs<ExtArgs>;
  },
  ExtArgs['result']['shiftExchange']
>;

export type ShiftExchangeSelectScalar = {
  id?: boolean;
  shiftId?: boolean;
  requesterId?: boolean;
  targetId?: boolean;
  status?: boolean;
  createdAt?: boolean;
};

export type ShiftExchangeOmit<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetOmit<
  'id' | 'shiftId' | 'requesterId' | 'targetId' | 'status' | 'createdAt',
  ExtArgs['result']['shiftExchange']
>;
export type ShiftExchangeInclude<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  shift?: boolean | Prisma.ShiftDefaultArgs<ExtArgs>;
  requester?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
  target?: boolean | Prisma.ShiftExchange$targetArgs<ExtArgs>;
};
export type ShiftExchangeIncludeCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  shift?: boolean | Prisma.ShiftDefaultArgs<ExtArgs>;
  requester?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
  target?: boolean | Prisma.ShiftExchange$targetArgs<ExtArgs>;
};
export type ShiftExchangeIncludeUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  shift?: boolean | Prisma.ShiftDefaultArgs<ExtArgs>;
  requester?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
  target?: boolean | Prisma.ShiftExchange$targetArgs<ExtArgs>;
};

export type $ShiftExchangePayload<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  name: 'ShiftExchange';
  objects: {
    shift: Prisma.$ShiftPayload<ExtArgs>;
    requester: Prisma.$UserPayload<ExtArgs>;
    target: Prisma.$UserPayload<ExtArgs> | null;
  };
  scalars: runtime.Types.Extensions.GetPayloadResult<
    {
      id: string;
      shiftId: string;
      requesterId: string;
      targetId: string | null;
      status: string;
      createdAt: Date;
    },
    ExtArgs['result']['shiftExchange']
  >;
  composites: {};
};

export type ShiftExchangeGetPayload<S extends boolean | null | undefined | ShiftExchangeDefaultArgs> =
  runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload, S>;

export type ShiftExchangeCountArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = Omit<ShiftExchangeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
  select?: ShiftExchangeCountAggregateInputType | true;
};

export interface ShiftExchangeDelegate<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ShiftExchange']; meta: { name: 'ShiftExchange' } };
  /**
   * Find zero or one ShiftExchange that matches the filter.
   * @param {ShiftExchangeFindUniqueArgs} args - Arguments to find a ShiftExchange
   * @example
   * // Get one ShiftExchange
   * const shiftExchange = await prisma.shiftExchange.findUnique({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUnique<T extends ShiftExchangeFindUniqueArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeFindUniqueArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'findUnique', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find one ShiftExchange that matches the filter or throw an error with `error.code='P2025'`
   * if no matches were found.
   * @param {ShiftExchangeFindUniqueOrThrowArgs} args - Arguments to find a ShiftExchange
   * @example
   * // Get one ShiftExchange
   * const shiftExchange = await prisma.shiftExchange.findUniqueOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUniqueOrThrow<T extends ShiftExchangeFindUniqueOrThrowArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeFindUniqueOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first ShiftExchange that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {ShiftExchangeFindFirstArgs} args - Arguments to find a ShiftExchange
   * @example
   * // Get one ShiftExchange
   * const shiftExchange = await prisma.shiftExchange.findFirst({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirst<T extends ShiftExchangeFindFirstArgs>(
    args?: Prisma.SelectSubset<T, ShiftExchangeFindFirstArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'findFirst', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first ShiftExchange that matches the filter or
   * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {ShiftExchangeFindFirstOrThrowArgs} args - Arguments to find a ShiftExchange
   * @example
   * // Get one ShiftExchange
   * const shiftExchange = await prisma.shiftExchange.findFirstOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirstOrThrow<T extends ShiftExchangeFindFirstOrThrowArgs>(
    args?: Prisma.SelectSubset<T, ShiftExchangeFindFirstOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'findFirstOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find zero or more ShiftExchanges that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {ShiftExchangeFindManyArgs} args - Arguments to filter and select certain fields only.
   * @example
   * // Get all ShiftExchanges
   * const shiftExchanges = await prisma.shiftExchange.findMany()
   *
   * // Get first 10 ShiftExchanges
   * const shiftExchanges = await prisma.shiftExchange.findMany({ take: 10 })
   *
   * // Only select the `id`
   * const shiftExchangeWithIdOnly = await prisma.shiftExchange.findMany({ select: { id: true } })
   *
   */
  findMany<T extends ShiftExchangeFindManyArgs>(
    args?: Prisma.SelectSubset<T, ShiftExchangeFindManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'findMany', GlobalOmitOptions>
  >;

  /**
   * Create a ShiftExchange.
   * @param {ShiftExchangeCreateArgs} args - Arguments to create a ShiftExchange.
   * @example
   * // Create one ShiftExchange
   * const ShiftExchange = await prisma.shiftExchange.create({
   *   data: {
   *     // ... data to create a ShiftExchange
   *   }
   * })
   *
   */
  create<T extends ShiftExchangeCreateArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeCreateArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'create', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Create many ShiftExchanges.
   * @param {ShiftExchangeCreateManyArgs} args - Arguments to create many ShiftExchanges.
   * @example
   * // Create many ShiftExchanges
   * const shiftExchange = await prisma.shiftExchange.createMany({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   */
  createMany<T extends ShiftExchangeCreateManyArgs>(
    args?: Prisma.SelectSubset<T, ShiftExchangeCreateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Create many ShiftExchanges and returns the data saved in the database.
   * @param {ShiftExchangeCreateManyAndReturnArgs} args - Arguments to create many ShiftExchanges.
   * @example
   * // Create many ShiftExchanges
   * const shiftExchange = await prisma.shiftExchange.createManyAndReturn({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Create many ShiftExchanges and only return the `id`
   * const shiftExchangeWithIdOnly = await prisma.shiftExchange.createManyAndReturn({
   *   select: { id: true },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   *
   */
  createManyAndReturn<T extends ShiftExchangeCreateManyAndReturnArgs>(
    args?: Prisma.SelectSubset<T, ShiftExchangeCreateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'createManyAndReturn', GlobalOmitOptions>
  >;

  /**
   * Delete a ShiftExchange.
   * @param {ShiftExchangeDeleteArgs} args - Arguments to delete one ShiftExchange.
   * @example
   * // Delete one ShiftExchange
   * const ShiftExchange = await prisma.shiftExchange.delete({
   *   where: {
   *     // ... filter to delete one ShiftExchange
   *   }
   * })
   *
   */
  delete<T extends ShiftExchangeDeleteArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeDeleteArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'delete', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Update one ShiftExchange.
   * @param {ShiftExchangeUpdateArgs} args - Arguments to update one ShiftExchange.
   * @example
   * // Update one ShiftExchange
   * const shiftExchange = await prisma.shiftExchange.update({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  update<T extends ShiftExchangeUpdateArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeUpdateArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'update', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Delete zero or more ShiftExchanges.
   * @param {ShiftExchangeDeleteManyArgs} args - Arguments to filter ShiftExchanges to delete.
   * @example
   * // Delete a few ShiftExchanges
   * const { count } = await prisma.shiftExchange.deleteMany({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   *
   */
  deleteMany<T extends ShiftExchangeDeleteManyArgs>(
    args?: Prisma.SelectSubset<T, ShiftExchangeDeleteManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more ShiftExchanges.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {ShiftExchangeUpdateManyArgs} args - Arguments to update one or more rows.
   * @example
   * // Update many ShiftExchanges
   * const shiftExchange = await prisma.shiftExchange.updateMany({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  updateMany<T extends ShiftExchangeUpdateManyArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeUpdateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more ShiftExchanges and returns the data updated in the database.
   * @param {ShiftExchangeUpdateManyAndReturnArgs} args - Arguments to update many ShiftExchanges.
   * @example
   * // Update many ShiftExchanges
   * const shiftExchange = await prisma.shiftExchange.updateManyAndReturn({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Update zero or more ShiftExchanges and only return the `id`
   * const shiftExchangeWithIdOnly = await prisma.shiftExchange.updateManyAndReturn({
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
  updateManyAndReturn<T extends ShiftExchangeUpdateManyAndReturnArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeUpdateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'updateManyAndReturn', GlobalOmitOptions>
  >;

  /**
   * Create or update one ShiftExchange.
   * @param {ShiftExchangeUpsertArgs} args - Arguments to update or create a ShiftExchange.
   * @example
   * // Update or create a ShiftExchange
   * const shiftExchange = await prisma.shiftExchange.upsert({
   *   create: {
   *     // ... data to create a ShiftExchange
   *   },
   *   update: {
   *     // ... in case it already exists, update
   *   },
   *   where: {
   *     // ... the filter for the ShiftExchange we want to update
   *   }
   * })
   */
  upsert<T extends ShiftExchangeUpsertArgs>(
    args: Prisma.SelectSubset<T, ShiftExchangeUpsertArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftExchangeClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftExchangePayload<ExtArgs>, T, 'upsert', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Count the number of ShiftExchanges.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {ShiftExchangeCountArgs} args - Arguments to filter ShiftExchanges to count.
   * @example
   * // Count the number of ShiftExchanges
   * const count = await prisma.shiftExchange.count({
   *   where: {
   *     // ... the filter for the ShiftExchanges we want to count
   *   }
   * })
   **/
  count<T extends ShiftExchangeCountArgs>(
    args?: Prisma.Subset<T, ShiftExchangeCountArgs>,
  ): Prisma.PrismaPromise<
    T extends runtime.Types.Utils.Record<'select', any>
      ? T['select'] extends true
        ? number
        : Prisma.GetScalarType<T['select'], ShiftExchangeCountAggregateOutputType>
      : number
  >;

  /**
   * Allows you to perform aggregations operations on a ShiftExchange.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {ShiftExchangeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
  aggregate<T extends ShiftExchangeAggregateArgs>(
    args: Prisma.Subset<T, ShiftExchangeAggregateArgs>,
  ): Prisma.PrismaPromise<GetShiftExchangeAggregateType<T>>;

  /**
   * Group by ShiftExchange.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {ShiftExchangeGroupByArgs} args - Group by arguments.
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
    T extends ShiftExchangeGroupByArgs,
    HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>,
    OrderByArg extends Prisma.True extends HasSelectOrTake
      ? { orderBy: ShiftExchangeGroupByArgs['orderBy'] }
      : { orderBy?: ShiftExchangeGroupByArgs['orderBy'] },
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
    args: Prisma.SubsetIntersection<T, ShiftExchangeGroupByArgs, OrderByArg> & InputErrors,
  ): {} extends InputErrors ? GetShiftExchangeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
  /**
   * Fields of the ShiftExchange model
   */
  readonly fields: ShiftExchangeFieldRefs;
}

/**
 * The delegate class that acts as a "Promise-like" for ShiftExchange.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__ShiftExchangeClient<
  T,
  Null = never,
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> extends Prisma.PrismaPromise<T> {
  readonly [Symbol.toStringTag]: 'PrismaPromise';
  shift<T extends Prisma.ShiftDefaultArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.ShiftDefaultArgs<ExtArgs>>,
  ): Prisma.Prisma__ShiftClient<
    runtime.Types.Result.GetResult<Prisma.$ShiftPayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions> | Null,
    Null,
    ExtArgs,
    GlobalOmitOptions
  >;
  requester<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>,
  ): Prisma.Prisma__UserClient<
    runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions> | Null,
    Null,
    ExtArgs,
    GlobalOmitOptions
  >;
  target<T extends Prisma.ShiftExchange$targetArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.ShiftExchange$targetArgs<ExtArgs>>,
  ): Prisma.Prisma__UserClient<
    runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
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
 * Fields of the ShiftExchange model
 */
export interface ShiftExchangeFieldRefs {
  readonly id: Prisma.FieldRef<'ShiftExchange', 'String'>;
  readonly shiftId: Prisma.FieldRef<'ShiftExchange', 'String'>;
  readonly requesterId: Prisma.FieldRef<'ShiftExchange', 'String'>;
  readonly targetId: Prisma.FieldRef<'ShiftExchange', 'String'>;
  readonly status: Prisma.FieldRef<'ShiftExchange', 'String'>;
  readonly createdAt: Prisma.FieldRef<'ShiftExchange', 'DateTime'>;
}

// Custom InputTypes
/**
 * ShiftExchange findUnique
 */
export type ShiftExchangeFindUniqueArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * Filter, which ShiftExchange to fetch.
   */
  where: Prisma.ShiftExchangeWhereUniqueInput;
};

/**
 * ShiftExchange findUniqueOrThrow
 */
export type ShiftExchangeFindUniqueOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * Filter, which ShiftExchange to fetch.
   */
  where: Prisma.ShiftExchangeWhereUniqueInput;
};

/**
 * ShiftExchange findFirst
 */
export type ShiftExchangeFindFirstArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * Filter, which ShiftExchange to fetch.
   */
  where?: Prisma.ShiftExchangeWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of ShiftExchanges to fetch.
   */
  orderBy?: Prisma.ShiftExchangeOrderByWithRelationInput | Prisma.ShiftExchangeOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for ShiftExchanges.
   */
  cursor?: Prisma.ShiftExchangeWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` ShiftExchanges from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` ShiftExchanges.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of ShiftExchanges.
   */
  distinct?: Prisma.ShiftExchangeScalarFieldEnum | Prisma.ShiftExchangeScalarFieldEnum[];
};

/**
 * ShiftExchange findFirstOrThrow
 */
export type ShiftExchangeFindFirstOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * Filter, which ShiftExchange to fetch.
   */
  where?: Prisma.ShiftExchangeWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of ShiftExchanges to fetch.
   */
  orderBy?: Prisma.ShiftExchangeOrderByWithRelationInput | Prisma.ShiftExchangeOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for ShiftExchanges.
   */
  cursor?: Prisma.ShiftExchangeWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` ShiftExchanges from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` ShiftExchanges.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of ShiftExchanges.
   */
  distinct?: Prisma.ShiftExchangeScalarFieldEnum | Prisma.ShiftExchangeScalarFieldEnum[];
};

/**
 * ShiftExchange findMany
 */
export type ShiftExchangeFindManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * Filter, which ShiftExchanges to fetch.
   */
  where?: Prisma.ShiftExchangeWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of ShiftExchanges to fetch.
   */
  orderBy?: Prisma.ShiftExchangeOrderByWithRelationInput | Prisma.ShiftExchangeOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for listing ShiftExchanges.
   */
  cursor?: Prisma.ShiftExchangeWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` ShiftExchanges from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` ShiftExchanges.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of ShiftExchanges.
   */
  distinct?: Prisma.ShiftExchangeScalarFieldEnum | Prisma.ShiftExchangeScalarFieldEnum[];
};

/**
 * ShiftExchange create
 */
export type ShiftExchangeCreateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * The data needed to create a ShiftExchange.
   */
  data: Prisma.XOR<Prisma.ShiftExchangeCreateInput, Prisma.ShiftExchangeUncheckedCreateInput>;
};

/**
 * ShiftExchange createMany
 */
export type ShiftExchangeCreateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to create many ShiftExchanges.
   */
  data: Prisma.ShiftExchangeCreateManyInput | Prisma.ShiftExchangeCreateManyInput[];
  skipDuplicates?: boolean;
};

/**
 * ShiftExchange createManyAndReturn
 */
export type ShiftExchangeCreateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelectCreateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * The data used to create many ShiftExchanges.
   */
  data: Prisma.ShiftExchangeCreateManyInput | Prisma.ShiftExchangeCreateManyInput[];
  skipDuplicates?: boolean;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeIncludeCreateManyAndReturn<ExtArgs> | null;
};

/**
 * ShiftExchange update
 */
export type ShiftExchangeUpdateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * The data needed to update a ShiftExchange.
   */
  data: Prisma.XOR<Prisma.ShiftExchangeUpdateInput, Prisma.ShiftExchangeUncheckedUpdateInput>;
  /**
   * Choose, which ShiftExchange to update.
   */
  where: Prisma.ShiftExchangeWhereUniqueInput;
};

/**
 * ShiftExchange updateMany
 */
export type ShiftExchangeUpdateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to update ShiftExchanges.
   */
  data: Prisma.XOR<Prisma.ShiftExchangeUpdateManyMutationInput, Prisma.ShiftExchangeUncheckedUpdateManyInput>;
  /**
   * Filter which ShiftExchanges to update
   */
  where?: Prisma.ShiftExchangeWhereInput;
  /**
   * Limit how many ShiftExchanges to update.
   */
  limit?: number;
};

/**
 * ShiftExchange updateManyAndReturn
 */
export type ShiftExchangeUpdateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelectUpdateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * The data used to update ShiftExchanges.
   */
  data: Prisma.XOR<Prisma.ShiftExchangeUpdateManyMutationInput, Prisma.ShiftExchangeUncheckedUpdateManyInput>;
  /**
   * Filter which ShiftExchanges to update
   */
  where?: Prisma.ShiftExchangeWhereInput;
  /**
   * Limit how many ShiftExchanges to update.
   */
  limit?: number;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeIncludeUpdateManyAndReturn<ExtArgs> | null;
};

/**
 * ShiftExchange upsert
 */
export type ShiftExchangeUpsertArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * The filter to search for the ShiftExchange to update in case it exists.
   */
  where: Prisma.ShiftExchangeWhereUniqueInput;
  /**
   * In case the ShiftExchange found by the `where` argument doesn't exist, create a new ShiftExchange with this data.
   */
  create: Prisma.XOR<Prisma.ShiftExchangeCreateInput, Prisma.ShiftExchangeUncheckedCreateInput>;
  /**
   * In case the ShiftExchange was found with the provided `where` argument, update it with this data.
   */
  update: Prisma.XOR<Prisma.ShiftExchangeUpdateInput, Prisma.ShiftExchangeUncheckedUpdateInput>;
};

/**
 * ShiftExchange delete
 */
export type ShiftExchangeDeleteArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
  /**
   * Filter which ShiftExchange to delete.
   */
  where: Prisma.ShiftExchangeWhereUniqueInput;
};

/**
 * ShiftExchange deleteMany
 */
export type ShiftExchangeDeleteManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which ShiftExchanges to delete
   */
  where?: Prisma.ShiftExchangeWhereInput;
  /**
   * Limit how many ShiftExchanges to delete.
   */
  limit?: number;
};

/**
 * ShiftExchange.target
 */
export type ShiftExchange$targetArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the User
   */
  select?: Prisma.UserSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the User
   */
  omit?: Prisma.UserOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.UserInclude<ExtArgs> | null;
  where?: Prisma.UserWhereInput;
};

/**
 * ShiftExchange without action
 */
export type ShiftExchangeDefaultArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ShiftExchange
   */
  select?: Prisma.ShiftExchangeSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ShiftExchange
   */
  omit?: Prisma.ShiftExchangeOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ShiftExchangeInclude<ExtArgs> | null;
};
