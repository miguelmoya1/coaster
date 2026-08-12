import { GetCategoriesQuery } from '@coaster/categories';
import type { AiResponse, Category, EstablishmentId, Order, Product, Table } from '@coaster/common';
import {
  asEstablishmentRole,
  EstablishmentModule,
  EstablishmentRole,
  ErrorCodes,
  getRolePermissions,
  OrderStatus,
} from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { DbEstablishmentRole, DbRole } from '@coaster/core/db';
import { GetOrdersByEstablishmentIdQuery } from '@coaster/orders';
import { GetProductsByEstablishmentIdQuery } from '@coaster/products';
import { GetTablesByEstablishmentIdQuery } from '@coaster/tables';
import { ForbiddenException, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { generateText, LanguageModel, stepCountIs, streamText } from 'ai';
import { ConfigService } from '@nestjs/config';
import { AiUsageRepository } from '../../data-access/ai-usage.repository';
import { DEFAULT_MONTHLY_AI_MESSAGES, DEFAULT_TRIAL_AI_MESSAGES } from '../../domain/quota';
import { formatCategories, formatOrders, formatProducts, formatTables } from '../../domain/snapshot';
import { getAiTools } from '../../tools';
import { ExecuteAiCommand } from '../impl/execute-ai.command';

const MAX_HISTORY_MESSAGES = 10;

const MAX_TOOL_STEPS = 8;

@CommandHandler(ExecuteAiCommand)
export class ExecuteAiHandler implements ICommandHandler<ExecuteAiCommand, AiResponse> {
  readonly #logger = new Logger(ExecuteAiHandler.name);
  readonly #backupModels: LanguageModel[] = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'nvidia/nemotron-nano-9b-v2',
    'google/gemini-3.6-flash',
  ];
  readonly #model: LanguageModel = 'zai/glm-4.7';

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
    private readonly _securityRepository: SecurityRepository,
    private readonly _aiUsage: AiUsageRepository,
    private readonly _config: ConfigService,
  ) {}

  async execute(command: ExecuteAiCommand): Promise<AiResponse> {
    const { establishmentId, prompt, user, messages, onDelta } = command;
    this.#logger.debug(`Executing AI command for user ${user.id} in establishment ${establishmentId}`);

    const userRole = await this._securityRepository.getUserRole(user.id);
    const isAdmin = userRole === DbRole.ADMIN;

    let userEstablishmentRole: EstablishmentRole = DbEstablishmentRole.OWNER;
    if (!isAdmin) {
      const membership = await this._securityRepository.getEstablishmentMemberRole(user.id, establishmentId);

      if (!membership || !membership.active) {
        throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
      }

      userEstablishmentRole = asEstablishmentRole(membership.role);
    }

    const allowance = await this.#allowanceFor(establishmentId);
    const used = await this._aiUsage.messagesThisPeriod(establishmentId);

    if (used >= allowance) {
      this.#logger.warn(`Establishment ${establishmentId} has used ${used}/${allowance} assistant messages this month`);
      throw new ForbiddenException(ErrorCodes.AI_QUOTA_EXCEEDED);
    }

    const modules = await this._securityRepository.getEnabledModules(establishmentId);
    const hasOrders = modules.includes(EstablishmentModule.ORDERS);
    const hasInventory = modules.includes(EstablishmentModule.INVENTORY);

    const [tables, products, openOrders, categories] = await Promise.all([
      hasOrders
        ? this._queryBus.execute<GetTablesByEstablishmentIdQuery, Table[]>(
            new GetTablesByEstablishmentIdQuery(establishmentId),
          )
        : Promise.resolve<Table[]>([]),
      hasInventory
        ? this._queryBus.execute<GetProductsByEstablishmentIdQuery, Product[]>(
            new GetProductsByEstablishmentIdQuery(establishmentId),
          )
        : Promise.resolve<Product[]>([]),
      hasOrders
        ? this._queryBus.execute<GetOrdersByEstablishmentIdQuery, Order[]>(
            new GetOrdersByEstablishmentIdQuery(establishmentId, OrderStatus.OPEN),
          )
        : Promise.resolve<Order[]>([]),
      hasInventory
        ? this._queryBus.execute<GetCategoriesQuery, Category[]>(new GetCategoriesQuery(establishmentId))
        : Promise.resolve<Category[]>([]),
    ]);

    const userLang = user.language || 'es';
    const systemPrompt = this.#buildSystemPrompt({
      establishmentId,
      modules,
      user,
      isAdmin,
      userEstablishmentRole,
      userLang,
      tables,
      products,
      categories,
      openOrders,
    });

    const recentMessages = messages && messages.length > 0 ? messages.slice(-MAX_HISTORY_MESSAGES) : [];

    const coreMessages =
      recentMessages.length > 0
        ? recentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        : [{ role: 'user' as const, content: prompt }];

    try {
      const modelOptions = {
        model: this.#model,
        providerOptions: {
          gateway: {
            models: this.#backupModels as unknown as [],
          },
        },
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.1,
        stopWhen: stepCountIs(MAX_TOOL_STEPS),
        tools: getAiTools({
          establishmentId,
          modules,
          user,
          isAdmin,
          establishmentRole: userEstablishmentRole,
          commandBus: this._commandBus,
          queryBus: this._queryBus,
          products,
          categories,
          tables,
          openOrders,
        }),
      };

      if (onDelta) {
        this.#logger.debug(`[AI Gateway] Calling streamText with model="${this.#model}"`);
        const stream = streamText(modelOptions);

        let streamed = '';
        for await (const delta of stream.textStream) {
          streamed += delta;
          onDelta(delta);
        }

        const text = streamed.trim() || (await stream.text);
        await this._aiUsage.countMessage(establishmentId);

        return { text: text || this.#fallbackText(userLang) };
      }

      this.#logger.debug(`[AI Gateway] Calling generateText with model="${this.#model}"`);
      const result = await generateText(modelOptions);

      this.#logger.debug(`[AI Gateway] Success: generateText output text="${result.text}"`);
      await this._aiUsage.countMessage(establishmentId);

      return { text: result.text || this.#fallbackText(userLang) };
    } catch (error: any) {
      this.#logger.error(`[AI Gateway] Error: AI generation failed: ${error.message || error}`, error.stack);
      return {
        text: 'ai_voice.errors.ai_gateway_failed',
        isError: true,
        errorKey: 'ai_voice.errors.ai_gateway_failed',
      };
    }
  }

  async #allowanceFor(establishmentId: EstablishmentId): Promise<number> {
    const onTrial = await this._securityRepository.isOnTrial(establishmentId);

    return onTrial
      ? Number(this._config.get('AI_TRIAL_MONTHLY_MESSAGES') ?? DEFAULT_TRIAL_AI_MESSAGES)
      : Number(this._config.get('AI_MONTHLY_MESSAGES') ?? DEFAULT_MONTHLY_AI_MESSAGES);
  }

  #fallbackText(userLang: string): string {
    return userLang === 'es' ? 'Acción completada con éxito.' : 'Action completed successfully.';
  }

  #buildSystemPrompt(input: {
    establishmentId: string;
    modules: EstablishmentModule[];
    user: { id: string; name: string };
    isAdmin: boolean;
    userEstablishmentRole: EstablishmentRole;
    userLang: string;
    tables: Table[];
    products: Product[];
    categories: Category[];
    openOrders: Order[];
  }): string {
    const {
      establishmentId,
      modules,
      user,
      isAdmin,
      userEstablishmentRole,
      userLang,
      tables,
      products,
      categories,
      openOrders,
    } = input;

    const catalogue = formatProducts(products);
    const tablesList = formatTables(tables);
    const categoriesList = formatCategories(categories);
    const ordersList = formatOrders(openOrders, tables);

    const permissionsList = isAdmin
      ? '(ADMIN: every permission)'
      : getRolePermissions(userEstablishmentRole)
          .map((permission) => `- ${permission}`)
          .join('\n');

    return `
You are the Coaster Voice Assistant, a professional real-time management system for establishments and restaurants.
Current Establishment ID: "${establishmentId}".
Current User: "${user.name}" (ID: "${user.id}"), Role: "${isAdmin ? 'ADMIN' : userEstablishmentRole}".
Current date and time (UTC): ${new Date().toISOString()}.

=== AVAILABLE DATA ===
${
  catalogue.omitted
    ? 'This establishment has too large a catalogue to list here. Call listProducts with a search term to find the ones you need, and never invent a product UUID.'
    : `Below is the list of products available in this establishment (with their UUIDs, prices, and current stock):\n${catalogue.list || '(None)'}`
}

Below is the list of tables available (with their UUIDs and statuses):
${tablesList || '(None)'}

Below is the list of categories available (with their UUIDs and icons):
${categoriesList || '(None)'}

Below are the open orders. Call getOrderDetails for the lines of one, which is where item IDs,
served and paid quantities live:
${ordersList || '(None)'}

This snapshot was taken when the conversation turn started. Anything beyond it (revenue, past days,
shifts, staff, stock alerts) must be fetched with a read tool instead of guessed.

=== MODULES THIS ESTABLISHMENT RUNS ===
${modules.join(', ')}
Only tools belonging to these modules exist in this conversation. If the user asks for something
from a module that is off, say it is not enabled here rather than reaching for a tool.

=== THIS USER'S PERMISSIONS ===
${permissionsList}
Tools outside this list will be rejected by the server. If the user asks for one of them, say plainly
that their role does not allow it instead of calling the tool.

=== BEHAVIOR RULES ===
1. [CRITICAL] It is strictly forbidden to respond with plain text if the user requests any action or command and you have all necessary information. You must invoke one of the available tools instead of replying with conversational text.
2. Carefully match the products, tables, or orders mentioned in the user's request with the UUIDs listed in the lists above:
   - For products: Match names like "cerveza", "café", "bocadillo" to their corresponding Product UUID in the available products list.
   - For tables: Match names like "Mesa 1", "Mesa 5", "Terraza" to their corresponding Table UUID in the available tables list.
   - For categories: Match names like "bebidas", "comidas", "postres" to their corresponding Category UUID in the available categories list.
   - For orders: Match the requested table name or table/order ID to find the correct active order UUID.
3. [READ BEFORE YOU ACT] When a question is about data not in the snapshot above, call the matching read tool first (getEstablishmentStats for takings, getOrdersByDate for past days, listShifts for the rota, listMembers for staff, listProducts with lowStockOnly for stock alerts) and answer from its result. Never invent figures.
4. [CHAINING] You may call several tools in a row within the same turn, for example listMembers to resolve a worker name into a UUID and then createShift. Do it silently and only report the final outcome.
5. [DESTRUCTIVE ACTIONS] Deleting, cancelling, removing staff and sending invitations are irreversible. Their tools take a "confirmed" flag: call them with confirmed=false first, read the confirmation request back to the user in their language, and only call again with confirmed=true after the user clearly agrees in a later message. Never set confirmed=true on the first attempt, and never assume consent from an ambiguous answer.
6. Money is always spoken and written in euros (e.g. 2,50 €), never in cents.
7. Tool results come back as JSON with a "status" field. On "denied" tell the user they lack permission. On "error" explain what failed in plain words. On "confirmation_required" ask the confirmation question. Never show raw JSON or UUIDs to the user; refer to things by their names.
7b. [FORMATTING] Your answer is rendered as markdown inside a narrow panel (about 26rem wide) and is also read out loud, so keep it short and scannable:
   - Default to one or two plain sentences. Only reach for structure when you are actually listing things.
   - Use "-" bullet lists for several items, one short line each. Put the name first, then the figure.
   - Use **bold** for the numbers that matter (amounts, quantities, product names being changed). Do not bold whole sentences.
   - Never use headings, tables, horizontal rules, code blocks or images: they look broken at this width.
   - No emoji unless the user uses them first.
8. Once the action is successfully executed, confirm what you have done in detail.
9. Important: Always respond to the user in their preferred language. Currently, the user's language is: "${userLang}" (e.g. "es" for Spanish, "en" for English). Return your final response in this language.
10. [CONTEXT & MULTI-TURN CHAT] Use the conversation history (previous messages) to resolve context, pronouns, and parameters (like product type, quantity, table, or order). Even if the user's latest message is just a simple response to your clarifying question (e.g., "una Heineken", "a la mesa tres", "dos", "sí"), you must combine it with the previous messages. If the combined intent describes a complete action/command, you must execute the corresponding tool immediately instead of asking more questions or responding with conversational text. Do not ask for information that the user has already provided in previous turns.
    If all required information to call a tool is present, DO NOT RESPOND WITH CONVERSATIONAL TEXT, JUST CALL THE TOOL. If information is missing, ask a brief clarifying question in the user's language.
`.trim();
  }
}
