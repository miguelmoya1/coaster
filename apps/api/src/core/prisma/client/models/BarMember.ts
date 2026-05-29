import type * as runtime from '@prisma/client/runtime/client';
import type * as $Enums from '../enums.js';
import type * as Prisma from '../internal/prismaNamespace.js';

/**
 * Model BarMember
 *
 */
export type BarMemberModel = runtime.Types.Result.DefaultSelection<Prisma.$BarMemberPayload>;

export type AggregateBarMember = {
  _count: BarMemberCountAggregateOutputType | null;
  _min: BarMemberMinAggregateOutputType | null;
  _max: BarMemberMaxAggregateOutputType | null;
};

export type BarMemberMinAggregateOutputType = {
  id: string | null;
  userId: string | null;
  barId: string | null;
  role: $Enums.BarRole | null;
  active: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type BarMemberMaxAggregateOutputType = {
  id: string | null;
  userId: string | null;
  barId: string | null;
  role: $Enums.BarRole | null;
  active: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type BarMemberCountAggregateOutputType = {
  id: number;
  userId: number;
  barId: number;
  role: number;
  active: number;
  createdAt: number;
  updatedAt: number;
  _all: number;
};

export type BarMemberMinAggregateInputType = {
  id?: true;
  userId?: true;
  barId?: true;
  role?: true;
  active?: true;
  createdAt?: true;
  updatedAt?: true;
};

export type BarMemberMaxAggregateInputType = {
  id?: true;
  userId?: true;
  barId?: true;
  role?: true;
  active?: true;
  createdAt?: true;
  updatedAt?: true;
};

export type BarMemberCountAggregateInputType = {
  id?: true;
  userId?: true;
  barId?: true;
  role?: true;
  active?: true;
  createdAt?: true;
  updatedAt?: true;
  _all?: true;
};

export type BarMemberAggregateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which BarMember to aggregate.
   */
  where?: Prisma.BarMemberWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of BarMembers to fetch.
   */
  orderBy?: Prisma.BarMemberOrderByWithRelationInput | Prisma.BarMemberOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the start position
   */
  cursor?: Prisma.BarMemberWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` BarMembers from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` BarMembers.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Count returned BarMembers
   **/
  _count?: true | BarMemberCountAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the minimum value
   **/
  _min?: BarMemberMinAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the maximum value
   **/
  _max?: BarMemberMaxAggregateInputType;
};

export type GetBarMemberAggregateType<T extends BarMemberAggregateArgs> = {
  [P in keyof T & keyof AggregateBarMember]: P extends '_count' | 'count'
    ? T[P] extends true
      ? number
      : Prisma.GetScalarType<T[P], AggregateBarMember[P]>
    : Prisma.GetScalarType<T[P], AggregateBarMember[P]>;
};

export type BarMemberGroupByArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  where?: Prisma.BarMemberWhereInput;
  orderBy?: Prisma.BarMemberOrderByWithAggregationInput | Prisma.BarMemberOrderByWithAggregationInput[];
  by: Prisma.BarMemberScalarFieldEnum[] | Prisma.BarMemberScalarFieldEnum;
  having?: Prisma.BarMemberScalarWhereWithAggregatesInput;
  take?: number;
  skip?: number;
  _count?: BarMemberCountAggregateInputType | true;
  _min?: BarMemberMinAggregateInputType;
  _max?: BarMemberMaxAggregateInputType;
};

export type BarMemberGroupByOutputType = {
  id: string;
  userId: string;
  barId: string;
  role: $Enums.BarRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: BarMemberCountAggregateOutputType | null;
  _min: BarMemberMinAggregateOutputType | null;
  _max: BarMemberMaxAggregateOutputType | null;
};

export type GetBarMemberGroupByPayload<T extends BarMemberGroupByArgs> = Prisma.PrismaPromise<
  Array<
    Prisma.PickEnumerable<BarMemberGroupByOutputType, T['by']> & {
      [P in keyof T & keyof BarMemberGroupByOutputType]: P extends '_count'
        ? T[P] extends boolean
          ? number
          : Prisma.GetScalarType<T[P], BarMemberGroupByOutputType[P]>
        : Prisma.GetScalarType<T[P], BarMemberGroupByOutputType[P]>;
    }
  >
>;

export type BarMemberWhereInput = {
  AND?: Prisma.BarMemberWhereInput | Prisma.BarMemberWhereInput[];
  OR?: Prisma.BarMemberWhereInput[];
  NOT?: Prisma.BarMemberWhereInput | Prisma.BarMemberWhereInput[];
  id?: Prisma.StringFilter<'BarMember'> | string;
  userId?: Prisma.StringFilter<'BarMember'> | string;
  barId?: Prisma.StringFilter<'BarMember'> | string;
  role?: Prisma.EnumBarRoleFilter<'BarMember'> | $Enums.BarRole;
  active?: Prisma.BoolFilter<'BarMember'> | boolean;
  createdAt?: Prisma.DateTimeFilter<'BarMember'> | Date | string;
  updatedAt?: Prisma.DateTimeFilter<'BarMember'> | Date | string;
  user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
  bar?: Prisma.XOR<Prisma.BarScalarRelationFilter, Prisma.BarWhereInput>;
};

export type BarMemberOrderByWithRelationInput = {
  id?: Prisma.SortOrder;
  userId?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  role?: Prisma.SortOrder;
  active?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
  user?: Prisma.UserOrderByWithRelationInput;
  bar?: Prisma.BarOrderByWithRelationInput;
};

export type BarMemberWhereUniqueInput = Prisma.AtLeast<
  {
    id?: string;
    userId_barId?: Prisma.BarMemberUserIdBarIdCompoundUniqueInput;
    AND?: Prisma.BarMemberWhereInput | Prisma.BarMemberWhereInput[];
    OR?: Prisma.BarMemberWhereInput[];
    NOT?: Prisma.BarMemberWhereInput | Prisma.BarMemberWhereInput[];
    userId?: Prisma.StringFilter<'BarMember'> | string;
    barId?: Prisma.StringFilter<'BarMember'> | string;
    role?: Prisma.EnumBarRoleFilter<'BarMember'> | $Enums.BarRole;
    active?: Prisma.BoolFilter<'BarMember'> | boolean;
    createdAt?: Prisma.DateTimeFilter<'BarMember'> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<'BarMember'> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    bar?: Prisma.XOR<Prisma.BarScalarRelationFilter, Prisma.BarWhereInput>;
  },
  'id' | 'userId_barId'
>;

export type BarMemberOrderByWithAggregationInput = {
  id?: Prisma.SortOrder;
  userId?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  role?: Prisma.SortOrder;
  active?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
  _count?: Prisma.BarMemberCountOrderByAggregateInput;
  _max?: Prisma.BarMemberMaxOrderByAggregateInput;
  _min?: Prisma.BarMemberMinOrderByAggregateInput;
};

export type BarMemberScalarWhereWithAggregatesInput = {
  AND?: Prisma.BarMemberScalarWhereWithAggregatesInput | Prisma.BarMemberScalarWhereWithAggregatesInput[];
  OR?: Prisma.BarMemberScalarWhereWithAggregatesInput[];
  NOT?: Prisma.BarMemberScalarWhereWithAggregatesInput | Prisma.BarMemberScalarWhereWithAggregatesInput[];
  id?: Prisma.StringWithAggregatesFilter<'BarMember'> | string;
  userId?: Prisma.StringWithAggregatesFilter<'BarMember'> | string;
  barId?: Prisma.StringWithAggregatesFilter<'BarMember'> | string;
  role?: Prisma.EnumBarRoleWithAggregatesFilter<'BarMember'> | $Enums.BarRole;
  active?: Prisma.BoolWithAggregatesFilter<'BarMember'> | boolean;
  createdAt?: Prisma.DateTimeWithAggregatesFilter<'BarMember'> | Date | string;
  updatedAt?: Prisma.DateTimeWithAggregatesFilter<'BarMember'> | Date | string;
};

export type BarMemberCreateInput = {
  id?: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  user: Prisma.UserCreateNestedOneWithoutMembershipsInput;
  bar: Prisma.BarCreateNestedOneWithoutMembersInput;
};

export type BarMemberUncheckedCreateInput = {
  id?: string;
  userId: string;
  barId: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BarMemberUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  user?: Prisma.UserUpdateOneRequiredWithoutMembershipsNestedInput;
  bar?: Prisma.BarUpdateOneRequiredWithoutMembersNestedInput;
};

export type BarMemberUncheckedUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  userId?: Prisma.StringFieldUpdateOperationsInput | string;
  barId?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type BarMemberCreateManyInput = {
  id?: string;
  userId: string;
  barId: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BarMemberUpdateManyMutationInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type BarMemberUncheckedUpdateManyInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  userId?: Prisma.StringFieldUpdateOperationsInput | string;
  barId?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type BarMemberListRelationFilter = {
  every?: Prisma.BarMemberWhereInput;
  some?: Prisma.BarMemberWhereInput;
  none?: Prisma.BarMemberWhereInput;
};

export type BarMemberOrderByRelationAggregateInput = {
  _count?: Prisma.SortOrder;
};

export type BarMemberUserIdBarIdCompoundUniqueInput = {
  userId: string;
  barId: string;
};

export type BarMemberCountOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  userId?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  role?: Prisma.SortOrder;
  active?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type BarMemberMaxOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  userId?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  role?: Prisma.SortOrder;
  active?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type BarMemberMinOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  userId?: Prisma.SortOrder;
  barId?: Prisma.SortOrder;
  role?: Prisma.SortOrder;
  active?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type BarMemberCreateNestedManyWithoutUserInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutUserInput, Prisma.BarMemberUncheckedCreateWithoutUserInput>
    | Prisma.BarMemberCreateWithoutUserInput[]
    | Prisma.BarMemberUncheckedCreateWithoutUserInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutUserInput | Prisma.BarMemberCreateOrConnectWithoutUserInput[];
  createMany?: Prisma.BarMemberCreateManyUserInputEnvelope;
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
};

export type BarMemberUncheckedCreateNestedManyWithoutUserInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutUserInput, Prisma.BarMemberUncheckedCreateWithoutUserInput>
    | Prisma.BarMemberCreateWithoutUserInput[]
    | Prisma.BarMemberUncheckedCreateWithoutUserInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutUserInput | Prisma.BarMemberCreateOrConnectWithoutUserInput[];
  createMany?: Prisma.BarMemberCreateManyUserInputEnvelope;
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
};

export type BarMemberUpdateManyWithoutUserNestedInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutUserInput, Prisma.BarMemberUncheckedCreateWithoutUserInput>
    | Prisma.BarMemberCreateWithoutUserInput[]
    | Prisma.BarMemberUncheckedCreateWithoutUserInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutUserInput | Prisma.BarMemberCreateOrConnectWithoutUserInput[];
  upsert?:
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutUserInput
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutUserInput[];
  createMany?: Prisma.BarMemberCreateManyUserInputEnvelope;
  set?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  disconnect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  delete?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  update?:
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutUserInput
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutUserInput[];
  updateMany?:
    | Prisma.BarMemberUpdateManyWithWhereWithoutUserInput
    | Prisma.BarMemberUpdateManyWithWhereWithoutUserInput[];
  deleteMany?: Prisma.BarMemberScalarWhereInput | Prisma.BarMemberScalarWhereInput[];
};

export type BarMemberUncheckedUpdateManyWithoutUserNestedInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutUserInput, Prisma.BarMemberUncheckedCreateWithoutUserInput>
    | Prisma.BarMemberCreateWithoutUserInput[]
    | Prisma.BarMemberUncheckedCreateWithoutUserInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutUserInput | Prisma.BarMemberCreateOrConnectWithoutUserInput[];
  upsert?:
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutUserInput
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutUserInput[];
  createMany?: Prisma.BarMemberCreateManyUserInputEnvelope;
  set?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  disconnect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  delete?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  update?:
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutUserInput
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutUserInput[];
  updateMany?:
    | Prisma.BarMemberUpdateManyWithWhereWithoutUserInput
    | Prisma.BarMemberUpdateManyWithWhereWithoutUserInput[];
  deleteMany?: Prisma.BarMemberScalarWhereInput | Prisma.BarMemberScalarWhereInput[];
};

export type BarMemberCreateNestedManyWithoutBarInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutBarInput, Prisma.BarMemberUncheckedCreateWithoutBarInput>
    | Prisma.BarMemberCreateWithoutBarInput[]
    | Prisma.BarMemberUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutBarInput | Prisma.BarMemberCreateOrConnectWithoutBarInput[];
  createMany?: Prisma.BarMemberCreateManyBarInputEnvelope;
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
};

export type BarMemberUncheckedCreateNestedManyWithoutBarInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutBarInput, Prisma.BarMemberUncheckedCreateWithoutBarInput>
    | Prisma.BarMemberCreateWithoutBarInput[]
    | Prisma.BarMemberUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutBarInput | Prisma.BarMemberCreateOrConnectWithoutBarInput[];
  createMany?: Prisma.BarMemberCreateManyBarInputEnvelope;
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
};

export type BarMemberUpdateManyWithoutBarNestedInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutBarInput, Prisma.BarMemberUncheckedCreateWithoutBarInput>
    | Prisma.BarMemberCreateWithoutBarInput[]
    | Prisma.BarMemberUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutBarInput | Prisma.BarMemberCreateOrConnectWithoutBarInput[];
  upsert?:
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutBarInput
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutBarInput[];
  createMany?: Prisma.BarMemberCreateManyBarInputEnvelope;
  set?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  disconnect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  delete?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  update?:
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutBarInput
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutBarInput[];
  updateMany?:
    | Prisma.BarMemberUpdateManyWithWhereWithoutBarInput
    | Prisma.BarMemberUpdateManyWithWhereWithoutBarInput[];
  deleteMany?: Prisma.BarMemberScalarWhereInput | Prisma.BarMemberScalarWhereInput[];
};

export type BarMemberUncheckedUpdateManyWithoutBarNestedInput = {
  create?:
    | Prisma.XOR<Prisma.BarMemberCreateWithoutBarInput, Prisma.BarMemberUncheckedCreateWithoutBarInput>
    | Prisma.BarMemberCreateWithoutBarInput[]
    | Prisma.BarMemberUncheckedCreateWithoutBarInput[];
  connectOrCreate?: Prisma.BarMemberCreateOrConnectWithoutBarInput | Prisma.BarMemberCreateOrConnectWithoutBarInput[];
  upsert?:
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutBarInput
    | Prisma.BarMemberUpsertWithWhereUniqueWithoutBarInput[];
  createMany?: Prisma.BarMemberCreateManyBarInputEnvelope;
  set?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  disconnect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  delete?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  connect?: Prisma.BarMemberWhereUniqueInput | Prisma.BarMemberWhereUniqueInput[];
  update?:
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutBarInput
    | Prisma.BarMemberUpdateWithWhereUniqueWithoutBarInput[];
  updateMany?:
    | Prisma.BarMemberUpdateManyWithWhereWithoutBarInput
    | Prisma.BarMemberUpdateManyWithWhereWithoutBarInput[];
  deleteMany?: Prisma.BarMemberScalarWhereInput | Prisma.BarMemberScalarWhereInput[];
};

export type EnumBarRoleFieldUpdateOperationsInput = {
  set?: $Enums.BarRole;
};

export type BarMemberCreateWithoutUserInput = {
  id?: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  bar: Prisma.BarCreateNestedOneWithoutMembersInput;
};

export type BarMemberUncheckedCreateWithoutUserInput = {
  id?: string;
  barId: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BarMemberCreateOrConnectWithoutUserInput = {
  where: Prisma.BarMemberWhereUniqueInput;
  create: Prisma.XOR<Prisma.BarMemberCreateWithoutUserInput, Prisma.BarMemberUncheckedCreateWithoutUserInput>;
};

export type BarMemberCreateManyUserInputEnvelope = {
  data: Prisma.BarMemberCreateManyUserInput | Prisma.BarMemberCreateManyUserInput[];
  skipDuplicates?: boolean;
};

export type BarMemberUpsertWithWhereUniqueWithoutUserInput = {
  where: Prisma.BarMemberWhereUniqueInput;
  update: Prisma.XOR<Prisma.BarMemberUpdateWithoutUserInput, Prisma.BarMemberUncheckedUpdateWithoutUserInput>;
  create: Prisma.XOR<Prisma.BarMemberCreateWithoutUserInput, Prisma.BarMemberUncheckedCreateWithoutUserInput>;
};

export type BarMemberUpdateWithWhereUniqueWithoutUserInput = {
  where: Prisma.BarMemberWhereUniqueInput;
  data: Prisma.XOR<Prisma.BarMemberUpdateWithoutUserInput, Prisma.BarMemberUncheckedUpdateWithoutUserInput>;
};

export type BarMemberUpdateManyWithWhereWithoutUserInput = {
  where: Prisma.BarMemberScalarWhereInput;
  data: Prisma.XOR<Prisma.BarMemberUpdateManyMutationInput, Prisma.BarMemberUncheckedUpdateManyWithoutUserInput>;
};

export type BarMemberScalarWhereInput = {
  AND?: Prisma.BarMemberScalarWhereInput | Prisma.BarMemberScalarWhereInput[];
  OR?: Prisma.BarMemberScalarWhereInput[];
  NOT?: Prisma.BarMemberScalarWhereInput | Prisma.BarMemberScalarWhereInput[];
  id?: Prisma.StringFilter<'BarMember'> | string;
  userId?: Prisma.StringFilter<'BarMember'> | string;
  barId?: Prisma.StringFilter<'BarMember'> | string;
  role?: Prisma.EnumBarRoleFilter<'BarMember'> | $Enums.BarRole;
  active?: Prisma.BoolFilter<'BarMember'> | boolean;
  createdAt?: Prisma.DateTimeFilter<'BarMember'> | Date | string;
  updatedAt?: Prisma.DateTimeFilter<'BarMember'> | Date | string;
};

export type BarMemberCreateWithoutBarInput = {
  id?: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  user: Prisma.UserCreateNestedOneWithoutMembershipsInput;
};

export type BarMemberUncheckedCreateWithoutBarInput = {
  id?: string;
  userId: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BarMemberCreateOrConnectWithoutBarInput = {
  where: Prisma.BarMemberWhereUniqueInput;
  create: Prisma.XOR<Prisma.BarMemberCreateWithoutBarInput, Prisma.BarMemberUncheckedCreateWithoutBarInput>;
};

export type BarMemberCreateManyBarInputEnvelope = {
  data: Prisma.BarMemberCreateManyBarInput | Prisma.BarMemberCreateManyBarInput[];
  skipDuplicates?: boolean;
};

export type BarMemberUpsertWithWhereUniqueWithoutBarInput = {
  where: Prisma.BarMemberWhereUniqueInput;
  update: Prisma.XOR<Prisma.BarMemberUpdateWithoutBarInput, Prisma.BarMemberUncheckedUpdateWithoutBarInput>;
  create: Prisma.XOR<Prisma.BarMemberCreateWithoutBarInput, Prisma.BarMemberUncheckedCreateWithoutBarInput>;
};

export type BarMemberUpdateWithWhereUniqueWithoutBarInput = {
  where: Prisma.BarMemberWhereUniqueInput;
  data: Prisma.XOR<Prisma.BarMemberUpdateWithoutBarInput, Prisma.BarMemberUncheckedUpdateWithoutBarInput>;
};

export type BarMemberUpdateManyWithWhereWithoutBarInput = {
  where: Prisma.BarMemberScalarWhereInput;
  data: Prisma.XOR<Prisma.BarMemberUpdateManyMutationInput, Prisma.BarMemberUncheckedUpdateManyWithoutBarInput>;
};

export type BarMemberCreateManyUserInput = {
  id?: string;
  barId: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BarMemberUpdateWithoutUserInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  bar?: Prisma.BarUpdateOneRequiredWithoutMembersNestedInput;
};

export type BarMemberUncheckedUpdateWithoutUserInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  barId?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type BarMemberUncheckedUpdateManyWithoutUserInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  barId?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type BarMemberCreateManyBarInput = {
  id?: string;
  userId: string;
  role?: $Enums.BarRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BarMemberUpdateWithoutBarInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  user?: Prisma.UserUpdateOneRequiredWithoutMembershipsNestedInput;
};

export type BarMemberUncheckedUpdateWithoutBarInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  userId?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type BarMemberUncheckedUpdateManyWithoutBarInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  userId?: Prisma.StringFieldUpdateOperationsInput | string;
  role?: Prisma.EnumBarRoleFieldUpdateOperationsInput | $Enums.BarRole;
  active?: Prisma.BoolFieldUpdateOperationsInput | boolean;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type BarMemberSelect<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    userId?: boolean;
    barId?: boolean;
    role?: boolean;
    active?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
  },
  ExtArgs['result']['barMember']
>;

export type BarMemberSelectCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    userId?: boolean;
    barId?: boolean;
    role?: boolean;
    active?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
  },
  ExtArgs['result']['barMember']
>;

export type BarMemberSelectUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    userId?: boolean;
    barId?: boolean;
    role?: boolean;
    active?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
  },
  ExtArgs['result']['barMember']
>;

export type BarMemberSelectScalar = {
  id?: boolean;
  userId?: boolean;
  barId?: boolean;
  role?: boolean;
  active?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
};

export type BarMemberOmit<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetOmit<
  'id' | 'userId' | 'barId' | 'role' | 'active' | 'createdAt' | 'updatedAt',
  ExtArgs['result']['barMember']
>;
export type BarMemberInclude<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
  bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
};
export type BarMemberIncludeCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
  bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
};
export type BarMemberIncludeUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
  bar?: boolean | Prisma.BarDefaultArgs<ExtArgs>;
};

export type $BarMemberPayload<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  name: 'BarMember';
  objects: {
    user: Prisma.$UserPayload<ExtArgs>;
    bar: Prisma.$BarPayload<ExtArgs>;
  };
  scalars: runtime.Types.Extensions.GetPayloadResult<
    {
      id: string;
      userId: string;
      barId: string;
      role: $Enums.BarRole;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    ExtArgs['result']['barMember']
  >;
  composites: {};
};

export type BarMemberGetPayload<S extends boolean | null | undefined | BarMemberDefaultArgs> =
  runtime.Types.Result.GetResult<Prisma.$BarMemberPayload, S>;

export type BarMemberCountArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = Omit<BarMemberFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
  select?: BarMemberCountAggregateInputType | true;
};

export interface BarMemberDelegate<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BarMember']; meta: { name: 'BarMember' } };
  /**
   * Find zero or one BarMember that matches the filter.
   * @param {BarMemberFindUniqueArgs} args - Arguments to find a BarMember
   * @example
   * // Get one BarMember
   * const barMember = await prisma.barMember.findUnique({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUnique<T extends BarMemberFindUniqueArgs>(
    args: Prisma.SelectSubset<T, BarMemberFindUniqueArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'findUnique', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find one BarMember that matches the filter or throw an error with `error.code='P2025'`
   * if no matches were found.
   * @param {BarMemberFindUniqueOrThrowArgs} args - Arguments to find a BarMember
   * @example
   * // Get one BarMember
   * const barMember = await prisma.barMember.findUniqueOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUniqueOrThrow<T extends BarMemberFindUniqueOrThrowArgs>(
    args: Prisma.SelectSubset<T, BarMemberFindUniqueOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first BarMember that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {BarMemberFindFirstArgs} args - Arguments to find a BarMember
   * @example
   * // Get one BarMember
   * const barMember = await prisma.barMember.findFirst({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirst<T extends BarMemberFindFirstArgs>(
    args?: Prisma.SelectSubset<T, BarMemberFindFirstArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'findFirst', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first BarMember that matches the filter or
   * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {BarMemberFindFirstOrThrowArgs} args - Arguments to find a BarMember
   * @example
   * // Get one BarMember
   * const barMember = await prisma.barMember.findFirstOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirstOrThrow<T extends BarMemberFindFirstOrThrowArgs>(
    args?: Prisma.SelectSubset<T, BarMemberFindFirstOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'findFirstOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find zero or more BarMembers that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {BarMemberFindManyArgs} args - Arguments to filter and select certain fields only.
   * @example
   * // Get all BarMembers
   * const barMembers = await prisma.barMember.findMany()
   *
   * // Get first 10 BarMembers
   * const barMembers = await prisma.barMember.findMany({ take: 10 })
   *
   * // Only select the `id`
   * const barMemberWithIdOnly = await prisma.barMember.findMany({ select: { id: true } })
   *
   */
  findMany<T extends BarMemberFindManyArgs>(
    args?: Prisma.SelectSubset<T, BarMemberFindManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'findMany', GlobalOmitOptions>
  >;

  /**
   * Create a BarMember.
   * @param {BarMemberCreateArgs} args - Arguments to create a BarMember.
   * @example
   * // Create one BarMember
   * const BarMember = await prisma.barMember.create({
   *   data: {
   *     // ... data to create a BarMember
   *   }
   * })
   *
   */
  create<T extends BarMemberCreateArgs>(
    args: Prisma.SelectSubset<T, BarMemberCreateArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'create', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Create many BarMembers.
   * @param {BarMemberCreateManyArgs} args - Arguments to create many BarMembers.
   * @example
   * // Create many BarMembers
   * const barMember = await prisma.barMember.createMany({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   */
  createMany<T extends BarMemberCreateManyArgs>(
    args?: Prisma.SelectSubset<T, BarMemberCreateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Create many BarMembers and returns the data saved in the database.
   * @param {BarMemberCreateManyAndReturnArgs} args - Arguments to create many BarMembers.
   * @example
   * // Create many BarMembers
   * const barMember = await prisma.barMember.createManyAndReturn({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Create many BarMembers and only return the `id`
   * const barMemberWithIdOnly = await prisma.barMember.createManyAndReturn({
   *   select: { id: true },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   *
   */
  createManyAndReturn<T extends BarMemberCreateManyAndReturnArgs>(
    args?: Prisma.SelectSubset<T, BarMemberCreateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'createManyAndReturn', GlobalOmitOptions>
  >;

  /**
   * Delete a BarMember.
   * @param {BarMemberDeleteArgs} args - Arguments to delete one BarMember.
   * @example
   * // Delete one BarMember
   * const BarMember = await prisma.barMember.delete({
   *   where: {
   *     // ... filter to delete one BarMember
   *   }
   * })
   *
   */
  delete<T extends BarMemberDeleteArgs>(
    args: Prisma.SelectSubset<T, BarMemberDeleteArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'delete', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Update one BarMember.
   * @param {BarMemberUpdateArgs} args - Arguments to update one BarMember.
   * @example
   * // Update one BarMember
   * const barMember = await prisma.barMember.update({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  update<T extends BarMemberUpdateArgs>(
    args: Prisma.SelectSubset<T, BarMemberUpdateArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'update', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Delete zero or more BarMembers.
   * @param {BarMemberDeleteManyArgs} args - Arguments to filter BarMembers to delete.
   * @example
   * // Delete a few BarMembers
   * const { count } = await prisma.barMember.deleteMany({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   *
   */
  deleteMany<T extends BarMemberDeleteManyArgs>(
    args?: Prisma.SelectSubset<T, BarMemberDeleteManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more BarMembers.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {BarMemberUpdateManyArgs} args - Arguments to update one or more rows.
   * @example
   * // Update many BarMembers
   * const barMember = await prisma.barMember.updateMany({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  updateMany<T extends BarMemberUpdateManyArgs>(
    args: Prisma.SelectSubset<T, BarMemberUpdateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more BarMembers and returns the data updated in the database.
   * @param {BarMemberUpdateManyAndReturnArgs} args - Arguments to update many BarMembers.
   * @example
   * // Update many BarMembers
   * const barMember = await prisma.barMember.updateManyAndReturn({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Update zero or more BarMembers and only return the `id`
   * const barMemberWithIdOnly = await prisma.barMember.updateManyAndReturn({
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
  updateManyAndReturn<T extends BarMemberUpdateManyAndReturnArgs>(
    args: Prisma.SelectSubset<T, BarMemberUpdateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'updateManyAndReturn', GlobalOmitOptions>
  >;

  /**
   * Create or update one BarMember.
   * @param {BarMemberUpsertArgs} args - Arguments to update or create a BarMember.
   * @example
   * // Update or create a BarMember
   * const barMember = await prisma.barMember.upsert({
   *   create: {
   *     // ... data to create a BarMember
   *   },
   *   update: {
   *     // ... in case it already exists, update
   *   },
   *   where: {
   *     // ... the filter for the BarMember we want to update
   *   }
   * })
   */
  upsert<T extends BarMemberUpsertArgs>(
    args: Prisma.SelectSubset<T, BarMemberUpsertArgs<ExtArgs>>,
  ): Prisma.Prisma__BarMemberClient<
    runtime.Types.Result.GetResult<Prisma.$BarMemberPayload<ExtArgs>, T, 'upsert', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Count the number of BarMembers.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {BarMemberCountArgs} args - Arguments to filter BarMembers to count.
   * @example
   * // Count the number of BarMembers
   * const count = await prisma.barMember.count({
   *   where: {
   *     // ... the filter for the BarMembers we want to count
   *   }
   * })
   **/
  count<T extends BarMemberCountArgs>(
    args?: Prisma.Subset<T, BarMemberCountArgs>,
  ): Prisma.PrismaPromise<
    T extends runtime.Types.Utils.Record<'select', any>
      ? T['select'] extends true
        ? number
        : Prisma.GetScalarType<T['select'], BarMemberCountAggregateOutputType>
      : number
  >;

  /**
   * Allows you to perform aggregations operations on a BarMember.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {BarMemberAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
  aggregate<T extends BarMemberAggregateArgs>(
    args: Prisma.Subset<T, BarMemberAggregateArgs>,
  ): Prisma.PrismaPromise<GetBarMemberAggregateType<T>>;

  /**
   * Group by BarMember.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {BarMemberGroupByArgs} args - Group by arguments.
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
    T extends BarMemberGroupByArgs,
    HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>,
    OrderByArg extends Prisma.True extends HasSelectOrTake
      ? { orderBy: BarMemberGroupByArgs['orderBy'] }
      : { orderBy?: BarMemberGroupByArgs['orderBy'] },
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
    args: Prisma.SubsetIntersection<T, BarMemberGroupByArgs, OrderByArg> & InputErrors,
  ): {} extends InputErrors ? GetBarMemberGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
  /**
   * Fields of the BarMember model
   */
  readonly fields: BarMemberFieldRefs;
}

/**
 * The delegate class that acts as a "Promise-like" for BarMember.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__BarMemberClient<
  T,
  Null = never,
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> extends Prisma.PrismaPromise<T> {
  readonly [Symbol.toStringTag]: 'PrismaPromise';
  user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>,
  ): Prisma.Prisma__UserClient<
    runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions> | Null,
    Null,
    ExtArgs,
    GlobalOmitOptions
  >;
  bar<T extends Prisma.BarDefaultArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.BarDefaultArgs<ExtArgs>>,
  ): Prisma.Prisma__BarClient<
    runtime.Types.Result.GetResult<Prisma.$BarPayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions> | Null,
    Null,
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
 * Fields of the BarMember model
 */
export interface BarMemberFieldRefs {
  readonly id: Prisma.FieldRef<'BarMember', 'String'>;
  readonly userId: Prisma.FieldRef<'BarMember', 'String'>;
  readonly barId: Prisma.FieldRef<'BarMember', 'String'>;
  readonly role: Prisma.FieldRef<'BarMember', 'BarRole'>;
  readonly active: Prisma.FieldRef<'BarMember', 'Boolean'>;
  readonly createdAt: Prisma.FieldRef<'BarMember', 'DateTime'>;
  readonly updatedAt: Prisma.FieldRef<'BarMember', 'DateTime'>;
}

// Custom InputTypes
/**
 * BarMember findUnique
 */
export type BarMemberFindUniqueArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * Filter, which BarMember to fetch.
   */
  where: Prisma.BarMemberWhereUniqueInput;
};

/**
 * BarMember findUniqueOrThrow
 */
export type BarMemberFindUniqueOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * Filter, which BarMember to fetch.
   */
  where: Prisma.BarMemberWhereUniqueInput;
};

/**
 * BarMember findFirst
 */
export type BarMemberFindFirstArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * Filter, which BarMember to fetch.
   */
  where?: Prisma.BarMemberWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of BarMembers to fetch.
   */
  orderBy?: Prisma.BarMemberOrderByWithRelationInput | Prisma.BarMemberOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for BarMembers.
   */
  cursor?: Prisma.BarMemberWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` BarMembers from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` BarMembers.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of BarMembers.
   */
  distinct?: Prisma.BarMemberScalarFieldEnum | Prisma.BarMemberScalarFieldEnum[];
};

/**
 * BarMember findFirstOrThrow
 */
export type BarMemberFindFirstOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * Filter, which BarMember to fetch.
   */
  where?: Prisma.BarMemberWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of BarMembers to fetch.
   */
  orderBy?: Prisma.BarMemberOrderByWithRelationInput | Prisma.BarMemberOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for BarMembers.
   */
  cursor?: Prisma.BarMemberWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` BarMembers from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` BarMembers.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of BarMembers.
   */
  distinct?: Prisma.BarMemberScalarFieldEnum | Prisma.BarMemberScalarFieldEnum[];
};

/**
 * BarMember findMany
 */
export type BarMemberFindManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * Filter, which BarMembers to fetch.
   */
  where?: Prisma.BarMemberWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of BarMembers to fetch.
   */
  orderBy?: Prisma.BarMemberOrderByWithRelationInput | Prisma.BarMemberOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for listing BarMembers.
   */
  cursor?: Prisma.BarMemberWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` BarMembers from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` BarMembers.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of BarMembers.
   */
  distinct?: Prisma.BarMemberScalarFieldEnum | Prisma.BarMemberScalarFieldEnum[];
};

/**
 * BarMember create
 */
export type BarMemberCreateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * The data needed to create a BarMember.
   */
  data: Prisma.XOR<Prisma.BarMemberCreateInput, Prisma.BarMemberUncheckedCreateInput>;
};

/**
 * BarMember createMany
 */
export type BarMemberCreateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to create many BarMembers.
   */
  data: Prisma.BarMemberCreateManyInput | Prisma.BarMemberCreateManyInput[];
  skipDuplicates?: boolean;
};

/**
 * BarMember createManyAndReturn
 */
export type BarMemberCreateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelectCreateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * The data used to create many BarMembers.
   */
  data: Prisma.BarMemberCreateManyInput | Prisma.BarMemberCreateManyInput[];
  skipDuplicates?: boolean;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberIncludeCreateManyAndReturn<ExtArgs> | null;
};

/**
 * BarMember update
 */
export type BarMemberUpdateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * The data needed to update a BarMember.
   */
  data: Prisma.XOR<Prisma.BarMemberUpdateInput, Prisma.BarMemberUncheckedUpdateInput>;
  /**
   * Choose, which BarMember to update.
   */
  where: Prisma.BarMemberWhereUniqueInput;
};

/**
 * BarMember updateMany
 */
export type BarMemberUpdateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to update BarMembers.
   */
  data: Prisma.XOR<Prisma.BarMemberUpdateManyMutationInput, Prisma.BarMemberUncheckedUpdateManyInput>;
  /**
   * Filter which BarMembers to update
   */
  where?: Prisma.BarMemberWhereInput;
  /**
   * Limit how many BarMembers to update.
   */
  limit?: number;
};

/**
 * BarMember updateManyAndReturn
 */
export type BarMemberUpdateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelectUpdateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * The data used to update BarMembers.
   */
  data: Prisma.XOR<Prisma.BarMemberUpdateManyMutationInput, Prisma.BarMemberUncheckedUpdateManyInput>;
  /**
   * Filter which BarMembers to update
   */
  where?: Prisma.BarMemberWhereInput;
  /**
   * Limit how many BarMembers to update.
   */
  limit?: number;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberIncludeUpdateManyAndReturn<ExtArgs> | null;
};

/**
 * BarMember upsert
 */
export type BarMemberUpsertArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * The filter to search for the BarMember to update in case it exists.
   */
  where: Prisma.BarMemberWhereUniqueInput;
  /**
   * In case the BarMember found by the `where` argument doesn't exist, create a new BarMember with this data.
   */
  create: Prisma.XOR<Prisma.BarMemberCreateInput, Prisma.BarMemberUncheckedCreateInput>;
  /**
   * In case the BarMember was found with the provided `where` argument, update it with this data.
   */
  update: Prisma.XOR<Prisma.BarMemberUpdateInput, Prisma.BarMemberUncheckedUpdateInput>;
};

/**
 * BarMember delete
 */
export type BarMemberDeleteArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
  /**
   * Filter which BarMember to delete.
   */
  where: Prisma.BarMemberWhereUniqueInput;
};

/**
 * BarMember deleteMany
 */
export type BarMemberDeleteManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which BarMembers to delete
   */
  where?: Prisma.BarMemberWhereInput;
  /**
   * Limit how many BarMembers to delete.
   */
  limit?: number;
};

/**
 * BarMember without action
 */
export type BarMemberDefaultArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the BarMember
   */
  select?: Prisma.BarMemberSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the BarMember
   */
  omit?: Prisma.BarMemberOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.BarMemberInclude<ExtArgs> | null;
};
