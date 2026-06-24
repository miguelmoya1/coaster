import type { BarPermission, BarRole, Order, Product, Table } from '@coaster/common';
import { ForbiddenException, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { generateText, LanguageModel, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import {
  asBarRole,
  asOrderId,
  asOrderItemId,
  asProductId,
  asTableId,
  ErrorCodes,
  hasPermission,
  SecurityRepository,
} from '../../../core';
import { DbBarRole, DbRole } from '../../../core/db';
import {
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CancelOrderCommand,
  CheckoutOrderCommand,
  CreateOrderCommand,
} from '../../../orders/commands';
import { GetOrdersByBarIdQuery } from '../../../orders/queries';
import { GetProductsByBarIdQuery } from '../../../products/queries';
import { CreateTableCommand } from '../../../tables/commands';
import { GetTablesByBarIdQuery } from '../../../tables/queries';
import { ExecuteAiCommand } from '../impl/execute-ai.command';

@CommandHandler(ExecuteAiCommand)
export class ExecuteAiHandler implements ICommandHandler<ExecuteAiCommand, { text: string }> {
  readonly #logger = new Logger(ExecuteAiHandler.name);
  readonly #backupModels: LanguageModel[] = [
    'nvidia/nemotron-3-nano-30b-a3b',
    'openai/gpt-5-nano',
    'google/gemini-2.5-flash-lite',
    'nvidia/nemotron-nano-9b-v2',
  ];
  readonly #model: LanguageModel = 'google/gemini-2.5-flash';

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
    private readonly _securityRepository: SecurityRepository,
  ) {}

  async execute(command: ExecuteAiCommand): Promise<{ text: string }> {
    const { barId, prompt, user } = command;
    this.#logger.debug(`Executing AI command for user ${user.id} in bar ${barId}`);

    const userRole = await this._securityRepository.getUserRole(user.id);
    const isAdmin = userRole === DbRole.ADMIN;

    let userBarRole: BarRole = DbBarRole.OWNER; // owner default for admin
    if (!isAdmin) {
      const membership = await this._securityRepository.getBarMemberRole(user.id, barId);

      if (!membership || !membership.active) {
        throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
      }

      userBarRole = asBarRole(membership.role);
    }

    const tables = await this._queryBus.execute<GetTablesByBarIdQuery, Table[]>(new GetTablesByBarIdQuery(barId));
    const products = await this._queryBus.execute<GetProductsByBarIdQuery, Product[]>(
      new GetProductsByBarIdQuery(barId),
    );
    const openOrders = await this._queryBus.execute<GetOrdersByBarIdQuery, Order[]>(
      new GetOrdersByBarIdQuery(barId, 'OPEN'),
    );

    const productsList = products
      .map((p) => `- ${p.name}: ID=${p.id}, Price=${p.price / 100}€, Stock=${p.currentStock}`)
      .join('\n');

    const tablesList = tables.map((t) => `- ${t.name}: ID=${t.id}, Status=${t.status}`).join('\n');

    const ordersList = openOrders
      .map((o) => {
        const table = tables.find((t) => t.id === o.tableId);
        const tableName = table ? table.name : 'No table';
        const itemsStr = o.items
          .map((i) => {
            const product = products.find((p) => p.id === i.productId);
            const prodName = product ? product.name : 'Unknown';
            return `  * ${prodName} (x${i.quantity}): ItemID=${i.id}, Served=${i.servedQuantity}/${i.quantity}, Paid=${i.paidQuantity}/${i.quantity}`;
          })
          .join('\n');
        return `- Order ID=${o.id} at ${tableName}:\n${itemsStr}`;
      })
      .join('\n');

    const userLang = user.language || 'es';

    const systemPrompt = `
You are the Coaster Voice Assistant, a professional real-time management system for bars and restaurants.
Current Bar ID: "${barId}".
Current User: "${user.name}" (ID: "${user.id}"), Role: "${isAdmin ? 'ADMIN' : userBarRole}".

Below is the list of products available in this bar (with their UUIDs and prices):
${productsList || '(None)'}

Below is the list of tables available (with their UUIDs and statuses):
${tablesList || '(None)'}

Below is the list of active open orders (with their UUIDs and corresponding item IDs):
${ordersList || '(None)'}

Your objective is to process the user's input/request and perform the appropriate action using the provided tools.
If the user requests an action, select the correct tool and execute it.
If the action requires specific permissions, the tool will automatically check them. If the user lacks permissions, you will receive an error message which you should politely report to the user.
Once the action is successfully executed, confirm what you have done in detail.

Important: Always respond to the user in their preferred language. Currently, the user's language is: "${userLang}" (e.g. "es" for Spanish, "en" for English). Return your final response in this language.
    `.trim();

    const runAction = async (perm: BarPermission, action: () => Promise<any>) => {
      if (!isAdmin && (!userBarRole || !hasPermission(userBarRole, perm))) {
        return `Error: You do not have permission to perform this action (requires '${perm}').`;
      }
      try {
        const result = await action();
        return `Success: Action completed.${result ? ` Details: ${JSON.stringify(result)}` : ''}`;
      } catch (error: any) {
        return `Error: ${error.message || error}`;
      }
    };

    const result = await generateText({
      model: this.#model,
      providerOptions: {
        gateway: {
          models: this.#backupModels as unknown as [],
        },
      },
      system: systemPrompt,
      prompt,
      stopWhen: stepCountIs(5),
      tools: {
        createTable: tool({
          description: 'Create a new table in the bar.',
          inputSchema: z.object({
            name: z.string().describe("Table name, e.g. 'Table 5', 'Terrace 2'"),
          }),
          execute: async ({ name }) => {
            return runAction('bar:create-table', () =>
              this._commandBus.execute<CreateTableCommand, void>(new CreateTableCommand(barId, { name })),
            );
          },
        }),
        createOrder: tool({
          description: 'Create a new open order for a specific table in the bar.',
          inputSchema: z.object({
            tableId: z.string().describe('UUID of the table where the order is placed.'),
            items: z
              .array(
                z.object({
                  productId: z.string().describe('UUID of the product.'),
                  quantity: z.number().int().min(1).describe('Quantity of the product.'),
                }),
              )
              .describe('List of products and quantities.'),
          }),
          execute: async ({ tableId, items }) => {
            return runAction('bar:create-order', () =>
              this._commandBus.execute<CreateOrderCommand, void>(
                new CreateOrderCommand(barId, {
                  tableId: tableId ? asTableId(tableId) : undefined,
                  items: items.map((i) => ({ productId: asProductId(i.productId), quantity: i.quantity })),
                }),
              ),
            );
          },
        }),
        addOrderItems: tool({
          description: 'Add more items to an existing open order.',
          inputSchema: z.object({
            orderId: z.string().describe('UUID of the current open order.'),
            items: z
              .array(
                z.object({
                  productId: z.string().describe('UUID of the product.'),
                  quantity: z.number().int().min(1).describe('Additional quantity of the product.'),
                }),
              )
              .describe('List of products and quantities.'),
          }),
          execute: async ({ orderId, items }) => {
            return runAction('bar:update-order', () =>
              this._commandBus.execute<AddOrderItemsCommand, void>(
                new AddOrderItemsCommand(barId, asOrderId(orderId), {
                  items: items.map((i) => ({ productId: asProductId(i.productId), quantity: i.quantity })),
                }),
              ),
            );
          },
        }),
        checkoutOrder: tool({
          description: 'Collect payment and close an open order.',
          inputSchema: z.object({
            orderId: z.string().describe('UUID of the order to check out.'),
            paymentMethod: z.enum(['CASH', 'CARD']).describe('Payment method: CASH or CARD.'),
          }),
          execute: async ({ orderId, paymentMethod }) => {
            return runAction('bar:checkout-order', () =>
              this._commandBus.execute<CheckoutOrderCommand, void>(
                new CheckoutOrderCommand(barId, asOrderId(orderId), paymentMethod),
              ),
            );
          },
        }),
        serveOrPayItems: tool({
          description: 'Update the preparation (served) or payment status of items in an open order.',
          inputSchema: z.object({
            orderId: z.string().describe('UUID of the order.'),
            items: z
              .array(
                z.object({
                  itemId: z.string().describe('UUID of the item in the order (OrderItemId).'),
                  servedQuantity: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe('New total quantity of prepared/served units.'),
                  paidQuantity: z.number().int().min(0).optional().describe('New total quantity of paid units.'),
                  paymentMethod: z
                    .enum(['CASH', 'CARD', 'NONE'])
                    .optional()
                    .describe('Payment method if registering payment.'),
                }),
              )
              .describe('List of items to update.'),
          }),
          execute: async ({ orderId, items }) => {
            return runAction('bar:update-order', () =>
              this._commandBus.execute<BulkUpdateOrderCommand, void>(
                new BulkUpdateOrderCommand(barId, asOrderId(orderId), {
                  items: items.map((i) => ({
                    itemId: asOrderItemId(i.itemId),
                    servedQuantity: i.servedQuantity,
                    paidQuantity: i.paidQuantity,
                    paymentMethod: i.paymentMethod,
                  })),
                }),
              ),
            );
          },
        }),
        cancelOrder: tool({
          description: 'Cancel an open order.',
          inputSchema: z.object({
            orderId: z.string().describe('UUID of the order to cancel.'),
          }),
          execute: async ({ orderId }) => {
            return runAction('bar:cancel-order', () =>
              this._commandBus.execute<CancelOrderCommand, void>(new CancelOrderCommand(barId, asOrderId(orderId))),
            );
          },
        }),
      },
    });

    return { text: result.text };
  }
}
