const fs = require('fs');

const files = [
  "apps/web/src/app/core/guards/permission.guard.spec.ts",
  "apps/web/src/app/core/guards/permission.guard.ts",
  "apps/web/src/app/exchanges/store/exchanges.store.spec.ts",
  "apps/web/src/app/presentation/admin/pages/admin-dashboard/admin-dashboard.ts",
  "apps/web/src/app/presentation/bars/pages/create-bar/components/create-bar-form.spec.ts",
  "apps/web/src/app/presentation/bars/pages/create-bar/components/create-bar-form.ts",
  "apps/web/src/app/presentation/bars/pages/create-bar/create-bar.spec.ts",
  "apps/web/src/app/presentation/bars/pages/select-bar/select-bar.spec.ts",
  "apps/web/src/app/presentation/bars/pages/select-bar/select-bar.ts",
  "apps/web/src/app/presentation/bars/workspace/components/bottom-nav/bottom-nav.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/components/bottom-nav/bottom-nav.ts",
  "apps/web/src/app/presentation/bars/workspace/components/top-app-bar/top-app-bar.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/components/top-app-bar/top-app-bar.ts",
  "apps/web/src/app/presentation/bars/workspace/layouts/workspace-layout.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/layouts/workspace-layout.ts",
  "apps/web/src/app/presentation/bars/workspace/orders/pages/history/history.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/orders/pages/history/history.ts",
  "apps/web/src/app/presentation/bars/workspace/orders/pages/tables/tables.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/orders/pages/tables/tables.ts",
  "apps/web/src/app/presentation/bars/workspace/pages/pantry/pantry.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/pages/pantry/pantry.ts",
  "apps/web/src/app/presentation/bars/workspace/pages/roster/roster.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/pages/roster/roster.ts",
  "apps/web/src/app/presentation/bars/workspace/pages/staff/staff.spec.ts",
  "apps/web/src/app/presentation/bars/workspace/pages/staff/staff.ts",
  "apps/web/src/app/products/services/bar-products.spec.ts",
  "apps/web/src/app/shifts/services/bar-shifts.spec.ts"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Uses heuristics
  const usesList = content.includes('.list') || content.includes('.create(') || content.includes('.reloadMyBars(') || file.includes('create-bar');
  const usesCurrent = content.includes('.current') || content.includes('.currentId') || content.includes('.setBarId(') || content.includes('.reloadCurrentBar(') || file.includes('select-bar') || file.includes('workspace');
  const usesSubscription = content.includes('.subscription') || content.includes('.createCheckoutSession') || content.includes('.createCustomerPortalSession');
  const usesMember = content.includes('.myMember') || content.includes('.hasPermission') || content.includes('.isOwner') || content.includes('permission.guard');

  let imports = [];
  if (usesList) imports.push('BarListStore');
  if (usesCurrent) imports.push('CurrentBarStore');
  if (usesMember) imports.push('MyMemberStore');
  if (usesSubscription) imports.push('BarSubscriptionStore');

  if (imports.length === 0) continue;

  const importMatch = content.match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+'@coaster\/bars';/);
  if (importMatch) {
    let importedItems = importMatch[1].split(',').map(s => s.trim()).filter(s => s !== 'BarsStore');
    importedItems.push(...imports);
    importedItems = [...new Set(importedItems)];
    content = content.replace(importMatch[0], `import { ${importedItems.join(', ')} } from '@coaster/bars';`);
  } else {
    continue;
  }

  // Find injects
  const injectRegex = /(?:private |readonly )?(#?[a-zA-Z0-9_]+(?:Store|store|Mock)?)\s*(?::\s*BarsStore\s*)?=\s*inject\(BarsStore\);/g;
  let match;
  let propNames = [];
  while ((match = injectRegex.exec(content)) !== null) {
    propNames.push(match[1]);
    let replacement = [];
    if (usesList) replacement.push(`readonly #barListStore = inject(BarListStore);`);
    if (usesCurrent) replacement.push(`readonly #currentBarStore = inject(CurrentBarStore);`);
    if (usesMember) replacement.push(`readonly #myMemberStore = inject(MyMemberStore);`);
    if (usesSubscription) replacement.push(`readonly #barSubscriptionStore = inject(BarSubscriptionStore);`);
    content = content.replace(match[0], replacement.join('\n  '));
  }
  
  // also handle "store = inject(BarsStore)"
  const simpleInject = /store\s*=\s*inject\(BarsStore\);/g;
  if(content.match(simpleInject)) {
      propNames.push('store');
      let replacement = [];
      if (usesList) replacement.push(`barListStore = inject(BarListStore);`);
      if (usesCurrent) replacement.push(`currentBarStore = inject(CurrentBarStore);`);
      if (usesMember) replacement.push(`myMemberStore = inject(MyMemberStore);`);
      if (usesSubscription) replacement.push(`barSubscriptionStore = inject(BarSubscriptionStore);`);
      content = content.replace(simpleInject, replacement.join('\n  '));
  }

  // Handle Spec Mocks Providers
  if (file.endsWith('.spec.ts')) {
     content = content.replace(/\{ provide: BarsStore, useValue: barsStoreMock \},?/g, '');
  }

  for (const prop of propNames) {
      if (usesList) {
          content = content.replace(new RegExp(`this\.${prop}\.list`, 'g'), `this.#barListStore.list`);
          content = content.replace(new RegExp(`this\.${prop}\.create\\(`, 'g'), `this.#barListStore.create(`);
          content = content.replace(new RegExp(`this\.${prop}\.reloadMyBars\\(`, 'g'), `this.#barListStore.reloadMyBars(`);
          content = content.replace(new RegExp(`${prop}\.list`, 'g'), `barListStore.list`); 
          content = content.replace(new RegExp(`${prop}\.create\\(`, 'g'), `barListStore.create(`); 
      }
      if (usesCurrent) {
          content = content.replace(new RegExp(`this\.${prop}\.currentId`, 'g'), `this.#currentBarStore.currentId`);
          content = content.replace(new RegExp(`this\.${prop}\.current`, 'g'), `this.#currentBarStore.current`);
          content = content.replace(new RegExp(`this\.${prop}\.setBarId\\(`, 'g'), `this.#currentBarStore.setBarId(`);
          content = content.replace(new RegExp(`this\.${prop}\.reloadCurrentBar\\(`, 'g'), `this.#currentBarStore.reloadCurrentBar(`);
          
          content = content.replace(new RegExp(`${prop}\.currentId`, 'g'), `currentBarStore.currentId`);
          content = content.replace(new RegExp(`${prop}\.current`, 'g'), `currentBarStore.current`);
          content = content.replace(new RegExp(`${prop}\.setBarId\\(`, 'g'), `currentBarStore.setBarId(`);
      }
      if (usesSubscription) {
          content = content.replace(new RegExp(`this\.${prop}\.subscription`, 'g'), `this.#barSubscriptionStore.subscription`);
          content = content.replace(new RegExp(`this\.${prop}\.createCheckoutSession\\(`, 'g'), `this.#barSubscriptionStore.createCheckoutSession(`);
          content = content.replace(new RegExp(`this\.${prop}\.createCustomerPortalSession\\(`, 'g'), `this.#barSubscriptionStore.createCustomerPortalSession(`);
          
          content = content.replace(new RegExp(`${prop}\.subscription`, 'g'), `barSubscriptionStore.subscription`);
      }
      if (usesMember) {
          content = content.replace(new RegExp(`this\.${prop}\.myMember`, 'g'), `this.#myMemberStore.myMember`);
          content = content.replace(new RegExp(`this\.${prop}\.hasPermission\\(`, 'g'), `this.#myMemberStore.hasPermission(`);
          content = content.replace(new RegExp(`this\.${prop}\.isOwner`, 'g'), `this.#myMemberStore.isOwner`);
          
          content = content.replace(new RegExp(`${prop}\.myMember`, 'g'), `myMemberStore.myMember`);
          content = content.replace(new RegExp(`${prop}\.hasPermission\\(`, 'g'), `myMemberStore.hasPermission(`);
          content = content.replace(new RegExp(`${prop}\.isOwner`, 'g'), `myMemberStore.isOwner`);
      }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
