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
export class ExecuteAiHandler implements ICommandHandler<
  ExecuteAiCommand,
  { text: string; isError?: boolean; errorKey?: string }
> {
  readonly #logger = new Logger(ExecuteAiHandler.name);
  readonly #backupModels: LanguageModel[] = [
    'nvidia/nemotron-3-nano-30b-a3b',
    'openai/gpt-5-nano',
    'nvidia/nemotron-nano-9b-v2',
    'google/gemini-2.5-flash-lite',
  ];
  readonly #model: LanguageModel = 'google/gemini-2.5-flash-lite';

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
    private readonly _securityRepository: SecurityRepository,
  ) {}

  async execute(command: ExecuteAiCommand): Promise<{ text: string; isError?: boolean; errorKey?: string }> {
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

=== AVAILABLE DATA ===
Below is the list of products available in this bar (with their UUIDs, prices, and current stock):
${productsList || '(None)'}

Below is the list of tables available (with their UUIDs and statuses):
${tablesList || '(None)'}

Below is the list of active open orders (with their UUIDs, table names, and corresponding item IDs):
${ordersList || '(None)'}

=== BEHAVIOR RULES ===
1. [CRITICAL] Está estrictamente prohibido responder con texto si el usuario pide una acción o comando. Debes usar una de las funciones disponibles obligatoriamente.
   It is strictly forbidden to respond with plain text if the user requests any action or command. You must invoke one of the available tools instead of replying with conversational text.
2. Carefully match the products, tables, or orders mentioned in the user's request with the UUIDs listed in the lists above:
   - For products: Match names like "cerveza", "café", "bocadillo" to their corresponding Product UUID in the available products list.
   - For tables: Match names like "Mesa 1", "Mesa 5", "Terraza" to their corresponding Table UUID in the available tables list.
   - For orders: Match the requested table name or table/order ID to find the correct active order UUID.
3. If the action requires specific permissions, the tool will check them. If the user lacks permissions, report the error message back to the user.
4. Once the action is successfully executed, confirm what you have done in detail.
5. Important: Always respond to the user in their preferred language. Currently, the user's language is: "${userLang}" (e.g. "es" for Spanish, "en" for English). Return your final response in this language.
    `.trim();

    const runAction = async (perm: BarPermission, action: () => Promise<any>) => {
      if (!isAdmin && (!userBarRole || !hasPermission(userBarRole, perm))) {
        this.#logger.warn(`User ${user.id} denied permission "${perm}" in bar "${barId}"`);
        return `Error: You do not have permission to perform this action (requires '${perm}').`;
      }
      try {
        this.#logger.debug(`[AI Tool Action] Running command for permission "${perm}"...`);
        const result = await action();
        this.#logger.debug(
          `[AI Tool Action] Success: Command for permission "${perm}" completed. Result: ${JSON.stringify(result)}`,
        );
        return `Success: Action completed.${result ? ` Details: ${JSON.stringify(result)}` : ''}`;
      } catch (error: any) {
        this.#logger.error(
          `[AI Tool Action] Error: Command for permission "${perm}" failed: ${error.message || error}`,
          error.stack,
        );
        return `Error: ${error.message || error}`;
      }
    };

    try {
      this.#logger.debug(`[AI Gateway] Calling generateText with model="${this.#model}"`);
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
        toolChoice: 'required', // force model to use tools
        temperature: 0, // deterministic (do not think, just execute)
        tools: {
          createTable: tool({
            description: 'Create a new table in the bar.',
            inputSchema: z.object({
              name: z.string().describe("Table name or designation to create, e.g. 'Mesa 4', 'Terraza 1'. Use the exact name mentioned by the user."),
            }),
            execute: async ({ name }) => {
              this.#logger.debug(`[AI Tool] 'createTable' called with name="${name}"`);
              return runAction('bar:create-table', () =>
                this._commandBus.execute<CreateTableCommand, void>(new CreateTableCommand(barId, { name })),
              );
            },
          }),
          createOrder: tool({
            description: 'Create a new open order for a specific table in the bar.',
            inputSchema: z.object({
              tableId: z.string().describe('The UUID of the table where this new order is placed. Look up the user-specified table name (e.g. "Mesa 2") in the list of available tables to find its UUID.'),
              items: z
                .array(
                  z.object({
                    productId: z.string().describe('The UUID of the product. Match the food/drink name requested (e.g. "cerveza", "café", "bocadillo") against the available products list to get its UUID.'),
                    quantity: z.number().int().min(1).describe('The quantity of the item. Match natural numbers or word numbers, e.g. "tres cañas" -> 3. Defaults to 1 if not specified.'),
                  }),
                )
                .describe('List of exact product UUIDs and their quantities.'),
            }),
            execute: async ({ tableId, items }) => {
              this.#logger.debug(
                `[AI Tool] 'createOrder' called with tableId="${tableId}", items=${JSON.stringify(items)}`,
              );
              const validItems = items.filter((item) => products.some((p) => p.id === item.productId));
              this.#logger.debug(`[AI Tool] Filtered valid items: ${JSON.stringify(validItems)}`);
              if (validItems.length === 0) {
                this.#logger.warn(`[AI Tool] No valid items found to create order.`);
                return `Error: Ninguno de los productos solicitados está disponible en el menú de este bar.`;
              }
              return runAction('bar:create-order', () =>
                this._commandBus.execute<CreateOrderCommand, void>(
                  new CreateOrderCommand(barId, {
                    tableId: tableId ? asTableId(tableId) : undefined,
                    items: validItems.map((i) => ({ productId: asProductId(i.productId), quantity: i.quantity })),
                  }),
                ),
              );
            },
          }),
          addOrderItems: tool({
            description: 'Add more items to an existing open order.',
            inputSchema: z.object({
              orderId: z.string().describe('The UUID of the existing open order to add items to. Look up the active open orders list to find the order UUID matching the requested table or order details.'),
              items: z
                .array(
                  z.object({
                    productId: z.string().describe('The UUID of the product. Match the food/drink name requested (e.g. "cerveza", "café", "bocadillo") against the available products list to get its UUID.'),
                    quantity: z.number().int().min(1).describe('The quantity of the item to add. Match natural numbers or word numbers, e.g. "tres cañas" -> 3. Defaults to 1 if not specified.'),
                  }),
                )
                .describe('List of product UUIDs and their quantities.'),
            }),
            execute: async ({ orderId, items }) => {
              this.#logger.debug(
                `[AI Tool] 'addOrderItems' called with orderId="${orderId}", items=${JSON.stringify(items)}`,
              );
              const validItems = items.filter((item) => products.some((p) => p.id === item.productId));
              this.#logger.debug(`[AI Tool] Filtered valid items: ${JSON.stringify(validItems)}`);
              if (validItems.length === 0) {
                this.#logger.warn(`[AI Tool] No valid items found to add to order.`);
                return `Error: Ninguno de los productos solicitados está disponible en el menú de este bar.`;
              }
              return runAction('bar:update-order', () =>
                this._commandBus.execute<AddOrderItemsCommand, void>(
                  new AddOrderItemsCommand(barId, asOrderId(orderId), {
                    items: validItems.map((i) => ({ productId: asProductId(i.productId), quantity: i.quantity })),
                  }),
                ),
              );
            },
          }),
          checkoutOrder: tool({
            description: 'Collect payment and close an open order.',
            inputSchema: z.object({
              orderId: z.string().describe('The UUID of the open order to check out. Look up the active open orders list to find the order UUID matching the table or order details.'),
              paymentMethod: z.enum(['CASH', 'CARD']).describe('Payment method: CASH (efectivo, caja) or CARD (tarjeta, datáfono). Defaults to CASH if not specified.'),
            }),
            execute: async ({ orderId, paymentMethod }) => {
              this.#logger.debug(
                `[AI Tool] 'checkoutOrder' called with orderId="${orderId}", paymentMethod="${paymentMethod}"`,
              );
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
              orderId: z.string().describe('The UUID of the order to update.'),
              items: z
                .array(
                  z.object({
                    itemId: z.string().describe('The UUID of the order item to update (OrderItemId). Find this item ID inside the items list of the specified order in the active open orders list.'),
                    servedQuantity: z
                      .number()
                      .int()
                      .min(0)
                      .optional()
                      .describe('The new total quantity of this item that has been prepared/served. Use this when the user says "saca X cañas" or "sirve la mesa".'),
                    paidQuantity: z.number().int().min(0).optional().describe('The new total quantity of this item that has been paid.'),
                    paymentMethod: z
                      .enum(['CASH', 'CARD', 'NONE'])
                      .optional()
                      .describe('Payment method used if paying.'),
                  }),
                )
                .describe('List of order items to update.'),
            }),
            execute: async ({ orderId, items }) => {
              this.#logger.debug(
                `[AI Tool] 'serveOrPayItems' called with orderId="${orderId}", items=${JSON.stringify(items)}`,
              );
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
              orderId: z.string().describe('The UUID of the order to cancel. Find the order UUID in the active open orders list.'),
            }),
            execute: async ({ orderId }) => {
              this.#logger.debug(`[AI Tool] 'cancelOrder' called with orderId="${orderId}"`);
              return runAction('bar:cancel-order', () =>
                this._commandBus.execute<CancelOrderCommand, void>(new CancelOrderCommand(barId, asOrderId(orderId))),
              );
            },
          }),
        },
      });

      this.#logger.debug(`[AI Gateway] Success: generateText output text="${result.text}"`);
      return { text: result.text };
    } catch (error: any) {
      this.#logger.error(`[AI Gateway] Error: AI generation failed: ${error.message || error}`, error.stack);
      return {
        text: 'ai_voice.errors.ai_gateway_failed',
        isError: true,
        errorKey: 'ai_voice.errors.ai_gateway_failed',
      };
    }
  }
}
