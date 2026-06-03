import fs from 'fs';
import path from 'path';

const srcDir = '/home/miguel/dev/coaster/apps/api/src';

const propMap = {
  user: 'dbUser',
  bar: 'dbBar',
  barMember: 'dbBarMember',
  shift: 'dbShift',
  shiftExchange: 'dbShiftExchange',
  category: 'dbCategory',
  product: 'dbProduct',
  categoryTemplate: 'dbCategoryTemplate',
  productTemplate: 'dbProductTemplate',
  table: 'dbTable',
  order: 'dbOrder',
  orderItem: 'dbOrderItem'
};

const typeMap = {
  User: 'DbUser',
  Bar: 'DbBar',
  BarMember: 'DbBarMember',
  Shift: 'DbShift',
  ShiftExchange: 'DbShiftExchange',
  Category: 'DbCategory',
  Product: 'DbProduct',
  CategoryTemplate: 'DbCategoryTemplate',
  ProductTemplate: 'DbProductTemplate',
  Table: 'DbTable',
  Order: 'DbOrder',
  OrderItem: 'DbOrderItem',
  Role: 'DbRole',
  BarRole: 'DbBarRole'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Replace _prisma.xxx, prisma.xxx and tx.xxx
  content = content.replace(/\b(_?prisma|tx)\.([a-zA-Z]+)\b/g, (match, p1, p2) => {
    if (propMap[p2]) {
      return `${p1}.${propMap[p2]}`;
    }
    return match;
  });

  // 2. Replace Prisma.XxxCreateInput, etc.
  content = content.replace(/\bPrisma\.([a-zA-Z]+)(CreateInput|UpdateInput|WhereInput|WhereUniqueInput|Select|Include|CreateManyInput|UpdateManyMutationInput)\b/g, (match, p1, p2) => {
    if (typeMap[p1]) {
      return `Prisma.${typeMap[p1]}${p2}`;
    }
    return match;
  });

  // 3. Replace imports from core index
  // e.g. import { User, Role } from '../../core';
  content = content.replace(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*core)['"]/g, (match, p1, p2) => {
    let imports = p1;
    // Replace each of the type names inside the import brackets if it matches exactly
    for (const key of Object.keys(typeMap)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      imports = imports.replace(regex, typeMap[key]);
    }
    return `import {${imports}} from '${p2}'`;
  });

  // 4. Line-by-line replacement for Role -> DbRole and BarRole -> DbBarRole (except in imports from common)
  const lines = content.split('\n');
  const processedLines = lines.map(line => {
    if (line.includes("from '@coaster/common'") || line.includes('from "@coaster/common"')) {
      return line;
    }
    // Replace Role with DbRole and BarRole with DbBarRole
    let newline = line;
    newline = newline.replace(/\bBarRole\b/g, 'DbBarRole');
    newline = newline.replace(/\bRole\b/g, 'DbRole');
    return newline;
  });
  content = processedLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${path.relative(srcDir, filePath)}`);
  }
}

walk(srcDir);
console.log('Migration completed.');
