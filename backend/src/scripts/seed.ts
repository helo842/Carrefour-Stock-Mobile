/**
 * Seeds a development Firestore project with demo products, stock and views.
 * Usage: npm run seed
 *
 * NEVER run against production: it overwrites stock quantities for the demo
 * barcodes below.
 */
import { loadConfig } from '../config/env.js';
import { initFirebase } from '../config/firebase.js';
import { nowIso } from '../core/date.js';
import { deleteApp } from 'firebase-admin/app';
import { FieldValue } from 'firebase-admin/firestore';

interface SeedProduct {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  quantityLabel: string;
  quantity: number;
  views: number;
}

const PRODUCTS: SeedProduct[] = [
  {
    barcode: '3560070976453',
    name: 'Leche entera Carrefour',
    brand: 'Carrefour',
    category: 'Lácteos',
    quantityLabel: '1 L',
    quantity: 48,
    views: 231,
  },
  {
    barcode: '3560071001239',
    name: 'Pan de molde integral Carrefour',
    brand: 'Carrefour',
    category: 'Panadería',
    quantityLabel: '450 g',
    quantity: 12,
    views: 187,
  },
  {
    barcode: '3560070462321',
    name: 'Aceite de oliva virgen extra Carrefour',
    brand: 'Carrefour',
    category: 'Aceites',
    quantityLabel: '1 L',
    quantity: 7,
    views: 156,
  },
  {
    barcode: '3276550013008',
    name: 'Agua mineral Evian',
    brand: 'Evian',
    category: 'Bebidas',
    quantityLabel: '1,5 L',
    quantity: 96,
    views: 143,
  },
  {
    barcode: '3017620422003',
    name: 'Crema de cacao Nutella',
    brand: 'Ferrero',
    category: 'Desayuno',
    quantityLabel: '400 g',
    quantity: 3,
    views: 132,
  },
  {
    barcode: '3229820129488',
    name: 'Yogur natural Bjorg',
    brand: 'Bjorg',
    category: 'Lácteos',
    quantityLabel: '4 x 125 g',
    quantity: 0,
    views: 98,
  },
  {
    barcode: '3168930010265',
    name: 'Pasta fusilli Barilla',
    brand: 'Barilla',
    category: 'Pasta',
    quantityLabel: '500 g',
    quantity: 25,
    views: 87,
  },
  {
    barcode: '8410015100017',
    name: 'Arroz redondo SOS',
    brand: 'SOS',
    category: 'Arroz',
    quantityLabel: '1 kg',
    quantity: 8,
    views: 64,
  },
];

async function main(): Promise<void> {
  const config = loadConfig();

  if (config.nodeEnv === 'production') {
    throw new Error('El seed está deshabilitado en producción.');
  }

  const { db, app } = initFirebase(config);

  for (const product of PRODUCTS) {
    await db.collection('products').doc(product.barcode).set(
      {
        barcode: product.barcode,
        name: product.name,
        nameLower: product.name.toLowerCase(),
        imageUrl: null,
        brand: product.brand,
        category: product.category,
        quantityLabel: product.quantityLabel,
        source: 'seed',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await db.collection('stock').doc(product.barcode).set(
      {
        barcode: product.barcode,
        quantity: product.quantity,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await db.collection('statistics').doc(product.barcode).set(
      { barcode: product.barcode, views: product.views },
      { merge: true },
    );
  }

  console.log(
    `Seed completado (${PRODUCTS.length} productos) a las ${nowIso()}.`,
  );

  await deleteApp(app);
}

main().catch((error: unknown) => {
  console.error('Seed falló:', error);
  process.exit(1);
});
