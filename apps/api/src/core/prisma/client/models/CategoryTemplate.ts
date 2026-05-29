import type * as runtime from '@prisma/client/runtime/client';
import type * as $Enums from '../enums.js';
import type * as Prisma from '../internal/prismaNamespace.js';

/**
 * Model CategoryTemplate
 *
 */
export type CategoryTemplateModel = runtime.Types.Result.DefaultSelection<Prisma.$CategoryTemplatePayload>;

export type AggregateCategoryTemplate = {
  _count: CategoryTemplateCountAggregateOutputType | null;
  _min: CategoryTemplateMinAggregateOutputType | null;
  _max: CategoryTemplateMaxAggregateOutputType | null;
};

export type CategoryTemplateMinAggregateOutputType = {
  id: string | null;
  name: string | null;
  icon: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CategoryTemplateMaxAggregateOutputType = {
  id: string | null;
  name: string | null;
  icon: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CategoryTemplateCountAggregateOutputType = {
  id: number;
  name: number;
  icon: number;
  createdAt: number;
  updatedAt: number;
  _all: number;
};

export type CategoryTemplateMinAggregateInputType = {
  id?: true;
  name?: true;
  icon?: true;
  createdAt?: true;
  updatedAt?: true;
};

export type CategoryTemplateMaxAggregateInputType = {
  id?: true;
  name?: true;
  icon?: true;
  createdAt?: true;
  updatedAt?: true;
};

export type CategoryTemplateCountAggregateInputType = {
  id?: true;
  name?: true;
  icon?: true;
  createdAt?: true;
  updatedAt?: true;
  _all?: true;
};

export type CategoryTemplateAggregateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which CategoryTemplate to aggregate.
   */
  where?: Prisma.CategoryTemplateWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of CategoryTemplates to fetch.
   */
  orderBy?: Prisma.CategoryTemplateOrderByWithRelationInput | Prisma.CategoryTemplateOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the start position
   */
  cursor?: Prisma.CategoryTemplateWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` CategoryTemplates from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` CategoryTemplates.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Count returned CategoryTemplates
   **/
  _count?: true | CategoryTemplateCountAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the minimum value
   **/
  _min?: CategoryTemplateMinAggregateInputType;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
   *
   * Select which fields to find the maximum value
   **/
  _max?: CategoryTemplateMaxAggregateInputType;
};

export type GetCategoryTemplateAggregateType<T extends CategoryTemplateAggregateArgs> = {
  [P in keyof T & keyof AggregateCategoryTemplate]: P extends '_count' | 'count'
    ? T[P] extends true
      ? number
      : Prisma.GetScalarType<T[P], AggregateCategoryTemplate[P]>
    : Prisma.GetScalarType<T[P], AggregateCategoryTemplate[P]>;
};

export type CategoryTemplateGroupByArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  where?: Prisma.CategoryTemplateWhereInput;
  orderBy?: Prisma.CategoryTemplateOrderByWithAggregationInput | Prisma.CategoryTemplateOrderByWithAggregationInput[];
  by: Prisma.CategoryTemplateScalarFieldEnum[] | Prisma.CategoryTemplateScalarFieldEnum;
  having?: Prisma.CategoryTemplateScalarWhereWithAggregatesInput;
  take?: number;
  skip?: number;
  _count?: CategoryTemplateCountAggregateInputType | true;
  _min?: CategoryTemplateMinAggregateInputType;
  _max?: CategoryTemplateMaxAggregateInputType;
};

export type CategoryTemplateGroupByOutputType = {
  id: string;
  name: string;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: CategoryTemplateCountAggregateOutputType | null;
  _min: CategoryTemplateMinAggregateOutputType | null;
  _max: CategoryTemplateMaxAggregateOutputType | null;
};

export type GetCategoryTemplateGroupByPayload<T extends CategoryTemplateGroupByArgs> = Prisma.PrismaPromise<
  Array<
    Prisma.PickEnumerable<CategoryTemplateGroupByOutputType, T['by']> & {
      [P in keyof T & keyof CategoryTemplateGroupByOutputType]: P extends '_count'
        ? T[P] extends boolean
          ? number
          : Prisma.GetScalarType<T[P], CategoryTemplateGroupByOutputType[P]>
        : Prisma.GetScalarType<T[P], CategoryTemplateGroupByOutputType[P]>;
    }
  >
>;

export type CategoryTemplateWhereInput = {
  AND?: Prisma.CategoryTemplateWhereInput | Prisma.CategoryTemplateWhereInput[];
  OR?: Prisma.CategoryTemplateWhereInput[];
  NOT?: Prisma.CategoryTemplateWhereInput | Prisma.CategoryTemplateWhereInput[];
  id?: Prisma.StringFilter<'CategoryTemplate'> | string;
  name?: Prisma.StringFilter<'CategoryTemplate'> | string;
  icon?: Prisma.StringNullableFilter<'CategoryTemplate'> | string | null;
  createdAt?: Prisma.DateTimeFilter<'CategoryTemplate'> | Date | string;
  updatedAt?: Prisma.DateTimeFilter<'CategoryTemplate'> | Date | string;
  products?: Prisma.ProductTemplateListRelationFilter;
};

export type CategoryTemplateOrderByWithRelationInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  icon?: Prisma.SortOrderInput | Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
  products?: Prisma.ProductTemplateOrderByRelationAggregateInput;
};

export type CategoryTemplateWhereUniqueInput = Prisma.AtLeast<
  {
    id?: string;
    AND?: Prisma.CategoryTemplateWhereInput | Prisma.CategoryTemplateWhereInput[];
    OR?: Prisma.CategoryTemplateWhereInput[];
    NOT?: Prisma.CategoryTemplateWhereInput | Prisma.CategoryTemplateWhereInput[];
    name?: Prisma.StringFilter<'CategoryTemplate'> | string;
    icon?: Prisma.StringNullableFilter<'CategoryTemplate'> | string | null;
    createdAt?: Prisma.DateTimeFilter<'CategoryTemplate'> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<'CategoryTemplate'> | Date | string;
    products?: Prisma.ProductTemplateListRelationFilter;
  },
  'id'
>;

export type CategoryTemplateOrderByWithAggregationInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  icon?: Prisma.SortOrderInput | Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
  _count?: Prisma.CategoryTemplateCountOrderByAggregateInput;
  _max?: Prisma.CategoryTemplateMaxOrderByAggregateInput;
  _min?: Prisma.CategoryTemplateMinOrderByAggregateInput;
};

export type CategoryTemplateScalarWhereWithAggregatesInput = {
  AND?: Prisma.CategoryTemplateScalarWhereWithAggregatesInput | Prisma.CategoryTemplateScalarWhereWithAggregatesInput[];
  OR?: Prisma.CategoryTemplateScalarWhereWithAggregatesInput[];
  NOT?: Prisma.CategoryTemplateScalarWhereWithAggregatesInput | Prisma.CategoryTemplateScalarWhereWithAggregatesInput[];
  id?: Prisma.StringWithAggregatesFilter<'CategoryTemplate'> | string;
  name?: Prisma.StringWithAggregatesFilter<'CategoryTemplate'> | string;
  icon?: Prisma.StringNullableWithAggregatesFilter<'CategoryTemplate'> | string | null;
  createdAt?: Prisma.DateTimeWithAggregatesFilter<'CategoryTemplate'> | Date | string;
  updatedAt?: Prisma.DateTimeWithAggregatesFilter<'CategoryTemplate'> | Date | string;
};

export type CategoryTemplateCreateInput = {
  id?: string;
  name: string;
  icon?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  products?: Prisma.ProductTemplateCreateNestedManyWithoutCategoryInput;
};

export type CategoryTemplateUncheckedCreateInput = {
  id?: string;
  name: string;
  icon?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  products?: Prisma.ProductTemplateUncheckedCreateNestedManyWithoutCategoryInput;
};

export type CategoryTemplateUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  icon?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  products?: Prisma.ProductTemplateUpdateManyWithoutCategoryNestedInput;
};

export type CategoryTemplateUncheckedUpdateInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  icon?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  products?: Prisma.ProductTemplateUncheckedUpdateManyWithoutCategoryNestedInput;
};

export type CategoryTemplateCreateManyInput = {
  id?: string;
  name: string;
  icon?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type CategoryTemplateUpdateManyMutationInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  icon?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type CategoryTemplateUncheckedUpdateManyInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  icon?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type CategoryTemplateCountOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  icon?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type CategoryTemplateMaxOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  icon?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type CategoryTemplateMinOrderByAggregateInput = {
  id?: Prisma.SortOrder;
  name?: Prisma.SortOrder;
  icon?: Prisma.SortOrder;
  createdAt?: Prisma.SortOrder;
  updatedAt?: Prisma.SortOrder;
};

export type CategoryTemplateScalarRelationFilter = {
  is?: Prisma.CategoryTemplateWhereInput;
  isNot?: Prisma.CategoryTemplateWhereInput;
};

export type CategoryTemplateCreateNestedOneWithoutProductsInput = {
  create?: Prisma.XOR<
    Prisma.CategoryTemplateCreateWithoutProductsInput,
    Prisma.CategoryTemplateUncheckedCreateWithoutProductsInput
  >;
  connectOrCreate?: Prisma.CategoryTemplateCreateOrConnectWithoutProductsInput;
  connect?: Prisma.CategoryTemplateWhereUniqueInput;
};

export type CategoryTemplateUpdateOneRequiredWithoutProductsNestedInput = {
  create?: Prisma.XOR<
    Prisma.CategoryTemplateCreateWithoutProductsInput,
    Prisma.CategoryTemplateUncheckedCreateWithoutProductsInput
  >;
  connectOrCreate?: Prisma.CategoryTemplateCreateOrConnectWithoutProductsInput;
  upsert?: Prisma.CategoryTemplateUpsertWithoutProductsInput;
  connect?: Prisma.CategoryTemplateWhereUniqueInput;
  update?: Prisma.XOR<
    Prisma.XOR<
      Prisma.CategoryTemplateUpdateToOneWithWhereWithoutProductsInput,
      Prisma.CategoryTemplateUpdateWithoutProductsInput
    >,
    Prisma.CategoryTemplateUncheckedUpdateWithoutProductsInput
  >;
};

export type CategoryTemplateCreateWithoutProductsInput = {
  id?: string;
  name: string;
  icon?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type CategoryTemplateUncheckedCreateWithoutProductsInput = {
  id?: string;
  name: string;
  icon?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type CategoryTemplateCreateOrConnectWithoutProductsInput = {
  where: Prisma.CategoryTemplateWhereUniqueInput;
  create: Prisma.XOR<
    Prisma.CategoryTemplateCreateWithoutProductsInput,
    Prisma.CategoryTemplateUncheckedCreateWithoutProductsInput
  >;
};

export type CategoryTemplateUpsertWithoutProductsInput = {
  update: Prisma.XOR<
    Prisma.CategoryTemplateUpdateWithoutProductsInput,
    Prisma.CategoryTemplateUncheckedUpdateWithoutProductsInput
  >;
  create: Prisma.XOR<
    Prisma.CategoryTemplateCreateWithoutProductsInput,
    Prisma.CategoryTemplateUncheckedCreateWithoutProductsInput
  >;
  where?: Prisma.CategoryTemplateWhereInput;
};

export type CategoryTemplateUpdateToOneWithWhereWithoutProductsInput = {
  where?: Prisma.CategoryTemplateWhereInput;
  data: Prisma.XOR<
    Prisma.CategoryTemplateUpdateWithoutProductsInput,
    Prisma.CategoryTemplateUncheckedUpdateWithoutProductsInput
  >;
};

export type CategoryTemplateUpdateWithoutProductsInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  icon?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

export type CategoryTemplateUncheckedUpdateWithoutProductsInput = {
  id?: Prisma.StringFieldUpdateOperationsInput | string;
  name?: Prisma.StringFieldUpdateOperationsInput | string;
  icon?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
  createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
  updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};

/**
 * Count Type CategoryTemplateCountOutputType
 */

export type CategoryTemplateCountOutputType = {
  products: number;
};

export type CategoryTemplateCountOutputTypeSelect<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  products?: boolean | CategoryTemplateCountOutputTypeCountProductsArgs;
};

/**
 * CategoryTemplateCountOutputType without action
 */
export type CategoryTemplateCountOutputTypeDefaultArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplateCountOutputType
   */
  select?: Prisma.CategoryTemplateCountOutputTypeSelect<ExtArgs> | null;
};

/**
 * CategoryTemplateCountOutputType without action
 */
export type CategoryTemplateCountOutputTypeCountProductsArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  where?: Prisma.ProductTemplateWhereInput;
};

export type CategoryTemplateSelect<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    name?: boolean;
    icon?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    products?: boolean | Prisma.CategoryTemplate$productsArgs<ExtArgs>;
    _count?: boolean | Prisma.CategoryTemplateCountOutputTypeDefaultArgs<ExtArgs>;
  },
  ExtArgs['result']['categoryTemplate']
>;

export type CategoryTemplateSelectCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    name?: boolean;
    icon?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  },
  ExtArgs['result']['categoryTemplate']
>;

export type CategoryTemplateSelectUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetSelect<
  {
    id?: boolean;
    name?: boolean;
    icon?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  },
  ExtArgs['result']['categoryTemplate']
>;

export type CategoryTemplateSelectScalar = {
  id?: boolean;
  name?: boolean;
  icon?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
};

export type CategoryTemplateOmit<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = runtime.Types.Extensions.GetOmit<
  'id' | 'name' | 'icon' | 'createdAt' | 'updatedAt',
  ExtArgs['result']['categoryTemplate']
>;
export type CategoryTemplateInclude<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  products?: boolean | Prisma.CategoryTemplate$productsArgs<ExtArgs>;
  _count?: boolean | Prisma.CategoryTemplateCountOutputTypeDefaultArgs<ExtArgs>;
};
export type CategoryTemplateIncludeCreateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {};
export type CategoryTemplateIncludeUpdateManyAndReturn<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {};

export type $CategoryTemplatePayload<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  name: 'CategoryTemplate';
  objects: {
    products: Prisma.$ProductTemplatePayload<ExtArgs>[];
  };
  scalars: runtime.Types.Extensions.GetPayloadResult<
    {
      id: string;
      name: string;
      icon: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    ExtArgs['result']['categoryTemplate']
  >;
  composites: {};
};

export type CategoryTemplateGetPayload<S extends boolean | null | undefined | CategoryTemplateDefaultArgs> =
  runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload, S>;

export type CategoryTemplateCountArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = Omit<CategoryTemplateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
  select?: CategoryTemplateCountAggregateInputType | true;
};

export interface CategoryTemplateDelegate<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CategoryTemplate']; meta: { name: 'CategoryTemplate' } };
  /**
   * Find zero or one CategoryTemplate that matches the filter.
   * @param {CategoryTemplateFindUniqueArgs} args - Arguments to find a CategoryTemplate
   * @example
   * // Get one CategoryTemplate
   * const categoryTemplate = await prisma.categoryTemplate.findUnique({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUnique<T extends CategoryTemplateFindUniqueArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateFindUniqueArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'findUnique', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find one CategoryTemplate that matches the filter or throw an error with `error.code='P2025'`
   * if no matches were found.
   * @param {CategoryTemplateFindUniqueOrThrowArgs} args - Arguments to find a CategoryTemplate
   * @example
   * // Get one CategoryTemplate
   * const categoryTemplate = await prisma.categoryTemplate.findUniqueOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findUniqueOrThrow<T extends CategoryTemplateFindUniqueOrThrowArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateFindUniqueOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'findUniqueOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first CategoryTemplate that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {CategoryTemplateFindFirstArgs} args - Arguments to find a CategoryTemplate
   * @example
   * // Get one CategoryTemplate
   * const categoryTemplate = await prisma.categoryTemplate.findFirst({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirst<T extends CategoryTemplateFindFirstArgs>(
    args?: Prisma.SelectSubset<T, CategoryTemplateFindFirstArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'findFirst', GlobalOmitOptions> | null,
    null,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find the first CategoryTemplate that matches the filter or
   * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {CategoryTemplateFindFirstOrThrowArgs} args - Arguments to find a CategoryTemplate
   * @example
   * // Get one CategoryTemplate
   * const categoryTemplate = await prisma.categoryTemplate.findFirstOrThrow({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   */
  findFirstOrThrow<T extends CategoryTemplateFindFirstOrThrowArgs>(
    args?: Prisma.SelectSubset<T, CategoryTemplateFindFirstOrThrowArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'findFirstOrThrow', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Find zero or more CategoryTemplates that matches the filter.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {CategoryTemplateFindManyArgs} args - Arguments to filter and select certain fields only.
   * @example
   * // Get all CategoryTemplates
   * const categoryTemplates = await prisma.categoryTemplate.findMany()
   *
   * // Get first 10 CategoryTemplates
   * const categoryTemplates = await prisma.categoryTemplate.findMany({ take: 10 })
   *
   * // Only select the `id`
   * const categoryTemplateWithIdOnly = await prisma.categoryTemplate.findMany({ select: { id: true } })
   *
   */
  findMany<T extends CategoryTemplateFindManyArgs>(
    args?: Prisma.SelectSubset<T, CategoryTemplateFindManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'findMany', GlobalOmitOptions>
  >;

  /**
   * Create a CategoryTemplate.
   * @param {CategoryTemplateCreateArgs} args - Arguments to create a CategoryTemplate.
   * @example
   * // Create one CategoryTemplate
   * const CategoryTemplate = await prisma.categoryTemplate.create({
   *   data: {
   *     // ... data to create a CategoryTemplate
   *   }
   * })
   *
   */
  create<T extends CategoryTemplateCreateArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateCreateArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'create', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Create many CategoryTemplates.
   * @param {CategoryTemplateCreateManyArgs} args - Arguments to create many CategoryTemplates.
   * @example
   * // Create many CategoryTemplates
   * const categoryTemplate = await prisma.categoryTemplate.createMany({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   */
  createMany<T extends CategoryTemplateCreateManyArgs>(
    args?: Prisma.SelectSubset<T, CategoryTemplateCreateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Create many CategoryTemplates and returns the data saved in the database.
   * @param {CategoryTemplateCreateManyAndReturnArgs} args - Arguments to create many CategoryTemplates.
   * @example
   * // Create many CategoryTemplates
   * const categoryTemplate = await prisma.categoryTemplate.createManyAndReturn({
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Create many CategoryTemplates and only return the `id`
   * const categoryTemplateWithIdOnly = await prisma.categoryTemplate.createManyAndReturn({
   *   select: { id: true },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   *
   */
  createManyAndReturn<T extends CategoryTemplateCreateManyAndReturnArgs>(
    args?: Prisma.SelectSubset<T, CategoryTemplateCreateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<
      Prisma.$CategoryTemplatePayload<ExtArgs>,
      T,
      'createManyAndReturn',
      GlobalOmitOptions
    >
  >;

  /**
   * Delete a CategoryTemplate.
   * @param {CategoryTemplateDeleteArgs} args - Arguments to delete one CategoryTemplate.
   * @example
   * // Delete one CategoryTemplate
   * const CategoryTemplate = await prisma.categoryTemplate.delete({
   *   where: {
   *     // ... filter to delete one CategoryTemplate
   *   }
   * })
   *
   */
  delete<T extends CategoryTemplateDeleteArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateDeleteArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'delete', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Update one CategoryTemplate.
   * @param {CategoryTemplateUpdateArgs} args - Arguments to update one CategoryTemplate.
   * @example
   * // Update one CategoryTemplate
   * const categoryTemplate = await prisma.categoryTemplate.update({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  update<T extends CategoryTemplateUpdateArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateUpdateArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'update', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Delete zero or more CategoryTemplates.
   * @param {CategoryTemplateDeleteManyArgs} args - Arguments to filter CategoryTemplates to delete.
   * @example
   * // Delete a few CategoryTemplates
   * const { count } = await prisma.categoryTemplate.deleteMany({
   *   where: {
   *     // ... provide filter here
   *   }
   * })
   *
   */
  deleteMany<T extends CategoryTemplateDeleteManyArgs>(
    args?: Prisma.SelectSubset<T, CategoryTemplateDeleteManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more CategoryTemplates.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {CategoryTemplateUpdateManyArgs} args - Arguments to update one or more rows.
   * @example
   * // Update many CategoryTemplates
   * const categoryTemplate = await prisma.categoryTemplate.updateMany({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: {
   *     // ... provide data here
   *   }
   * })
   *
   */
  updateMany<T extends CategoryTemplateUpdateManyArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateUpdateManyArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<Prisma.BatchPayload>;

  /**
   * Update zero or more CategoryTemplates and returns the data updated in the database.
   * @param {CategoryTemplateUpdateManyAndReturnArgs} args - Arguments to update many CategoryTemplates.
   * @example
   * // Update many CategoryTemplates
   * const categoryTemplate = await prisma.categoryTemplate.updateManyAndReturn({
   *   where: {
   *     // ... provide filter here
   *   },
   *   data: [
   *     // ... provide data here
   *   ]
   * })
   *
   * // Update zero or more CategoryTemplates and only return the `id`
   * const categoryTemplateWithIdOnly = await prisma.categoryTemplate.updateManyAndReturn({
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
  updateManyAndReturn<T extends CategoryTemplateUpdateManyAndReturnArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateUpdateManyAndReturnArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<
      Prisma.$CategoryTemplatePayload<ExtArgs>,
      T,
      'updateManyAndReturn',
      GlobalOmitOptions
    >
  >;

  /**
   * Create or update one CategoryTemplate.
   * @param {CategoryTemplateUpsertArgs} args - Arguments to update or create a CategoryTemplate.
   * @example
   * // Update or create a CategoryTemplate
   * const categoryTemplate = await prisma.categoryTemplate.upsert({
   *   create: {
   *     // ... data to create a CategoryTemplate
   *   },
   *   update: {
   *     // ... in case it already exists, update
   *   },
   *   where: {
   *     // ... the filter for the CategoryTemplate we want to update
   *   }
   * })
   */
  upsert<T extends CategoryTemplateUpsertArgs>(
    args: Prisma.SelectSubset<T, CategoryTemplateUpsertArgs<ExtArgs>>,
  ): Prisma.Prisma__CategoryTemplateClient<
    runtime.Types.Result.GetResult<Prisma.$CategoryTemplatePayload<ExtArgs>, T, 'upsert', GlobalOmitOptions>,
    never,
    ExtArgs,
    GlobalOmitOptions
  >;

  /**
   * Count the number of CategoryTemplates.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {CategoryTemplateCountArgs} args - Arguments to filter CategoryTemplates to count.
   * @example
   * // Count the number of CategoryTemplates
   * const count = await prisma.categoryTemplate.count({
   *   where: {
   *     // ... the filter for the CategoryTemplates we want to count
   *   }
   * })
   **/
  count<T extends CategoryTemplateCountArgs>(
    args?: Prisma.Subset<T, CategoryTemplateCountArgs>,
  ): Prisma.PrismaPromise<
    T extends runtime.Types.Utils.Record<'select', any>
      ? T['select'] extends true
        ? number
        : Prisma.GetScalarType<T['select'], CategoryTemplateCountAggregateOutputType>
      : number
  >;

  /**
   * Allows you to perform aggregations operations on a CategoryTemplate.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {CategoryTemplateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
  aggregate<T extends CategoryTemplateAggregateArgs>(
    args: Prisma.Subset<T, CategoryTemplateAggregateArgs>,
  ): Prisma.PrismaPromise<GetCategoryTemplateAggregateType<T>>;

  /**
   * Group by CategoryTemplate.
   * Note, that providing `undefined` is treated as the value not being there.
   * Read more here: https://pris.ly/d/null-undefined
   * @param {CategoryTemplateGroupByArgs} args - Group by arguments.
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
    T extends CategoryTemplateGroupByArgs,
    HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>,
    OrderByArg extends Prisma.True extends HasSelectOrTake
      ? { orderBy: CategoryTemplateGroupByArgs['orderBy'] }
      : { orderBy?: CategoryTemplateGroupByArgs['orderBy'] },
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
    args: Prisma.SubsetIntersection<T, CategoryTemplateGroupByArgs, OrderByArg> & InputErrors,
  ): {} extends InputErrors ? GetCategoryTemplateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
  /**
   * Fields of the CategoryTemplate model
   */
  readonly fields: CategoryTemplateFieldRefs;
}

/**
 * The delegate class that acts as a "Promise-like" for CategoryTemplate.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__CategoryTemplateClient<
  T,
  Null = never,
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
  GlobalOmitOptions = {},
> extends Prisma.PrismaPromise<T> {
  readonly [Symbol.toStringTag]: 'PrismaPromise';
  products<T extends Prisma.CategoryTemplate$productsArgs<ExtArgs> = {}>(
    args?: Prisma.Subset<T, Prisma.CategoryTemplate$productsArgs<ExtArgs>>,
  ): Prisma.PrismaPromise<
    runtime.Types.Result.GetResult<Prisma.$ProductTemplatePayload<ExtArgs>, T, 'findMany', GlobalOmitOptions> | Null
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
 * Fields of the CategoryTemplate model
 */
export interface CategoryTemplateFieldRefs {
  readonly id: Prisma.FieldRef<'CategoryTemplate', 'String'>;
  readonly name: Prisma.FieldRef<'CategoryTemplate', 'String'>;
  readonly icon: Prisma.FieldRef<'CategoryTemplate', 'String'>;
  readonly createdAt: Prisma.FieldRef<'CategoryTemplate', 'DateTime'>;
  readonly updatedAt: Prisma.FieldRef<'CategoryTemplate', 'DateTime'>;
}

// Custom InputTypes
/**
 * CategoryTemplate findUnique
 */
export type CategoryTemplateFindUniqueArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * Filter, which CategoryTemplate to fetch.
   */
  where: Prisma.CategoryTemplateWhereUniqueInput;
};

/**
 * CategoryTemplate findUniqueOrThrow
 */
export type CategoryTemplateFindUniqueOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * Filter, which CategoryTemplate to fetch.
   */
  where: Prisma.CategoryTemplateWhereUniqueInput;
};

/**
 * CategoryTemplate findFirst
 */
export type CategoryTemplateFindFirstArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * Filter, which CategoryTemplate to fetch.
   */
  where?: Prisma.CategoryTemplateWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of CategoryTemplates to fetch.
   */
  orderBy?: Prisma.CategoryTemplateOrderByWithRelationInput | Prisma.CategoryTemplateOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for CategoryTemplates.
   */
  cursor?: Prisma.CategoryTemplateWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` CategoryTemplates from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` CategoryTemplates.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of CategoryTemplates.
   */
  distinct?: Prisma.CategoryTemplateScalarFieldEnum | Prisma.CategoryTemplateScalarFieldEnum[];
};

/**
 * CategoryTemplate findFirstOrThrow
 */
export type CategoryTemplateFindFirstOrThrowArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * Filter, which CategoryTemplate to fetch.
   */
  where?: Prisma.CategoryTemplateWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of CategoryTemplates to fetch.
   */
  orderBy?: Prisma.CategoryTemplateOrderByWithRelationInput | Prisma.CategoryTemplateOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for searching for CategoryTemplates.
   */
  cursor?: Prisma.CategoryTemplateWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` CategoryTemplates from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` CategoryTemplates.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of CategoryTemplates.
   */
  distinct?: Prisma.CategoryTemplateScalarFieldEnum | Prisma.CategoryTemplateScalarFieldEnum[];
};

/**
 * CategoryTemplate findMany
 */
export type CategoryTemplateFindManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * Filter, which CategoryTemplates to fetch.
   */
  where?: Prisma.CategoryTemplateWhereInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
   *
   * Determine the order of CategoryTemplates to fetch.
   */
  orderBy?: Prisma.CategoryTemplateOrderByWithRelationInput | Prisma.CategoryTemplateOrderByWithRelationInput[];
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
   *
   * Sets the position for listing CategoryTemplates.
   */
  cursor?: Prisma.CategoryTemplateWhereUniqueInput;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Take `±n` CategoryTemplates from the position of the cursor.
   */
  take?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
   *
   * Skip the first `n` CategoryTemplates.
   */
  skip?: number;
  /**
   * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
   *
   * Filter by unique combinations of CategoryTemplates.
   */
  distinct?: Prisma.CategoryTemplateScalarFieldEnum | Prisma.CategoryTemplateScalarFieldEnum[];
};

/**
 * CategoryTemplate create
 */
export type CategoryTemplateCreateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * The data needed to create a CategoryTemplate.
   */
  data: Prisma.XOR<Prisma.CategoryTemplateCreateInput, Prisma.CategoryTemplateUncheckedCreateInput>;
};

/**
 * CategoryTemplate createMany
 */
export type CategoryTemplateCreateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to create many CategoryTemplates.
   */
  data: Prisma.CategoryTemplateCreateManyInput | Prisma.CategoryTemplateCreateManyInput[];
  skipDuplicates?: boolean;
};

/**
 * CategoryTemplate createManyAndReturn
 */
export type CategoryTemplateCreateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelectCreateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * The data used to create many CategoryTemplates.
   */
  data: Prisma.CategoryTemplateCreateManyInput | Prisma.CategoryTemplateCreateManyInput[];
  skipDuplicates?: boolean;
};

/**
 * CategoryTemplate update
 */
export type CategoryTemplateUpdateArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * The data needed to update a CategoryTemplate.
   */
  data: Prisma.XOR<Prisma.CategoryTemplateUpdateInput, Prisma.CategoryTemplateUncheckedUpdateInput>;
  /**
   * Choose, which CategoryTemplate to update.
   */
  where: Prisma.CategoryTemplateWhereUniqueInput;
};

/**
 * CategoryTemplate updateMany
 */
export type CategoryTemplateUpdateManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * The data used to update CategoryTemplates.
   */
  data: Prisma.XOR<Prisma.CategoryTemplateUpdateManyMutationInput, Prisma.CategoryTemplateUncheckedUpdateManyInput>;
  /**
   * Filter which CategoryTemplates to update
   */
  where?: Prisma.CategoryTemplateWhereInput;
  /**
   * Limit how many CategoryTemplates to update.
   */
  limit?: number;
};

/**
 * CategoryTemplate updateManyAndReturn
 */
export type CategoryTemplateUpdateManyAndReturnArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelectUpdateManyAndReturn<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * The data used to update CategoryTemplates.
   */
  data: Prisma.XOR<Prisma.CategoryTemplateUpdateManyMutationInput, Prisma.CategoryTemplateUncheckedUpdateManyInput>;
  /**
   * Filter which CategoryTemplates to update
   */
  where?: Prisma.CategoryTemplateWhereInput;
  /**
   * Limit how many CategoryTemplates to update.
   */
  limit?: number;
};

/**
 * CategoryTemplate upsert
 */
export type CategoryTemplateUpsertArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * The filter to search for the CategoryTemplate to update in case it exists.
   */
  where: Prisma.CategoryTemplateWhereUniqueInput;
  /**
   * In case the CategoryTemplate found by the `where` argument doesn't exist, create a new CategoryTemplate with this data.
   */
  create: Prisma.XOR<Prisma.CategoryTemplateCreateInput, Prisma.CategoryTemplateUncheckedCreateInput>;
  /**
   * In case the CategoryTemplate was found with the provided `where` argument, update it with this data.
   */
  update: Prisma.XOR<Prisma.CategoryTemplateUpdateInput, Prisma.CategoryTemplateUncheckedUpdateInput>;
};

/**
 * CategoryTemplate delete
 */
export type CategoryTemplateDeleteArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
  /**
   * Filter which CategoryTemplate to delete.
   */
  where: Prisma.CategoryTemplateWhereUniqueInput;
};

/**
 * CategoryTemplate deleteMany
 */
export type CategoryTemplateDeleteManyArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Filter which CategoryTemplates to delete
   */
  where?: Prisma.CategoryTemplateWhereInput;
  /**
   * Limit how many CategoryTemplates to delete.
   */
  limit?: number;
};

/**
 * CategoryTemplate.products
 */
export type CategoryTemplate$productsArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the ProductTemplate
   */
  select?: Prisma.ProductTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the ProductTemplate
   */
  omit?: Prisma.ProductTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.ProductTemplateInclude<ExtArgs> | null;
  where?: Prisma.ProductTemplateWhereInput;
  orderBy?: Prisma.ProductTemplateOrderByWithRelationInput | Prisma.ProductTemplateOrderByWithRelationInput[];
  cursor?: Prisma.ProductTemplateWhereUniqueInput;
  take?: number;
  skip?: number;
  distinct?: Prisma.ProductTemplateScalarFieldEnum | Prisma.ProductTemplateScalarFieldEnum[];
};

/**
 * CategoryTemplate without action
 */
export type CategoryTemplateDefaultArgs<
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = {
  /**
   * Select specific fields to fetch from the CategoryTemplate
   */
  select?: Prisma.CategoryTemplateSelect<ExtArgs> | null;
  /**
   * Omit specific fields from the CategoryTemplate
   */
  omit?: Prisma.CategoryTemplateOmit<ExtArgs> | null;
  /**
   * Choose, which related nodes to fetch as well
   */
  include?: Prisma.CategoryTemplateInclude<ExtArgs> | null;
};
