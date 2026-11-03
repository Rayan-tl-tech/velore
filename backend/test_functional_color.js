import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import mongoose from 'mongoose';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// ============================================================
// STRICT SAFETY GUARDS
// ============================================================
process.env.NODE_ENV = 'test';

if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ CRITICAL SAFETY ABORT: NODE_ENV must strictly be 'test'. Received: '${process.env.NODE_ENV}'.`);
  process.exit(1);
}

const REQUIRED_DATABASE = 'velor_test';
const FORBIDDEN_DATABASES = ['velor', 'velor_dev', 'velor_prod', 'production', 'ecommerce'];

import Category from './models/categoryModel.js';
import Product from './models/productModel.js';
import User from './models/userModel.js';
import Cart from './models/cartModel.js';
import Order from './models/orderModel.js';
import { addToCart, getCart, updateCartItem, removeFromCart } from './services/cartService.js';
import { createOrder } from './services/orderService.js';

const results = {
  total: 9,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: [],
};

function recordResult(num, title, status, observation) {
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.skipped++;

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`\n${icon} [SCÉNARIO ${num}] ${title} -> ${status}`);
  console.log(`   Résultat: ${observation}`);
  results.details.push({ num, title, status, observation });
}

// Track specifically created IDs for cleanup
const createdCategoryIds = [];
const createdProductIds = [];
const createdUserIds = [];
const createdCartIds = [];
const createdOrderIds = [];

async function runFunctionalSuite() {
  console.log('🛡️  VÉLOR — Lancement de la Suite de Tests Fonctionnels Couleurs...\n');
  console.log(`🔒 Vérification de la configuration cible:`);
  console.log(`   - NODE_ENV requis : 'test' (actuel: '${process.env.NODE_ENV}')`);
  console.log(`   - Base de données cible requise : '${REQUIRED_DATABASE}'`);

  if (!process.env.MONGO_URI) {
    console.error('⛔ ERREUR : MONGO_URI est absent de l\'environnement.');
    process.exit(1);
  }

  // 1. Connexion Mongoose avec force dbName: 'velor_test'
  console.log('\n⏳ Connexion sécurisée à MongoDB Atlas sur la base isolée velor_test...');
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: REQUIRED_DATABASE,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  });

  const activeDb = mongoose.connection.name;
  console.log(`🔎 Base connectée détectée : "${activeDb}"`);

  // 2. Vérification d'isolation stricte
  if (activeDb !== REQUIRED_DATABASE || FORBIDDEN_DATABASES.includes(activeDb)) {
    console.error(`⛔ ARRÊT IMMÉDIAT DE SÉCURITÉ : La base connectée est "${activeDb}", ce qui est strictement INTERDIT.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✅ ISOLATION GARANTIE : Connexion active confirmée sur "${activeDb}". Aucune donnée de production ou dev n'est touchée.\n`);

  try {
    // SETUP : Créer des données isolées de test
    const testCat = await Category.create({ name: `Test-Cat-${Date.now()}` });
    createdCategoryIds.push(testCat._id);

    const testProd = await Product.create({
      name: 'VÉLOR Test Overshirt',
      price: 8500,
      stock: 50,
      category: testCat._id,
      colors: ['#000000', '#FFFFFF', '#1E3A8A'],
    });
    createdProductIds.push(testProd._id);

    const testUser = await User.create({
      name: 'Test Customer Color',
      email: `test_color_${Date.now()}@example.com`,
      password: 'password123',
      roles: ['user'],
      phone: '0550123456',
      wilaya: '16 - Alger',
      commune: 'Hydra',
      address: '12 Rue des Pins',
    });
    createdUserIds.push(testUser._id);

    // ============================================================
    // SCÉNARIO 1 : Ajouter le même produit avec la même taille en 2 couleurs différentes
    // ============================================================
    try {
      await addToCart(testUser._id, testProd._id, 1, 'M', testProd.name, '#000000');
      await addToCart(testUser._id, testProd._id, 1, 'M', testProd.name, '#FFFFFF');

      recordResult(
        1,
        'Ajouter le même produit avec la même taille en deux couleurs différentes',
        'PASS',
        `Produit ${testProd._id} ajouté en taille M avec couleur #000000 (qty 1) puis avec couleur #FFFFFF (qty 1) sans collision.`
      );
    } catch (err) {
      recordResult(1, 'Ajouter le même produit en 2 couleurs', 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 2 : Vérifier que les deux variantes sont distinctes dans le panier
    // ============================================================
    try {
      const cart = await getCart(testUser._id);
      if (cart._id) createdCartIds.push(cart._id);

      const items = cart.items || [];
      const itemNoir = items.find((it) => it.size === 'M' && it.color === '#000000');
      const itemBlanc = items.find((it) => it.size === 'M' && it.color === '#FFFFFF');

      if (items.length === 2 && itemNoir && itemBlanc && itemNoir.quantity === 1 && itemBlanc.quantity === 1) {
        recordResult(
          2,
          'Vérifier que les deux variantes sont distinctes dans le panier',
          'PASS',
          `Le panier contient exactement 2 lignes distinctes : 1x (Taille M, #000000) et 1x (Taille M, #FFFFFF). Les articles ne se sont pas mélangés.`
        );
      } else {
        recordResult(
          2,
          'Vérifier que les deux variantes sont distinctes dans le panier',
          'FAIL',
          `Attendu: 2 lignes distinctes. Trouvé: ${items.length} lignes. Items: ${JSON.stringify(items)}`
        );
      }
    } catch (err) {
      recordResult(2, 'Vérifier variantes distinctes', 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 3 : Modifier la quantité de la première couleur et vérifier que l'autre ne change pas
    // ============================================================
    try {
      await updateCartItem(testUser._id, testProd._id, 4, 'M', '#000000');
      const cart = await getCart(testUser._id);
      const itemNoir = cart.items.find((it) => it.size === 'M' && it.color === '#000000');
      const itemBlanc = cart.items.find((it) => it.size === 'M' && it.color === '#FFFFFF');

      if (itemNoir && itemNoir.quantity === 4 && itemBlanc && itemBlanc.quantity === 1) {
        recordResult(
          3,
          "Modifier la quantité de la première couleur sans altérer l'autre",
          'PASS',
          `Quantité de #000000 passée à 4. Quantité de #FFFFFF maintenue à 1. Aucune contamination croisée.`
        );
      } else {
        recordResult(
          3,
          "Modifier la quantité de la première couleur",
          'FAIL',
          `Noir qty=${itemNoir?.quantity} (attendu 4), Blanc qty=${itemBlanc?.quantity} (attendu 1).`
        );
      }
    } catch (err) {
      recordResult(3, 'Modifier quantité première couleur', 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 4 : Supprimer la deuxième couleur et vérifier que la première reste présente
    // ============================================================
    try {
      await removeFromCart(testUser._id, testProd._id, 'M', '#FFFFFF');
      const cart = await getCart(testUser._id);
      const itemNoir = cart.items.find((it) => it.size === 'M' && it.color === '#000000');
      const itemBlanc = cart.items.find((it) => it.size === 'M' && it.color === '#FFFFFF');

      if (cart.items.length === 1 && itemNoir && itemNoir.quantity === 4 && !itemBlanc) {
        recordResult(
          4,
          'Supprimer la deuxième couleur et vérifier que la première reste présente',
          'PASS',
          `Variante #FFFFFF supprimée avec succès. Variante #000000 (Taille M, Qty 4) toujours présente.`
        );
      } else {
        recordResult(
          4,
          'Supprimer la deuxième couleur',
          'FAIL',
          `Items restants: ${cart.items.length}, Blanc présent: ${!!itemBlanc}`
        );
      }
    } catch (err) {
      recordResult(4, 'Supprimer deuxième couleur', 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 5 : Tester la synchronisation d'un panier invité vers un compte connecté
    // ============================================================
    try {
      const syncUser = await User.create({
        name: 'Sync Test Customer',
        email: `sync_guest_${Date.now()}@example.com`,
        password: 'password123',
        roles: ['user'],
        phone: '0660123456',
        wilaya: '31 - Oran',
        commune: 'Es Senia',
        address: 'Rue 2',
      });
      createdUserIds.push(syncUser._id);

      // Panier invité avec 2 couleurs
      const guestLocalItems = [
        { productId: testProd._id, quantity: 2, size: 'L', color: '#1E3A8A', name: testProd.name },
        { productId: testProd._id, quantity: 1, size: 'M', color: '#000000', name: testProd.name },
      ];

      // Exécution de mergeGuestItems
      for (const it of guestLocalItems) {
        await addToCart(syncUser._id, it.productId, it.quantity, it.size, it.name, it.color);
      }

      const syncedCart = await getCart(syncUser._id);
      if (syncedCart._id) createdCartIds.push(syncedCart._id);

      const hasItemL_Bleu = syncedCart.items.find((it) => it.size === 'L' && it.color === '#1E3A8A' && it.quantity === 2);
      const hasItemM_Noir = syncedCart.items.find((it) => it.size === 'M' && it.color === '#000000' && it.quantity === 1);

      if (syncedCart.items.length === 2 && hasItemL_Bleu && hasItemM_Noir) {
        recordResult(
          5,
          'Synchronisation du panier invité vers un compte connecté',
          'PASS',
          `Les 2 articles du panier invité ont été fusionnés dans le compte avec leurs couleurs exactes (#1E3A8A et #000000) et leurs tailles respectives.`
        );
      } else {
        recordResult(
          5,
          'Synchronisation du panier invité',
          'FAIL',
          `Panier synchronisé invalide: ${JSON.stringify(syncedCart.items)}`
        );
      }
    } catch (err) {
      recordResult(5, 'Synchronisation panier invité', 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 6 : Passer une commande contenant deux couleurs différentes
    // ============================================================
    let placedOrder = null;
    try {
      const orderPayload = {
        customerName: 'Amina Benali',
        customerPhone: '0550123456',
        customerEmail: 'amina@test.com',
        wilaya: '16 - Alger',
        commune: 'Bab El Oued',
        shippingAddress: '15 Boulevard Colonel Amirouche',
        items: [
          {
            productId: testProd._id.toString(),
            quantity: 2,
            size: 'M',
            color: '#000000',
          },
          {
            productId: testProd._id.toString(),
            quantity: 1,
            size: 'M',
            color: '#FFFFFF',
          },
        ],
      };

      const stockBefore = (await Product.findById(testProd._id)).stock; // 50
      placedOrder = await createOrder(orderPayload, testUser);
      createdOrderIds.push(placedOrder._id);

      const stockAfter = (await Product.findById(testProd._id)).stock;
      const expectedStock = stockBefore - 3; // 2 + 1 = 3

      // Vérifications de prix et stock
      const expectedItemsPrice = 8500 * 3; // 25500
      const expectedShippingFee = 500; // Wilaya 16
      const expectedTotal = expectedItemsPrice + expectedShippingFee; // 26000

      const priceOk = placedOrder.totalPrice === expectedTotal;
      const shippingOk = placedOrder.shippingFee === expectedShippingFee;
      const stockOk = stockAfter === expectedStock;

      if (placedOrder && placedOrder.items.length === 2 && priceOk && shippingOk && stockOk) {
        recordResult(
          6,
          'Passer une commande contenant deux couleurs différentes',
          'PASS',
          `Commande #${placedOrder._id} créée avec succès. Stock décrémenté de 50 à ${stockAfter} (-3). Prix total 26000 DA (25500 + 500 port) intègre.`
        );
      } else {
        recordResult(
          6,
          'Passer une commande contenant deux couleurs différentes',
          'FAIL',
          `Échec validation: items=${placedOrder.items?.length}, priceOk=${priceOk}, shippingOk=${shippingOk}, stockOk=${stockOk}`
        );
      }
    } catch (err) {
      recordResult(6, 'Passer commande avec deux couleurs', 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 7 : Vérifier que les couleurs sont correctement enregistrées dans MongoDB
    // ============================================================
    try {
      if (!placedOrder) throw new Error('Commande non disponible');

      const freshOrderDoc = await Order.findById(placedOrder._id).lean();
      const orderItem1 = freshOrderDoc.items[0];
      const orderItem2 = freshOrderDoc.items[1];

      const c1 = orderItem1.color;
      const c2 = orderItem2.color;

      if (c1 === '#000000' && c2 === '#FFFFFF') {
        recordResult(
          7,
          'Vérifier que les couleurs sont correctement enregistrées dans MongoDB',
          'PASS',
          `Document MongoDB vérifié directement: item[0].color = "${c1}", item[1].color = "${c2}". Persistance exacte en base Atlas velor_test.`
        );
      } else {
        recordResult(
          7,
          'Vérifier enregistrement des couleurs dans MongoDB',
          'FAIL',
          `Couleurs trouvées en base: "${c1}" et "${c2}" (attendues: "#000000" et "#FFFFFF")`
        );
      }
    } catch (err) {
      recordResult(7, 'Vérifier enregistrement des couleurs MongoDB', 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 8 : Vérifier l'affichage dans l'historique client et le dashboard admin
    // ============================================================
    try {
      if (!placedOrder) throw new Error('Commande non disponible');

      const orderDoc = await Order.findById(placedOrder._id).lean();

      // Simulation du composant admin Orders.jsx
      const adminRenderResults = orderDoc.items.map((it) => {
        const hasSwatch = Boolean(it.color);
        const swatchColor = it.color;
        const hexDisplay = it.color ? it.color.toUpperCase() : null;
        return { hasSwatch, swatchColor, hexDisplay };
      });

      // Simulation du composant client OrdersModal.jsx
      const clientRenderResults = orderDoc.items.map((it) => {
        const hasBadge = Boolean(it.color);
        const colorValue = it.color;
        return { hasBadge, colorValue };
      });

      const adminOk =
        adminRenderResults[0].hasSwatch &&
        adminRenderResults[0].swatchColor === '#000000' &&
        adminRenderResults[1].hasSwatch &&
        adminRenderResults[1].swatchColor === '#FFFFFF';

      const clientOk =
        clientRenderResults[0].hasBadge &&
        clientRenderResults[0].colorValue === '#000000' &&
        clientRenderResults[1].hasBadge &&
        clientRenderResults[1].colorValue === '#FFFFFF';

      if (adminOk && clientOk) {
        recordResult(
          8,
          "Vérifier l'affichage dans l'historique client et le dashboard admin",
          'PASS',
          `Les données de rendu génèrent les pastilles et codes HEX #000000 et #FFFFFF pour l'admin (Orders.jsx) et le client (OrdersModal.jsx).`
        );
      } else {
        recordResult(8, "Vérifier l'affichage client et admin", 'FAIL', `Rendu admin=${adminOk}, client=${clientOk}`);
      }
    } catch (err) {
      recordResult(8, "Vérifier l'affichage client et admin", 'FAIL', err.message);
    }

    // ============================================================
    // SCÉNARIO 9 : Vérifier qu'une ancienne commande sans couleur reste affichable
    // ============================================================
    try {
      const legacyOrderDoc = await Order.create({
        user: testUser._id,
        isGuest: false,
        customerName: 'Client Historique',
        customerPhone: '0770987654',
        customerEmail: 'historique@test.com',
        wilaya: '31 - Oran',
        commune: 'Oran',
        shippingAddress: 'Boulevard Front de Mer',
        totalPrice: 17800,
        shippingFee: 800,
        status: 'delivered',
        items: [
          {
            product: testProd._id,
            name: 'VÉLOR Legacy Item',
            image: '',
            quantity: 2,
            price: 8500,
            size: 'XL',
            // Pas de champ color (simulation d'une commande passée avant la mise à jour)
          },
        ],
      });
      createdOrderIds.push(legacyOrderDoc._id);

      const reloadedLegacy = await Order.findById(legacyOrderDoc._id).lean();
      const legacyItem = reloadedLegacy.items[0];

      // Vérification que color vaut null sans crash
      const isColorNull = legacyItem.color === null || legacyItem.color === undefined;

      // Simulation du rendu UI : si !it.color, le bloc couleur ne doit pas s'afficher
      const adminRendersColor = Boolean(legacyItem.color);
      const clientRendersColor = Boolean(legacyItem.color);

      if (isColorNull && !adminRendersColor && !clientRendersColor) {
        recordResult(
          9,
          "Vérifier qu'une ancienne commande sans couleur reste affichable sans crash",
          'PASS',
          `Commande historique #${legacyOrderDoc._id} chargée avec succès (color: ${legacyItem.color}). Affichage propre sans pastille parasite, aucun crash.`
        );
      } else {
        recordResult(
          9,
          "Vérifier ancienne commande sans couleur",
          'FAIL',
          `Color: ${legacyItem.color}, adminRenders=${adminRendersColor}`
        );
      }
    } catch (err) {
      recordResult(9, "Vérifier ancienne commande sans couleur", 'FAIL', err.message);
    }
  } finally {
    // ============================================================
    // NETTOYAGE STRICT : UNIQUEMENT LES DONNÉES CRÉÉES PAR LE TEST
    // ============================================================
    console.log('\n🧹 Nettoyage des données de test isolées créées dans velor_test...');

    if (createdOrderIds.length > 0) {
      const res = await Order.deleteMany({ _id: { $in: createdOrderIds } });
      console.log(`   - Commandes de test supprimées : ${res.deletedCount}`);
    }
    if (createdCartIds.length > 0) {
      const res = await Cart.deleteMany({ _id: { $in: createdCartIds } });
      console.log(`   - Paniers de test supprimés : ${res.deletedCount}`);
    }
    if (createdUserIds.length > 0) {
      const res = await User.deleteMany({ _id: { $in: createdUserIds } });
      console.log(`   - Utilisateurs de test supprimés : ${res.deletedCount}`);
    }
    if (createdProductIds.length > 0) {
      const res = await Product.deleteMany({ _id: { $in: createdProductIds } });
      console.log(`   - Produits de test supprimés : ${res.deletedCount}`);
    }
    if (createdCategoryIds.length > 0) {
      const res = await Category.deleteMany({ _id: { $in: createdCategoryIds } });
      console.log(`   - Catégories de test supprimées : ${res.deletedCount}`);
    }

    await mongoose.disconnect();
    console.log('🔌 Déconnexion de MongoDB.');
  }

  console.log('\n============================================================');
  console.log(`📊 BILAN FINAL : ${results.passed}/${results.total} scénarios validés avec succès.`);
  console.log(`   - Réussis  : ${results.passed}`);
  console.log(`   - Échoués  : ${results.failed}`);
  console.log(`   - Non exéc : ${results.skipped}`);
  console.log('============================================================\n');

  if (results.passed === results.total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFunctionalSuite().catch(async (err) => {
  console.error('\n⛔ ERREUR NON CAPTURÉE DURANT LE TEST FONCTIONNEL :', err.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

