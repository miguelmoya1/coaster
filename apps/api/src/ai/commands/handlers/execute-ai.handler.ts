import type { Category, Order, Product, Table } from '@coaster/common';
import { BarPermission, BarRole, ErrorCodes, OrderStatus } from '@coaster/common';
import { ForbiddenException, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { generateText, LanguageModel } from 'ai';
import { GetCategoriesQuery } from '../../../categories/queries';
import { asBarRole, hasPermission, SecurityRepository } from '../../../core';
import { DbBarRole, DbRole } from '../../../core/db';
import { GetOrdersByBarIdQuery } from '../../../orders/queries';
import { GetProductsByBarIdQuery } from '../../../products/queries';
import { GetTablesByBarIdQuery } from '../../../tables/queries';
import { getAiTools } from '../../tools';
import { ExecuteAiCommand } from '../impl/execute-ai.command';

@CommandHandler(ExecuteAiCommand)
export class ExecuteAiHandler implements ICommandHandler<
  ExecuteAiCommand,
  { text: string; isError?: boolean; errorKey?: string }
> {
  readonly #logger = new Logger(ExecuteAiHandler.name);
  readonly #backupModels: LanguageModel[] = [
    'google/gemini-3.1-flash-lite',
    'google/gemini-3-flash',

    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',

    'openai/gpt-5-nano',

    'nvidia/nemotron-3-nano-30b-a3b',
    'nvidia/nemotron-nano-9b-v2',
  ];
  readonly #model: LanguageModel = 'google/gemini-3.5-flash';

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
    private readonly _securityRepository: SecurityRepository,
  ) {}

  async execute(command: ExecuteAiCommand): Promise<{ text: string; isError?: boolean; errorKey?: string }> {
    const { barId, prompt, user, messages } = command;
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
      new GetOrdersByBarIdQuery(barId, OrderStatus.OPEN),
    );
    const categories = await this._queryBus.execute<GetCategoriesQuery, Category[]>(new GetCategoriesQuery(barId));

    const productsList = products
      .map((p) => `- ${p.name}: ID=${p.id}, Price=${p.price / 100}€, Stock=${p.currentStock}`)
      .join('\n');

    const tablesList = tables.map((t) => `- ${t.name}: ID=${t.id}, Status=${t.status}`).join('\n');

    const categoriesList = categories.map((c) => `- ${c.name}: ID=${c.id}, Icon=${c.icon || '(None)'}`).join('\n');

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

Below is the list of categories available (with their UUIDs and icons):
${categoriesList || '(None)'}

Below is the list of active open orders (with their UUIDs, table names, and corresponding item IDs):
${ordersList || '(None)'}

=== BEHAVIOR RULES ===
1. [CRITICAL] It is strictly forbidden to respond with plain text if the user requests any action or command and you have all necessary information. You must invoke one of the available tools instead of replying with conversational text.
2. Carefully match the products, tables, or orders mentioned in the user's request with the UUIDs listed in the lists above:
   - For products: Match names like "cerveza", "café", "bocadillo" to their corresponding Product UUID in the available products list.
   - For tables: Match names like "Mesa 1", "Mesa 5", "Terraza" to their corresponding Table UUID in the available tables list.
   - For categories: Match names like "bebidas", "comidas", "postres" to their corresponding Category UUID in the available categories list.
   - For orders: Match the requested table name or table/order ID to find the correct active order UUID.
3. If the action requires specific permissions, the tool will check them. If the user lacks permissions, report the error message back to the user.
4. Once the action is successfully executed, confirm what you have done in detail.
5. Important: Always respond to the user in their preferred language. Currently, the user's language is: "${userLang}" (e.g. "es" for Spanish, "en" for English). Return your final response in this language.
6. [CONTEXT & MULTI-TURN CHAT] Use the conversation history (previous messages) to resolve context, pronouns, and parameters (like product type, quantity, table, or order). Even if the user's latest message is just a simple response to your clarifying question (e.g., "una Heineken", "a la mesa tres", "dos"), you must combine it with the previous messages. If the combined intent describes a complete action/command, you must execute the corresponding tool immediately instead of asking more questions or responding with conversational text. Do not ask for information that the user has already provided in previous turns.
   If all required information to call a tool is present, DO NOT RESPOND WITH CONVERSATIONAL TEXT, JUST CALL THE TOOL. If information is missing, ask a brief clarifying question in the user's language.
`.trim();

    const runAction = async (
      perm: BarPermission,
      action: () => Promise<any>,
    ): Promise<{ success: boolean; text: string; errorKey?: string }> => {
      if (!isAdmin && (!userBarRole || !hasPermission(userBarRole, perm))) {
        this.#logger.warn(`User ${user.id} denied permission "${perm}" in bar "${barId}"`);
        return {
          success: false,
          text: `Error: You do not have permission to perform this action (requires '${perm}').`,
          errorKey: 'ai_voice.errors.permission_denied',
        };
      }
      try {
        this.#logger.debug(`[AI Tool Action] Running command for permission "${perm}"...`);
        const result = await action();
        this.#logger.debug(
          `[AI Tool Action] Success: Command for permission "${perm}" completed. Result: ${JSON.stringify(result)}`,
        );
        return {
          success: true,
          text: `Success: Action completed.${result ? ` Details: ${JSON.stringify(result)}` : ''}`,
        };
      } catch (error: any) {
        this.#logger.error(
          `[AI Tool Action] Error: Command for permission "${perm}" failed: ${error.message || error}`,
          error.stack,
        );
        const errMsg = error.message || String(error);
        const errorKey = Object.values(ErrorCodes).some((v) => v === errMsg) ? errMsg : undefined;
        return {
          success: false,
          text: `Error: ${errMsg}`,
          errorKey,
        };
      }
    };

    const coreMessages =
      messages && messages.length > 0
        ? messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        : [{ role: 'user' as const, content: prompt }];

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
        messages: coreMessages,
        temperature: 0.1, // deterministic (do not think, just execute)
        tools: getAiTools({
          barId,
          products,
          categories,
        }),
      });

      let errorResult: { text: string; isError?: boolean; errorKey?: string } | null = null;

      // Execute prepared commands
      if (result.toolResults) {
        for (const toolResult of result.toolResults) {
          const actionDesc = toolResult.output as any;
          if (actionDesc && typeof actionDesc === 'object') {
            if (actionDesc.isError) {
              errorResult = {
                text: actionDesc.text || 'Error occurred in tool execution',
                isError: true,
                errorKey: actionDesc.errorKey,
              };
              break;
            }
            if ('command' in actionDesc && 'permission' in actionDesc) {
              const runResult = await runAction(actionDesc.permission as BarPermission, () =>
                this._commandBus.execute(actionDesc.command),
              );
              if (!runResult.success) {
                errorResult = {
                  text: runResult.text,
                  isError: true,
                  errorKey: runResult.errorKey,
                };
                break;
              }
            }
          }
        }
      }

      if (errorResult) {
        return errorResult;
      }

      this.#logger.debug(`[AI Gateway] Success: generateText output text="${result.text}"`);
      return {
        text: result.text || (userLang === 'es' ? 'Acción completada con éxito.' : 'Action completed successfully.'),
      };
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
